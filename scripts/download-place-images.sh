#!/usr/bin/env bash
# ============================================================
# download-place-images.sh
# Downloads the entire place_images Supabase storage bucket
# to a local directory, with progress bar and ETA.
#
# Usage:
#   ./scripts/download-place-images.sh [output-dir] [concurrency]
#
# Examples:
#   ./scripts/download-place-images.sh
#   ./scripts/download-place-images.sh ./backup/place_images 12
#
# Dependencies: curl, jq  (both ship with macOS / brew-installable)
# ============================================================

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
PROJECT_URL="https://nwspdpjmonlambvrstww.supabase.co"
BUCKET="place_images"
OUTPUT_DIR="${1:-./place_images_backup}"
CONCURRENCY="${2:-8}"       # parallel curl workers
PAGE_SIZE=1000              # Supabase Storage max per list request

# Load anon key: prefer SUPABASE_ANON_KEY env var, then .env.local (legacy JWT key only),
# then hardcoded fallback. The new sb_publishable_* format does NOT work with Storage API.
if [[ -z "${SUPABASE_ANON_KEY:-}" ]]; then
  ENV_FILE="$(dirname "$0")/../.env.local"
  ANON_KEY=""
  if [[ -f "$ENV_FILE" ]]; then
    # Only use the value if it's a legacy JWT (starts with eyJ), not a publishable key
    _candidate=$(grep -E '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' "$ENV_FILE" | cut -d= -f2- | tr -d '"' | tr -d "'" | tr -d '[:space:]')
    if [[ "$_candidate" == eyJ* ]]; then
      ANON_KEY="$_candidate"
    fi
  fi
  # Fallback to the legacy JWT anon key for this project
  ANON_KEY="${ANON_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53c3BkcGptb25sYW1idnJzdHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMTk1OTYsImV4cCI6MjA4MzU5NTU5Nn0.ddz-mAY1A5ybm7YZGeZW9im4WsATFXsqMRDFoeiItG0}"
else
  ANON_KEY="$SUPABASE_ANON_KEY"
fi

BASE_URL="${PROJECT_URL}/storage/v1"
PUBLIC_URL="${BASE_URL}/object/public/${BUCKET}"
LIST_URL="${BASE_URL}/object/list/${BUCKET}"

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

# ── helpers ───────────────────────────────────────────────────────────────────
die()  { echo -e "${RED}ERROR:${RESET} $*" >&2; exit 1; }
info() { echo -e "${CYAN}→${RESET} $*"; }
ok()   { echo -e "${GREEN}✓${RESET} $*"; }

require() {
  for cmd in "$@"; do
    command -v "$cmd" &>/dev/null || die "'$cmd' is required but not found. Install via: brew install $cmd"
  done
}

human_bytes() {
  local bytes=$1
  if   (( bytes >= 1073741824 )); then printf "%.2f GB" "$(echo "scale=2; $bytes/1073741824" | bc)"
  elif (( bytes >= 1048576 ));    then printf "%.1f MB" "$(echo "scale=1; $bytes/1048576"    | bc)"
  elif (( bytes >= 1024 ));       then printf "%.0f KB" "$(echo "scale=0; $bytes/1024"       | bc)"
  else printf "%d B" "$bytes"; fi
}

human_duration() {
  local secs=$1
  local h=$(( secs / 3600 ))
  local m=$(( (secs % 3600) / 60 ))
  local s=$(( secs % 60 ))
  if   (( h > 0 )); then printf "%dh %02dm %02ds" $h $m $s
  elif (( m > 0 )); then printf "%dm %02ds" $m $s
  else printf "%ds" $s; fi
}

draw_bar() {
  local current=$1 total=$2 width=${3:-40}
  local pct=$(( current * 100 / (total > 0 ? total : 1) ))
  local filled=$(( current * width / (total > 0 ? total : 1) ))
  local empty=$(( width - filled ))
  local bar=""
  printf -v bar '%0.s█' $(seq 1 $filled)
  local spaces
  printf -v spaces '%0.s░' $(seq 1 $empty)
  printf "[${GREEN}%s${RESET}%s] %3d%%" "$bar" "$spaces" "$pct"
}

# ── preflight ─────────────────────────────────────────────────────────────────
require curl jq bc

mkdir -p "$OUTPUT_DIR"

TMPDIR_WORK=$(mktemp -d)
trap 'rm -rf "$TMPDIR_WORK"' EXIT

FILE_LIST="${TMPDIR_WORK}/files.txt"      # one filename per line
DONE_DIR="${TMPDIR_WORK}/done"            # sentinel files for completed downloads
FAIL_DIR="${TMPDIR_WORK}/fail"            # sentinel files for failed downloads
mkdir -p "$DONE_DIR" "$FAIL_DIR"

# ── 1. Enumerate all files ────────────────────────────────────────────────────
echo -e "\n${BOLD}Phase 1 — Listing files in '${BUCKET}' bucket${RESET}"

offset=0
total_listed=0

while true; do
  _body=$(jq -n \
    --argjson limit "$PAGE_SIZE" \
    --argjson offset "$offset" \
    '{"limit":$limit,"offset":$offset,"prefix":"","sortBy":{"column":"name","order":"asc"}}')

  response=$(curl -sf --show-error \
    -X POST "${LIST_URL}" \
    -H "Authorization: Bearer ${ANON_KEY}" \
    -H "Content-Type: application/json" \
    -d "$_body" \
  ) || die "Failed to list files at offset ${offset}"

  page_names=$(echo "$response" | jq -r '.[].name // empty')
  page_count=$(echo "$response" | jq 'length')

  if [[ $page_count -eq 0 ]]; then
    break
  fi

  echo "$page_names" >> "$FILE_LIST"
  total_listed=$(( total_listed + page_count ))
  offset=$(( offset + PAGE_SIZE ))

  printf "\r  Listed %d files…" "$total_listed"

  # If this page was smaller than PAGE_SIZE we've reached the end
  (( page_count < PAGE_SIZE )) && break
done

echo ""  # newline after \r updates

TOTAL_FILES=$(wc -l < "$FILE_LIST" | tr -d ' ')
[[ "$TOTAL_FILES" -eq 0 ]] && die "No files found in bucket '${BUCKET}'"
ok "Found ${TOTAL_FILES} files to download"

# Count already-present files (resume support)
already=0
while IFS= read -r fname; do
  [[ -f "${OUTPUT_DIR}/${fname}" ]] && already=$(( already + 1 ))
done < "$FILE_LIST"

if (( already > 0 )); then
  info "Skipping ${already} already-downloaded files (resume mode)"
fi

REMAINING=$(( TOTAL_FILES - already ))
if (( REMAINING == 0 )); then
  ok "All files already downloaded. Nothing to do."
  exit 0
fi

# ── 2. Download worker (called via xargs) ────────────────────────────────────
# Export everything the worker needs
export OUTPUT_DIR PUBLIC_URL ANON_KEY DONE_DIR FAIL_DIR

download_one() {
  local fname="$1"
  local dest="${OUTPUT_DIR}/${fname}"

  # Skip if already downloaded
  if [[ -f "$dest" ]] && [[ -s "$dest" ]]; then
    touch "${DONE_DIR}/${fname}.done"
    return 0
  fi

  local url="${PUBLIC_URL}/${fname}"
  local tmp="${dest}.tmp"

  if curl -sf --retry 3 --retry-delay 2 --max-time 60 \
       -o "$tmp" "$url" 2>/dev/null; then
    mv "$tmp" "$dest"
    touch "${DONE_DIR}/${fname}.done"
  else
    rm -f "$tmp"
    touch "${FAIL_DIR}/${fname}.fail"
  fi
}
export -f download_one

# ── 3. Progress monitor (background) ─────────────────────────────────────────
echo -e "\n${BOLD}Phase 2 — Downloading ${REMAINING} files  (${CONCURRENCY} parallel workers)${RESET}\n"

START_TS=$(date +%s)

monitor() {
  local total=$1 start_ts=$2
  while true; do
    local done_count fail_count elapsed now rate eta_secs
    done_count=$(ls -1 "$DONE_DIR" 2>/dev/null | wc -l | tr -d ' ')
    fail_count=$(ls -1 "$FAIL_DIR" 2>/dev/null | wc -l | tr -d ' ')
    now=$(date +%s)
    elapsed=$(( now - start_ts ))

    local downloaded_bytes=0
    if command -v du &>/dev/null; then
      downloaded_bytes=$(du -sb "$OUTPUT_DIR" 2>/dev/null | awk '{print $1}' || echo 0)
    fi

    rate=0
    eta_secs=0
    if (( elapsed > 0 && done_count > 0 )); then
      rate=$(echo "scale=2; $done_count / $elapsed" | bc)
      local remaining=$(( total - done_count ))
      eta_secs=$(echo "scale=0; $remaining / ($done_count / $elapsed)" | bc 2>/dev/null || echo 0)
    fi

    local bar
    bar=$(draw_bar "$done_count" "$total" 38)
    local eta_str
    eta_str=$(human_duration "$eta_secs")
    local elapsed_str
    elapsed_str=$(human_duration "$elapsed")
    local speed="${rate} files/s"
    local size_str
    size_str=$(human_bytes "$downloaded_bytes")

    printf "\r  %s  %d/%d  ETA: %-12s  Elapsed: %-10s  %s  %-8s" \
      "$bar" "$done_count" "$total" "$eta_str" "$elapsed_str" "$speed" "$size_str"

    (( done_count + fail_count >= total )) && break
    sleep 1
  done
  echo ""  # final newline
}

monitor "$TOTAL_FILES" "$START_TS" &
MONITOR_PID=$!

# ── 4. Run downloads ──────────────────────────────────────────────────────────
< "$FILE_LIST" xargs -P "$CONCURRENCY" -I{} bash -c 'download_one "$@"' _ {}

# Wait for monitor to catch up
wait "$MONITOR_PID" 2>/dev/null || true

# ── 5. Summary ────────────────────────────────────────────────────────────────
END_TS=$(date +%s)
ELAPSED=$(( END_TS - START_TS ))

DONE_COUNT=$(ls -1 "$DONE_DIR" 2>/dev/null | wc -l | tr -d ' ')
FAIL_COUNT=$(ls -1 "$FAIL_DIR" 2>/dev/null | wc -l | tr -d ' ')
FINAL_SIZE=$(du -sh "$OUTPUT_DIR" 2>/dev/null | awk '{print $1}')

echo ""
echo -e "${BOLD}─── Summary ────────────────────────────────────────────${RESET}"
ok "Downloaded : ${DONE_COUNT} files"
[[ "$FAIL_COUNT" -gt 0 ]] && echo -e "${RED}✗${RESET} Failed     : ${FAIL_COUNT} files"
info "Total size : ${FINAL_SIZE}"
info "Time taken : $(human_duration $ELAPSED)"
info "Output dir : ${OUTPUT_DIR}"

if (( FAIL_COUNT > 0 )); then
  FAIL_LOG="${OUTPUT_DIR}/failed_files.txt"
  ls "$FAIL_DIR" | sed 's/\.fail$//' > "$FAIL_LOG"
  echo -e "${YELLOW}⚠${RESET}  Failed files logged to: ${FAIL_LOG}"
  echo -e "   Re-run the script to retry — already-completed files will be skipped."
fi

echo ""

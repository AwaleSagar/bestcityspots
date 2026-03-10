#!/usr/bin/env bash
# ============================================================
# empty-place-images-bucket.sh
# Deletes ALL objects from the place_images Supabase storage
# bucket using the batch-delete API (1000 files per request).
#
# Usage:
#   ./scripts/empty-place-images-bucket.sh [--confirm]
#
# WARNING: This is IRREVERSIBLE. Take a backup first.
# ============================================================

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
PROJECT_URL="https://nwspdpjmonlambvrstww.supabase.co"
BUCKET="place_images"
PAGE_SIZE=1000
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"

# ── Colour helpers ────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'
die()  { echo -e "${RED}ERROR:${RESET} $*" >&2; exit 1; }
info() { echo -e "${CYAN}→${RESET} $*"; }
ok()   { echo -e "${GREEN}✓${RESET} $*"; }
warn() { echo -e "${YELLOW}⚠${RESET}  $*"; }

# ── Resolve auth key ──────────────────────────────────────────────────────────
# Service role key is required for storage deletes (anon key is read-only on storage mgmt)
ENV_FILE="$(dirname "$0")/../.env.local"

if [[ -z "$SERVICE_KEY" ]] && [[ -f "$ENV_FILE" ]]; then
  SERVICE_KEY=$(grep -E '^SUPABASE_SERVICE_ROLE_KEY=' "$ENV_FILE" | cut -d= -f2- | tr -d '"' | tr -d "'" | tr -d '[:space:]' || true)
fi

if [[ -z "$SERVICE_KEY" ]]; then
  # Fall back to anon key — works if bucket RLS allows delete, but service key is safer
  warn "SUPABASE_SERVICE_ROLE_KEY not found. Falling back to anon JWT (may fail if RLS blocks deletes)."
  AUTH_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53c3BkcGptb25sYW1idnJzdHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMTk1OTYsImV4cCI6MjA4MzU5NTU5Nn0.ddz-mAY1A5ybm7YZGeZW9im4WsATFXsqMRDFoeiItG0"
else
  AUTH_KEY="$SERVICE_KEY"
fi

BASE_URL="${PROJECT_URL}/storage/v1"
LIST_URL="${BASE_URL}/object/list/${BUCKET}"
DELETE_URL="${BASE_URL}/object/${BUCKET}"

# ── Safety gate ───────────────────────────────────────────────────────────────
echo -e "\n${BOLD}${RED}⚠  DESTRUCTIVE OPERATION${RESET}"
echo -e "   Bucket  : ${BOLD}${BUCKET}${RESET}"
echo -e "   Project : ${PROJECT_URL}\n"

if [[ "${1:-}" != "--confirm" ]]; then
  read -r -p "Type the bucket name to confirm deletion: " input
  [[ "$input" == "$BUCKET" ]] || die "Confirmation failed. Aborting."
fi

echo ""

# ── Phase 1: Count total ──────────────────────────────────────────────────────
info "Counting objects…"
_body=$(jq -n --argjson l "$PAGE_SIZE" --argjson o 0 \
  '{"limit":$l,"offset":$o,"prefix":"","sortBy":{"column":"name","order":"asc"}}')

first_page=$(curl -sf -X POST "$LIST_URL" \
  -H "Authorization: Bearer ${AUTH_KEY}" \
  -H "Content-Type: application/json" \
  -d "$_body") || die "Failed to reach Storage API"

first_count=$(echo "$first_page" | jq 'length')
if [[ "$first_count" -eq 0 ]]; then
  ok "Bucket is already empty."
  exit 0
fi

# ── Phase 2: Delete in pages ──────────────────────────────────────────────────
echo -e "${BOLD}Deleting objects in batches of ${PAGE_SIZE}…${RESET}\n"

total_deleted=0
batch=0

while true; do
  batch=$(( batch + 1 ))

  # List next page
  _body=$(jq -n --argjson l "$PAGE_SIZE" --argjson o 0 \
    '{"limit":$l,"offset":$o,"prefix":"","sortBy":{"column":"name","order":"asc"}}')

  response=$(curl -sf -X POST "$LIST_URL" \
    -H "Authorization: Bearer ${AUTH_KEY}" \
    -H "Content-Type: application/json" \
    -d "$_body") || die "Failed to list objects (batch ${batch})"

  page_count=$(echo "$response" | jq 'length')
  [[ "$page_count" -eq 0 ]] && break

  # Build prefixes array for batch delete: ["file1.jpg","file2.jpg",...]
  prefixes=$(echo "$response" | jq '[.[].name]')

  # POST /storage/v1/object/{bucket} with {"prefixes": [...]}
  del_response=$(curl -sf -X DELETE "$DELETE_URL" \
    -H "Authorization: Bearer ${AUTH_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"prefixes\": ${prefixes}}") || die "Delete request failed (batch ${batch})"

  deleted_this=$(echo "$del_response" | jq '[.[] | select(.error == null)] | length' 2>/dev/null || echo "$page_count")
  failed_this=$(echo "$del_response" | jq '[.[] | select(.error != null)] | length' 2>/dev/null || echo 0)

  total_deleted=$(( total_deleted + deleted_this ))

  printf "  Batch %-3d │ deleted %-5d │ failed %-4d │ total deleted: %d\n" \
    "$batch" "$deleted_this" "$failed_this" "$total_deleted"

  (( page_count < PAGE_SIZE )) && break
done

echo ""
ok "Done. Deleted ${total_deleted} objects from '${BUCKET}'."

# Verify
remaining=$(curl -sf -X POST "$LIST_URL" \
  -H "Authorization: Bearer ${AUTH_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"limit":1,"offset":0,"prefix":"","sortBy":{"column":"name","order":"asc"}}' | jq 'length') || remaining="?"

if [[ "$remaining" == "0" ]]; then
  ok "Bucket is now empty ✓"
else
  warn "Remaining objects: ${remaining} (re-run to delete the rest)"
fi
echo ""

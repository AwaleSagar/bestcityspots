#!/usr/bin/env bash
set -euo pipefail

# Standalone shell backfill for city AI insights using OpenRouter + Supabase REST.
# Requirements: curl, jq, date, python3 (for date diff).
#
# Env (required):
#   SUPABASE_URL
#   SUPABASE_SERVICE_ROLE_KEY   # service role key (not anon)
#   OPENROUTER_API_KEY
# Env (optional):
#   OPENROUTER_MODEL (default: google/gemini-3-flash-preview)
#   CITY_LIMIT (default: 1000)
#   FETCH_LIMIT (default: 5000; how many rows to pull before slicing top N)
#   TTL_DAYS (default: 365; currently unused if skipping on presence)
#
# Run:
#   CITY_LIMIT=10 TTL_DAYS=365 ./scripts/backfillCityInsights.sh

SUPABASE_URL=${SUPABASE_URL:-}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY:-}
OPENROUTER_API_KEY=${OPENROUTER_API_KEY:-}
OPENROUTER_MODEL=${OPENROUTER_MODEL:-"google/gemini-3-flash-preview"}
CITY_LIMIT=${CITY_LIMIT:-1000}
FETCH_LIMIT=${FETCH_LIMIT:-5000}
TTL_DAYS=${TTL_DAYS:-365}

if [[ -z "$SUPABASE_URL" || -z "$SUPABASE_SERVICE_ROLE_KEY" || -z "$OPENROUTER_API_KEY" ]]; then
  echo "Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or OPENROUTER_API_KEY" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required" >&2
  exit 1
fi

has_insight() {
  local updated_at="$1"
  [[ -n "$updated_at" ]]
}

call_openrouter() {
  local city="$1"
  local country="$2"
  local prompt=$(cat <<EOF
You are a concise travel curator. Summarize ${city}, ${country}.
Return ONLY a JSON object with keys:
{
  "intro": "≤500 characters, vivid but factual city intro",
  "attractions": [
    { "name": "spot name", "why": "1 short sentence" },
    { "name": "spot name", "why": "1 short sentence" },
    { "name": "spot name", "why": "1 short sentence" }
  ],
  "seasons": [
    { "name": "Spring", "months": "Mar-May", "summary": "concise guidance" },
    { "name": "Summer", "months": "Jun-Aug", "summary": "concise guidance" },
    { "name": "Autumn", "months": "Sep-Nov", "summary": "concise guidance" },
    { "name": "Winter", "months": "Dec-Feb", "summary": "concise guidance" }
  ],
  "weather": [
    { "season": "Spring", "tempC": "avg temp range in °C", "notes": "travel tip" },
    { "season": "Summer", "tempC": "avg temp range in °C", "notes": "travel tip" },
    { "season": "Autumn", "tempC": "avg temp range in °C", "notes": "travel tip" },
    { "season": "Winter", "tempC": "avg temp range in °C", "notes": "travel tip" }
  ]
}
Do not add prose, code fences, or Markdown—just JSON.
EOF
)

  local body=$(jq -nc \
    --arg model "$OPENROUTER_MODEL" \
    --arg prompt "$prompt" \
    '{model:$model, messages:[{role:"user", content:$prompt}], temperature:0.3}')

  local resp
  resp=$(curl -sS -X POST "https://openrouter.ai/api/v1/chat/completions" \
    -H "Authorization: Bearer ${OPENROUTER_API_KEY}" \
    -H "Content-Type: application/json" \
    -H "HTTP-Referer: https://bestcityspots.example" \
    -H "X-Title: CityInsightsBatchShell" \
    -d "$body")

  echo "$resp" | jq -e '.choices[0].message.content' >/dev/null 2>&1 || {
    echo "[fail] OpenRouter for ${city}: $resp" >&2
    return 1
  }

  echo "$resp" | jq -r '.choices[0].message.content' | sed 's/^```json//; s/^```//; s/```$//'
}

now_iso() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

upsert_insight() {
  local city_id="$1"
  local city="$2"
  local country="$3"
  local insight_json="$4"

  local payload=$(jq -nc \
    --argjson insight "$insight_json" \
    --arg city "$city" \
    --arg country "$country" \
    --argjson city_id "$city_id" \
    --arg updated_at "$(now_iso)" \
    '{
      city_id: $city_id,
      city_name: $city,
      country: $country,
      intro: $insight.intro,
      attractions: ($insight.attractions // []),
      seasons: ($insight.seasons // []),
      weather: ($insight.weather // []),
      updated_at: $updated_at
    }')

  response=$(curl -sS -w "%{http_code}" -o /tmp/upsert_resp.$$ \
    -X POST "${SUPABASE_URL}/rest/v1/city_ai_insights" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: resolution=merge-duplicates" \
    -d "$payload")

  http_code="${response:(-3)}"
  body="$(cat /tmp/upsert_resp.$$)"
  rm -f /tmp/upsert_resp.$$

  if [[ "$http_code" != "200" && "$http_code" != "201" && "$http_code" != "204" ]]; then
    echo "[fail] upsert ${city} (HTTP ${http_code}): ${body}" >&2
    return 1
  fi
}

echo "Fetching up to ${FETCH_LIMIT} cities ordered by population..."
all_cities=$(curl -sS "${SUPABASE_URL}/rest/v1/cities?select=id,city,country,population&order=population.desc&limit=${FETCH_LIMIT}" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}")

top_cities=$(echo "$all_cities" | jq "sort_by(.population) | reverse | .[0:${CITY_LIMIT}]")

preview_file="./data/city_ai_candidates.txt"
mkdir -p ./data
echo "$top_cities" | jq -r '.[] | "\(.city), \(.country), pop=\(.population)"' > "$preview_file"
echo "Preview written to ${preview_file} (top ${CITY_LIMIT} by population)."
read -r -p "Proceed with AI insight upsert? [y/N]: " ans
ans_lower=$(printf '%s' "$ans" | tr '[:upper:]' '[:lower:]')
if [[ "$ans_lower" != "y" && "$ans_lower" != "yes" ]]; then
  echo "Aborted by user."
  exit 0
fi

echo "$top_cities" | jq -c '.[]' | while read -r city; do
  id=$(echo "$city" | jq -r '.id')
  name=$(echo "$city" | jq -r '.city')
  country=$(echo "$city" | jq -r '.country')

  existing=$(curl -sS "${SUPABASE_URL}/rest/v1/city_ai_insights?city_id=eq.${id}&select=updated_at&limit=1" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}")
  updated_at=$(echo "$existing" | jq -r '.[0].updated_at // empty')

  if has_insight "$updated_at"; then
    echo "[skip] already cached ${name}"
    continue
  fi

  echo "[run ] ${name}"
  content=$(call_openrouter "$name" "$country") || { echo "[fail] ${name}"; continue; }
  insight_json=$(echo "$content" | jq -c .) || { echo "[fail] parse ${name}"; continue; }
  upsert_insight "$id" "$name" "$country" "$insight_json" || { echo "[fail] upsert ${name}"; continue; }
  echo "[done] ${name}"
done

echo "Completed batch."

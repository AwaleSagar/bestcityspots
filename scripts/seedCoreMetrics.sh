#!/usr/bin/env bash
set -euo pipefail

# Seed a test row into city_metrics for a given city_id (testing only).
# Env required:
#   SUPABASE_URL
#   SUPABASE_SERVICE_ROLE_KEY   # service role key (not anon)
#   CITY_ID                     # target cities.id
# Optional overrides:
#   CONNECTIVITY_MBPS (default 85)
#   SAFETY_SCORE (default 62)
#   POLLUTION_PM25 (default 18)
#   CLIMATE_COMFORT (default "Mild most of the year")
#   HEALTH_PER_100K (default 2.5)

SUPABASE_URL=${SUPABASE_URL:-}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY:-}
CITY_ID=${CITY_ID:-}

CONNECTIVITY_MBPS=${CONNECTIVITY_MBPS:-85}
SAFETY_SCORE=${SAFETY_SCORE:-62}
POLLUTION_PM25=${POLLUTION_PM25:-18}
CLIMATE_COMFORT=${CLIMATE_COMFORT:-"Mild most of the year"}
HEALTH_PER_100K=${HEALTH_PER_100K:-2.5}

if [[ -z "$SUPABASE_URL" || -z "$SUPABASE_SERVICE_ROLE_KEY" || -z "$CITY_ID" ]]; then
  echo "Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or CITY_ID" >&2
  exit 1
fi

payload=$(jq -nc \
  --argjson city_id "$CITY_ID" \
  --argjson connectivity "$CONNECTIVITY_MBPS" \
  --argjson safety "$SAFETY_SCORE" \
  --argjson pm25 "$POLLUTION_PM25" \
  --arg comfort "$CLIMATE_COMFORT" \
  --argjson health "$HEALTH_PER_100K" \
  '{
    city_id: $city_id,
    connectivity_mbps: $connectivity,
    safety_score: $safety,
    pollution_pm25: $pm25,
    climate_comfort: $comfort,
    health_access_per_100k: $health,
    updated_at: (now | todate)
  }')

curl -sS -X POST "${SUPABASE_URL}/rest/v1/city_metrics" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates" \
  -d "$payload"

echo
echo "[seeded] city_metrics for city_id=${CITY_ID}"

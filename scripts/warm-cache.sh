#!/bin/bash

# Hot Cache Warmer Script for BestCitySpots
# Invokes the Supabase Edge Function to check cache status

# Configuration
SUPABASE_URL="https://nwspdpjmonlambvrstww.supabase.co"
FUNCTION_NAME="hot-cache-warmer"

# Default parameters (can be overridden via command line)
LIMIT=${1:-50}
MIN_POPULATION=${2:-100000}

echo "🔥 Hot Cache Warmer"
echo "==================="
echo "Checking top $LIMIT cities with population >= $MIN_POPULATION"
echo ""

# Invoke the Edge Function (no auth required)
response=$(curl -s -X POST \
  "${SUPABASE_URL}/functions/v1/${FUNCTION_NAME}" \
  -H "Content-Type: application/json" \
  -d "{
    \"limit\": ${LIMIT},
    \"min_population\": ${MIN_POPULATION}
  }")

# Check if curl succeeded
if [ $? -ne 0 ]; then
  echo "❌ Error: Failed to connect to Edge Function"
  exit 1
fi

# Pretty print the response (requires jq, fallback to raw output)
if command -v jq &> /dev/null; then
  echo "$response" | jq .
else
  echo "$response"
fi

echo ""
echo "✅ Done!"

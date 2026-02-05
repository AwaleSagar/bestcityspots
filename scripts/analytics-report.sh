#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Analytics Report Generator for Marketing Team
# =============================================================================
# Generates a formatted report from the visitor analytics tables.
#
# Requirements:
#   - psql installed
#   - Supabase Postgres connection via either:
#       SUPABASE_DB_URL (full connection URI), or
#       PGHOST / PGUSER / PGPASSWORD / PGPORT / PGDATABASE
#
# Usage:
#   ./scripts/analytics-report.sh                    # Last 7 days (default)
#   ./scripts/analytics-report.sh --days 30         # Last 30 days
#   ./scripts/analytics-report.sh --from 2026-01-01 --to 2026-01-31  # Date range
#   ./scripts/analytics-report.sh --export csv      # Export as CSV
#   ./scripts/analytics-report.sh --export json     # Export as JSON
#
# =============================================================================

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m' # No Color

# Default values
DAYS=7
FROM_DATE=""
TO_DATE=""
EXPORT_FORMAT=""
OUTPUT_FILE=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --days)
      DAYS="$2"
      shift 2
      ;;
    --from)
      FROM_DATE="$2"
      shift 2
      ;;
    --to)
      TO_DATE="$2"
      shift 2
      ;;
    --export)
      EXPORT_FORMAT="$2"
      shift 2
      ;;
    --output)
      OUTPUT_FILE="$2"
      shift 2
      ;;
    --help|-h)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --days N          Report for last N days (default: 7)"
      echo "  --from DATE       Start date (YYYY-MM-DD)"
      echo "  --to DATE         End date (YYYY-MM-DD)"
      echo "  --export FORMAT   Export format: csv or json"
      echo "  --output FILE     Output file path (default: stdout or auto-generated)"
      echo "  --help            Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Check for psql
if ! command -v psql >/dev/null 2>&1; then
  echo -e "${RED}Error: psql is required but not found in PATH${NC}" >&2
  exit 1
fi

# Connection string handling
PG_URI=${SUPABASE_DB_URL:-}

if [[ -z "$PG_URI" ]]; then
  : "${PGHOST:?Missing PGHOST or SUPABASE_DB_URL}"
  : "${PGUSER:?Missing PGUSER or SUPABASE_DB_URL}"
  : "${PGPASSWORD:?Missing PGPASSWORD or SUPABASE_DB_URL}"
  : "${PGDATABASE:?Missing PGDATABASE or SUPABASE_DB_URL}"
  PSQL_CMD="psql"
else
  PSQL_CMD="psql $PG_URI"
fi

# Calculate date range
if [[ -n "$FROM_DATE" && -n "$TO_DATE" ]]; then
  DATE_FROM="$FROM_DATE"
  DATE_TO="$TO_DATE"
else
  DATE_TO=$(date -u +"%Y-%m-%d")
  if [[ "$(uname)" == "Darwin" ]]; then
    DATE_FROM=$(date -u -v-${DAYS}d +"%Y-%m-%d")
  else
    DATE_FROM=$(date -u -d "$DAYS days ago" +"%Y-%m-%d")
  fi
fi

# Helper function to run SQL
run_sql() {
  local query="$1"
  if [[ -n "$PG_URI" ]]; then
    psql "$PG_URI" -t -A -F'|' -c "$query" 2>/dev/null
  else
    psql -t -A -F'|' -c "$query" 2>/dev/null
  fi
}

# Helper function to run SQL with headers
run_sql_with_headers() {
  local query="$1"
  if [[ -n "$PG_URI" ]]; then
    psql "$PG_URI" -F'|' -c "$query" 2>/dev/null
  else
    psql -F'|' -c "$query" 2>/dev/null
  fi
}

# Helper to format numbers with commas
format_number() {
  echo "$1" | sed ':a;s/\B[0-9]\{3\}\>/, &/;ta'
}

# =============================================================================
# Report Functions
# =============================================================================

print_header() {
  echo ""
  echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
  echo -e "${BOLD}${BLUE}     📊  BESTCITYSPOTS ANALYTICS REPORT${NC}"
  echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
  echo ""
  echo -e "${DIM}Report Period: ${NC}${BOLD}$DATE_FROM${NC}${DIM} to ${NC}${BOLD}$DATE_TO${NC}"
  echo -e "${DIM}Generated:     ${NC}$(date -u +"%Y-%m-%d %H:%M:%S UTC")"
  echo ""
}

print_section() {
  local title="$1"
  local icon="$2"
  echo ""
  echo -e "${BOLD}${CYAN}─────────────────────────────────────────────────────────────────${NC}"
  echo -e "${BOLD}${CYAN}  $icon  $title${NC}"
  echo -e "${BOLD}${CYAN}─────────────────────────────────────────────────────────────────${NC}"
}

# 1. Overview Stats
generate_overview() {
  print_section "VISITOR OVERVIEW" "👥"
  
  local stats=$(run_sql "
    SELECT 
      COALESCE(SUM(total_visits), 0) as total_visits,
      COALESCE(SUM(unique_visitors), 0) as unique_visitors,
      COALESCE(SUM(page_views), 0) as page_views,
      COALESCE(ROUND(AVG(avg_session_duration_sec)), 0) as avg_session,
      COALESCE(ROUND(AVG(bounce_rate_pct)), 0) as bounce_rate,
      COALESCE(SUM(new_visitors), 0) as new_visitors,
      COALESCE(SUM(returning_visitors), 0) as returning_visitors
    FROM public.daily_visitor_stats
    WHERE stat_date BETWEEN '$DATE_FROM' AND '$DATE_TO';
  ")
  
  if [[ -z "$stats" || "$stats" == "|||||||" ]]; then
    echo -e "  ${DIM}No data available for this period${NC}"
    return
  fi
  
  IFS='|' read -r visits unique_vis page_views avg_session bounce new_vis return_vis <<< "$stats"
  
  echo ""
  echo -e "  ${BOLD}Total Visits:${NC}        $(format_number ${visits:-0})"
  echo -e "  ${BOLD}Unique Visitors:${NC}     $(format_number ${unique_vis:-0})"
  echo -e "  ${BOLD}Page Views:${NC}          $(format_number ${page_views:-0})"
  echo ""
  echo -e "  ${BOLD}Avg Session:${NC}         ${avg_session:-0} seconds"
  echo -e "  ${BOLD}Bounce Rate:${NC}         ${bounce:-0}%"
  echo ""
  echo -e "  ${GREEN}New Visitors:${NC}        $(format_number ${new_vis:-0})"
  echo -e "  ${BLUE}Returning:${NC}           $(format_number ${return_vis:-0})"
  
  # Calculate visitor trend
  if [[ ${unique_vis:-0} -gt 0 ]]; then
    local return_pct=$((${return_vis:-0} * 100 / ${unique_vis:-0}))
    echo ""
    echo -e "  ${DIM}Returning visitor rate: ${return_pct}%${NC}"
  fi
}

# 2. Traffic Sources
generate_traffic_sources() {
  print_section "TRAFFIC SOURCES" "🔗"
  
  local sources=$(run_sql "
    SELECT 
      source_type,
      COALESCE(SUM(visits), 0) as visits,
      COALESCE(SUM(unique_visitors), 0) as unique_vis
    FROM public.traffic_sources_daily
    WHERE stat_date BETWEEN '$DATE_FROM' AND '$DATE_TO'
    GROUP BY source_type
    ORDER BY visits DESC
    LIMIT 10;
  ")
  
  if [[ -z "$sources" ]]; then
    echo -e "  ${DIM}No traffic source data available${NC}"
    return
  fi
  
  echo ""
  printf "  ${BOLD}%-15s %12s %12s${NC}\n" "Source" "Visits" "Unique"
  echo "  ─────────────────────────────────────────"
  
  while IFS='|' read -r source visits unique_vis; do
    [[ -z "$source" ]] && continue
    printf "  %-15s %12s %12s\n" "$source" "$(format_number $visits)" "$(format_number $unique_vis)"
  done <<< "$sources"
  
  # Top referrers
  echo ""
  echo -e "  ${BOLD}Top Referrers:${NC}"
  
  local referrers=$(run_sql "
    SELECT source_name, COALESCE(SUM(visits), 0) as visits
    FROM public.traffic_sources_daily
    WHERE stat_date BETWEEN '$DATE_FROM' AND '$DATE_TO'
      AND source_type = 'referral'
      AND source_name IS NOT NULL
    GROUP BY source_name
    ORDER BY visits DESC
    LIMIT 5;
  ")
  
  if [[ -n "$referrers" ]]; then
    while IFS='|' read -r name visits; do
      [[ -z "$name" ]] && continue
      echo "    • $name ($(format_number $visits) visits)"
    done <<< "$referrers"
  else
    echo -e "    ${DIM}No referral data${NC}"
  fi
}

# 3. Device Stats
generate_device_stats() {
  print_section "DEVICE BREAKDOWN" "📱"
  
  local devices=$(run_sql "
    SELECT 
      device_type,
      COALESCE(SUM(visits), 0) as visits,
      COALESCE(SUM(unique_visitors), 0) as unique_vis
    FROM public.device_stats_daily
    WHERE stat_date BETWEEN '$DATE_FROM' AND '$DATE_TO'
    GROUP BY device_type
    ORDER BY visits DESC;
  ")
  
  if [[ -z "$devices" ]]; then
    echo -e "  ${DIM}No device data available${NC}"
    return
  fi
  
  local total_visits=$(run_sql "
    SELECT COALESCE(SUM(visits), 0)
    FROM public.device_stats_daily
    WHERE stat_date BETWEEN '$DATE_FROM' AND '$DATE_TO';
  ")
  total_visits=${total_visits:-1}
  
  echo ""
  printf "  ${BOLD}%-12s %12s %8s${NC}\n" "Device" "Visits" "Share"
  echo "  ────────────────────────────────────"
  
  while IFS='|' read -r device visits unique_vis; do
    [[ -z "$device" ]] && continue
    local pct=$((visits * 100 / total_visits))
    printf "  %-12s %12s %7s%%\n" "$device" "$(format_number $visits)" "$pct"
  done <<< "$devices"
  
  # Top browsers
  echo ""
  echo -e "  ${BOLD}Top Browsers:${NC}"
  
  local browsers=$(run_sql "
    SELECT browser, COALESCE(SUM(visits), 0) as visits
    FROM public.device_stats_daily
    WHERE stat_date BETWEEN '$DATE_FROM' AND '$DATE_TO'
      AND browser IS NOT NULL
    GROUP BY browser
    ORDER BY visits DESC
    LIMIT 5;
  ")
  
  if [[ -n "$browsers" ]]; then
    while IFS='|' read -r browser visits; do
      [[ -z "$browser" ]] && continue
      echo "    • $browser ($(format_number $visits))"
    done <<< "$browsers"
  else
    echo -e "    ${DIM}No browser data${NC}"
  fi
}

# 4. Geographic Data
generate_geo_stats() {
  print_section "GEOGRAPHIC DISTRIBUTION" "🌍"
  
  local countries=$(run_sql "
    SELECT 
      country_code,
      COALESCE(SUM(visits), 0) as visits,
      COALESCE(SUM(unique_visitors), 0) as unique_vis
    FROM public.geo_stats_daily
    WHERE stat_date BETWEEN '$DATE_FROM' AND '$DATE_TO'
    GROUP BY country_code
    ORDER BY visits DESC
    LIMIT 10;
  ")
  
  if [[ -z "$countries" ]]; then
    echo -e "  ${DIM}No geographic data available (consent-based)${NC}"
    return
  fi
  
  echo ""
  printf "  ${BOLD}%-8s %12s %12s${NC}\n" "Country" "Visits" "Unique"
  echo "  ─────────────────────────────────────"
  
  while IFS='|' read -r country visits unique_vis; do
    [[ -z "$country" ]] && continue
    printf "  %-8s %12s %12s\n" "$country" "$(format_number $visits)" "$(format_number $unique_vis)"
  done <<< "$countries"
}

# 5. Top City Pages
generate_city_views() {
  print_section "TOP CITY PAGES" "🏙️"
  
  local cities=$(run_sql "
    SELECT 
      cv.city_id,
      c.name,
      c.country,
      COALESCE(SUM(cv.views), 0) as views,
      COALESCE(SUM(cv.unique_visitors), 0) as unique_vis
    FROM public.city_views_daily cv
    LEFT JOIN public.cities c ON c.id = cv.city_id
    WHERE cv.stat_date BETWEEN '$DATE_FROM' AND '$DATE_TO'
    GROUP BY cv.city_id, c.name, c.country
    ORDER BY views DESC
    LIMIT 15;
  ")
  
  if [[ -z "$cities" ]]; then
    echo -e "  ${DIM}No city view data available${NC}"
    return
  fi
  
  echo ""
  printf "  ${BOLD}%-25s %-15s %10s %10s${NC}\n" "City" "Country" "Views" "Unique"
  echo "  ────────────────────────────────────────────────────────────────"
  
  local rank=1
  while IFS='|' read -r city_id name country views unique_vis; do
    [[ -z "$city_id" ]] && continue
    local display_name="${name:-City #$city_id}"
    printf "  %2d. %-22s %-15s %10s %10s\n" "$rank" "${display_name:0:22}" "${country:-N/A}" "$(format_number $views)" "$(format_number $unique_vis)"
    ((rank++))
  done <<< "$cities"
}

# 6. User Actions
generate_user_actions() {
  print_section "USER ENGAGEMENT" "⚡"
  
  local actions=$(run_sql "
    SELECT 
      action_type,
      COALESCE(SUM(action_count), 0) as total_actions,
      COALESCE(SUM(unique_users), 0) as unique_users
    FROM public.user_actions_daily
    WHERE stat_date BETWEEN '$DATE_FROM' AND '$DATE_TO'
    GROUP BY action_type
    ORDER BY total_actions DESC;
  ")
  
  if [[ -z "$actions" ]]; then
    echo -e "  ${DIM}No user action data available${NC}"
    return
  fi
  
  echo ""
  printf "  ${BOLD}%-20s %12s %12s${NC}\n" "Action" "Count" "Unique Users"
  echo "  ──────────────────────────────────────────────────"
  
  while IFS='|' read -r action total_count unique_users; do
    [[ -z "$action" ]] && continue
    printf "  %-20s %12s %12s\n" "$action" "$(format_number $total_count)" "$(format_number $unique_users)"
  done <<< "$actions"
}

# 7. Daily Trend (last 7 days regardless of filter)
generate_daily_trend() {
  print_section "DAILY TREND (Last 7 Days)" "📈"
  
  local trend=$(run_sql "
    SELECT 
      stat_date,
      total_visits,
      unique_visitors,
      page_views
    FROM public.daily_visitor_stats
    ORDER BY stat_date DESC
    LIMIT 7;
  ")
  
  if [[ -z "$trend" ]]; then
    echo -e "  ${DIM}No trend data available${NC}"
    return
  fi
  
  echo ""
  printf "  ${BOLD}%-12s %10s %10s %10s${NC}\n" "Date" "Visits" "Unique" "Views"
  echo "  ─────────────────────────────────────────────"
  
  while IFS='|' read -r date visits unique_vis views; do
    [[ -z "$date" ]] && continue
    printf "  %-12s %10s %10s %10s\n" "$date" "$(format_number ${visits:-0})" "$(format_number ${unique_vis:-0})" "$(format_number ${views:-0})"
  done <<< "$trend"
}

# =============================================================================
# Export Functions
# =============================================================================

export_csv() {
  local filename="${OUTPUT_FILE:-analytics_report_$(date +%Y%m%d).csv}"
  
  echo "Exporting to CSV: $filename"
  
  {
    echo "# Analytics Report: $DATE_FROM to $DATE_TO"
    echo ""
    
    echo "## Daily Visitor Stats"
    run_sql_with_headers "
      SELECT stat_date, total_visits, unique_visitors, page_views, 
             avg_session_duration_sec, bounce_rate_pct, new_visitors, returning_visitors
      FROM public.daily_visitor_stats
      WHERE stat_date BETWEEN '$DATE_FROM' AND '$DATE_TO'
      ORDER BY stat_date DESC;
    " | sed 's/|/,/g'
    
    echo ""
    echo "## Traffic Sources"
    run_sql_with_headers "
      SELECT stat_date, source_type, source_name, visits, unique_visitors
      FROM public.traffic_sources_daily
      WHERE stat_date BETWEEN '$DATE_FROM' AND '$DATE_TO'
      ORDER BY stat_date DESC, visits DESC;
    " | sed 's/|/,/g'
    
    echo ""
    echo "## Device Stats"
    run_sql_with_headers "
      SELECT stat_date, device_type, browser, os, visits, unique_visitors
      FROM public.device_stats_daily
      WHERE stat_date BETWEEN '$DATE_FROM' AND '$DATE_TO'
      ORDER BY stat_date DESC, visits DESC;
    " | sed 's/|/,/g'
    
    echo ""
    echo "## Geographic Stats"
    run_sql_with_headers "
      SELECT stat_date, country_code, region, city, visits, unique_visitors
      FROM public.geo_stats_daily
      WHERE stat_date BETWEEN '$DATE_FROM' AND '$DATE_TO'
      ORDER BY stat_date DESC, visits DESC;
    " | sed 's/|/,/g'
    
    echo ""
    echo "## City Page Views"
    run_sql_with_headers "
      SELECT cv.stat_date, c.name as city_name, c.country, cv.views, cv.unique_visitors
      FROM public.city_views_daily cv
      LEFT JOIN public.cities c ON c.id = cv.city_id
      WHERE cv.stat_date BETWEEN '$DATE_FROM' AND '$DATE_TO'
      ORDER BY cv.stat_date DESC, cv.views DESC;
    " | sed 's/|/,/g'
    
    echo ""
    echo "## User Actions"
    run_sql_with_headers "
      SELECT stat_date, action_type, action_count, unique_users
      FROM public.user_actions_daily
      WHERE stat_date BETWEEN '$DATE_FROM' AND '$DATE_TO'
      ORDER BY stat_date DESC, action_count DESC;
    " | sed 's/|/,/g'
    
  } > "$filename"
  
  echo -e "${GREEN}✓ Exported to: $filename${NC}"
}

export_json() {
  local filename="${OUTPUT_FILE:-analytics_report_$(date +%Y%m%d).json}"
  
  echo "Exporting to JSON: $filename"
  
  local json_query="
    SELECT json_build_object(
      'report_period', json_build_object(
        'from', '$DATE_FROM',
        'to', '$DATE_TO',
        'generated_at', NOW()
      ),
      'overview', (
        SELECT json_agg(row_to_json(d))
        FROM (
          SELECT * FROM public.daily_visitor_stats
          WHERE stat_date BETWEEN '$DATE_FROM' AND '$DATE_TO'
          ORDER BY stat_date DESC
        ) d
      ),
      'traffic_sources', (
        SELECT json_agg(row_to_json(t))
        FROM (
          SELECT stat_date, source_type, source_name, visits, unique_visitors
          FROM public.traffic_sources_daily
          WHERE stat_date BETWEEN '$DATE_FROM' AND '$DATE_TO'
          ORDER BY stat_date DESC, visits DESC
        ) t
      ),
      'devices', (
        SELECT json_agg(row_to_json(dv))
        FROM (
          SELECT stat_date, device_type, browser, os, visits, unique_visitors
          FROM public.device_stats_daily
          WHERE stat_date BETWEEN '$DATE_FROM' AND '$DATE_TO'
          ORDER BY stat_date DESC, visits DESC
        ) dv
      ),
      'geography', (
        SELECT json_agg(row_to_json(g))
        FROM (
          SELECT stat_date, country_code, region, city, visits, unique_visitors
          FROM public.geo_stats_daily
          WHERE stat_date BETWEEN '$DATE_FROM' AND '$DATE_TO'
          ORDER BY stat_date DESC, visits DESC
        ) g
      ),
      'city_views', (
        SELECT json_agg(row_to_json(cv))
        FROM (
          SELECT cv.stat_date, cv.city_id, c.name as city_name, c.country, cv.views, cv.unique_visitors
          FROM public.city_views_daily cv
          LEFT JOIN public.cities c ON c.id = cv.city_id
          WHERE cv.stat_date BETWEEN '$DATE_FROM' AND '$DATE_TO'
          ORDER BY cv.stat_date DESC, cv.views DESC
        ) cv
      ),
      'user_actions', (
        SELECT json_agg(row_to_json(ua))
        FROM (
          SELECT stat_date, action_type, action_count, unique_users
          FROM public.user_actions_daily
          WHERE stat_date BETWEEN '$DATE_FROM' AND '$DATE_TO'
          ORDER BY stat_date DESC, action_count DESC
        ) ua
      )
    );
  "
  
  if [[ -n "$PG_URI" ]]; then
    psql "$PG_URI" -t -A -c "$json_query" 2>/dev/null > "$filename"
  else
    psql -t -A -c "$json_query" 2>/dev/null > "$filename"
  fi
  
  echo -e "${GREEN}✓ Exported to: $filename${NC}"
}

# =============================================================================
# Main
# =============================================================================

main() {
  case "$EXPORT_FORMAT" in
    csv)
      export_csv
      ;;
    json)
      export_json
      ;;
    *)
      print_header
      generate_overview
      generate_traffic_sources
      generate_device_stats
      generate_geo_stats
      generate_city_views
      generate_user_actions
      generate_daily_trend
      
      echo ""
      echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
      echo -e "${DIM}  Run with --export csv or --export json for raw data export${NC}"
      echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
      echo ""
      ;;
  esac
}

main

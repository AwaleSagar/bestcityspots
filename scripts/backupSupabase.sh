#!/usr/bin/env bash
set -euo pipefail

# Simple Supabase backup script (disaster recovery helper).
# Creates timestamped dumps under data/backup/.
#
# Requirements:
#   - pg_dump installed
#   - Supabase Postgres connection via either:
#       SUPABASE_DB_URL (full connection URI), or
#       PGHOST / PGUSER / PGPASSWORD / PGPORT / PGDATABASE
#   - Optional: TABLES="public.cities public.city_metrics" to dump specific tables.
#
# Usage:
#   ./scripts/backupSupabase.sh
#   TABLES="public.cities public.city_metrics" ./scripts/backupSupabase.sh
#
# Output:
#   data/backup/<timestamp>/db.sql (full) or per-table .sql files

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump is required but not found in PATH" >&2
  exit 1
fi

# Connection string handling
PG_URI=${SUPABASE_DB_URL:-}

if [[ -z "$PG_URI" ]]; then
  # Rely on standard PG* env vars
  : "${PGHOST:?Missing PGHOST or SUPABASE_DB_URL}"
  : "${PGUSER:?Missing PGUSER or SUPABASE_DB_URL}"
  : "${PGPASSWORD:?Missing PGPASSWORD or SUPABASE_DB_URL}"
  : "${PGDATABASE:?Missing PGDATABASE or SUPABASE_DB_URL}"
fi

TABLES=${TABLES:-}
STAMP=$(date -u +"%Y%m%dT%H%M%SZ")
OUTDIR="data/backup/${STAMP}"
mkdir -p "$OUTDIR"

echo "Writing backups to ${OUTDIR}"

if [[ -z "$TABLES" ]]; then
  # Full database dump
  if [[ -n "$PG_URI" ]]; then
    pg_dump --no-owner --no-privileges "$PG_URI" > "${OUTDIR}/db.sql"
  else
    pg_dump --no-owner --no-privileges > "${OUTDIR}/db.sql"
  fi
  echo "Full database backup created: ${OUTDIR}/db.sql"
else
  # Per-table dumps
  for tbl in $TABLES; do
    fname=$(echo "$tbl" | tr '.' '_')
    if [[ -n "$PG_URI" ]]; then
      pg_dump --no-owner --no-privileges --table="$tbl" "$PG_URI" > "${OUTDIR}/${fname}.sql"
    else
      pg_dump --no-owner --no-privileges --table="$tbl" > "${OUTDIR}/${fname}.sql"
    fi
    echo "Table backup created: ${OUTDIR}/${fname}.sql"
  done
fi

echo "Done."

#!/usr/bin/env python3
"""
setup_supabase.py — one-shot, idempotent Supabase setup for bestcityspots.

Bootstraps a COMPLETELY BLANK Supabase project: extensions, base tables
(which have no CREATE TABLE statements elsewhere in the repo), every SQL file
under supabase/ in dependency order, RLS policies, city seed data from
data/worldcities.csv, and a final verification pass.

Usage:
    python scripts/setup_supabase.py [--skip-seed] [--csv data/worldcities.csv]

Requirements:
    python >= 3.9
    pip install "psycopg[binary]"      (or psycopg2-binary)

Environment (read from the shell, then .env.local / .env / .env.production):
    SUPABASE_DB_URL              full Postgres URL (preferred; e.g. the
                                 session-pooler URL from Dashboard → Connect)
      — or —
    NEXT_PUBLIC_SUPABASE_URL     https://<ref>.supabase.co
    SUPABASE_DB_PASSWORD         database password (Dashboard → Settings → Database)

    SUPABASE_SERVICE_ROLE_KEY    used for REST verification
    NEXT_PUBLIC_SUPABASE_ANON_KEY  optional: verifies anon RLS read path

Behavior:
    * Sequential steps; ANY failure prints which step failed and why, then
      exits non-zero (CI-friendly).
    * Idempotent: repo SQL files are applied once and recorded in
      public.setup_script_ledger; inline DDL uses IF NOT EXISTS; seeding
      upserts on conflict.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SUPABASE_DIR = REPO_ROOT / "supabase"

# Repo SQL files in dependency order. NOTE: harden_security.sql must precede
# fix_city_ai_insights_rls.sql (harden creates the policies that fix
# drops-and-recreates; the reverse order fails on duplicate policy names).
SQL_FILES_IN_ORDER = [
    "security.sql",
    "performance.sql",
    "city_metrics.sql",
    "city_ai_insights.sql",
    "cache_optimization.sql",
    "place_images_bucket.sql",
    "elastic_search.sql",
    "20260412_places_search_filters.sql",
    "visitor_analytics.sql",
    "analytics_functions.sql",
    "harden_security.sql",
    "fix_city_ai_insights_rls.sql",
    "20260311_places_cache_cost_optimization.sql",
    "migrations/202604241700_cache_schema_versions.sql",
    "migrations/202605080000_cities_slug_seo.sql",
    "migrations/202606111000_provider_budget_and_cache_idempotency.sql",
]

# Base tables that exist in production but have no CREATE TABLE in the repo
# (created manually before the SQL files were written). Everything in
# SQL_FILES_IN_ORDER assumes these exist. All statements are idempotent.
BASE_SCHEMA_SQL = """
create extension if not exists pg_trgm;
create extension if not exists unaccent schema public;

create table if not exists public.cities (
  id bigint primary key,
  city text not null,
  city_ascii text not null default '',
  lat double precision,
  lng double precision,
  country text not null default '',
  iso2 text not null default '',
  iso3 text not null default '',
  admin_name text not null default '',
  capital text not null default '',
  population bigint
);

create table if not exists public.city_places_cache (
  id bigint generated always as identity primary key,
  city_name text not null,
  place_type text not null,
  places_data jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint city_places_cache_city_name_place_type_key unique (city_name, place_type)
);

create table if not exists public.place_details_cache (
  place_id text primary key,
  details jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.city_weather_cache (
  city_id bigint primary key references public.cities (id) on delete cascade,
  temp double precision,
  feels_like double precision,
  temp_min double precision,
  temp_max double precision,
  humidity integer,
  description text,
  icon text,
  wind_speed double precision,
  aqi integer,
  aqi_label text,
  updated_at timestamptz not null default now()
);

-- RLS for city_weather_cache (no repo SQL file covers it): public read,
-- service_role writes — same posture as the other cache tables.
alter table public.city_weather_cache enable row level security;
drop policy if exists "city_weather_cache_select_public" on public.city_weather_cache;
create policy "city_weather_cache_select_public"
  on public.city_weather_cache for select to public using (true);
drop policy if exists "city_weather_cache_write_service_role" on public.city_weather_cache;
create policy "city_weather_cache_write_service_role"
  on public.city_weather_cache for all to service_role using (true) with check (true);

-- Ledger for idempotent application of repo SQL files.
create table if not exists public.setup_script_ledger (
  filename text primary key,
  checksum text not null,
  applied_at timestamptz not null default now()
);
alter table public.setup_script_ledger enable row level security;
"""

EXPECTED_TABLES = [
    "cities",
    "city_places_cache",
    "place_details_cache",
    "city_weather_cache",
    "city_metrics",
    "city_ai_insights",
    "cache_hit_stats",
    "city_search_aliases",
    "daily_visitor_stats",
    "traffic_sources_daily",
    "device_stats_daily",
    "geo_stats_daily",
    "city_views_daily",
    "user_actions_daily",
    "provider_daily_usage",
    "setup_script_ledger",
]

EXPECTED_FUNCTIONS = [
    "claim_provider_use",
    "get_provider_usage",
    "record_cache_event",
    "search_cities_elastic",
    "slugify_city",
    "cities_search_document_trigger",
]

# Tables that must have RLS enabled and at least one policy.
EXPECTED_RLS_TABLES = [
    "cities",
    "city_places_cache",
    "place_details_cache",
    "city_weather_cache",
    "city_ai_insights",
    "provider_daily_usage",
]


# ──────────────────────────── small utilities ────────────────────────────


def fail(step: str, why: str) -> "NoReturn":  # noqa: F821 (py3.9 compat)
    print(f"\n✗ FAILED at step: {step}\n  Reason: {why}", file=sys.stderr)
    print("  Halting — nothing after this step was executed.", file=sys.stderr)
    sys.exit(1)


def info(msg: str) -> None:
    print(msg, flush=True)


def load_dotenv_files() -> None:
    """Populate os.environ from .env.local / .env / .env.production
    (existing shell vars always win; first file to define a var wins next)."""
    for name in (".env.local", ".env", ".env.production"):
        path = REPO_ROOT / name
        if not path.is_file():
            continue
        for raw in path.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key, value = key.strip(), value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value


def build_db_url() -> str:
    url = os.environ.get("SUPABASE_DB_URL")
    if url:
        return url
    project_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
    password = os.environ.get("SUPABASE_DB_PASSWORD", "")
    match = re.match(r"https://([a-z0-9-]+)\.supabase\.co/?$", project_url.strip())
    if not match or not password:
        fail(
            "environment validation",
            "Set SUPABASE_DB_URL, or both NEXT_PUBLIC_SUPABASE_URL "
            "(https://<ref>.supabase.co) and SUPABASE_DB_PASSWORD. "
            "Find both under Dashboard → Settings → Database.",
        )
    ref = match.group(1)
    # Direct connection host. If your network is IPv4-only, use the session
    # pooler URL from the dashboard via SUPABASE_DB_URL instead.
    return f"postgresql://postgres:{password}@db.{ref}.supabase.co:5432/postgres"


def connect(db_url: str):
    """Return (connection, flavor) using psycopg v3 or psycopg2."""
    try:
        import psycopg  # type: ignore

        return psycopg.connect(db_url, autocommit=False, connect_timeout=15), "psycopg3"
    except ImportError:
        pass
    try:
        import psycopg2  # type: ignore

        conn = psycopg2.connect(db_url, connect_timeout=15)
        conn.autocommit = False
        return conn, "psycopg2"
    except ImportError:
        fail(
            "driver check",
            'No Postgres driver installed. Run: pip install "psycopg[binary]"',
        )


def run_sql(conn, sql: str) -> None:
    """Execute a (possibly multi-statement) SQL string in one transaction."""
    with conn.cursor() as cur:
        cur.execute(sql)
    conn.commit()


def query(conn, sql: str, params=None):
    with conn.cursor() as cur:
        cur.execute(sql, params or ())
        rows = cur.fetchall()
    conn.commit()
    return rows


# ─────────────────────────────── steps ───────────────────────────────────


def step_validate_env() -> str:
    load_dotenv_files()
    missing = [
        key
        for key in ("SUPABASE_SERVICE_ROLE_KEY",)
        if not os.environ.get(key)
    ]
    if missing:
        fail("environment validation", f"Missing required variables: {', '.join(missing)}")
    db_url = build_db_url()
    info("✓ Environment validated (DB credentials + service-role key present)")
    return db_url


def step_connect(db_url: str):
    try:
        conn, flavor = connect(db_url)
        rows = query(conn, "select current_database(), current_user, version()")
        db, user, version = rows[0]
        info(f"✓ Connected via {flavor}: db={db} user={user}")
        info(f"  {version.split(',')[0]}")
        return conn
    except SystemExit:
        raise
    except Exception as exc:  # connection/auth errors
        fail(
            "database connection",
            f"{exc}\n  Check SUPABASE_DB_URL / SUPABASE_DB_PASSWORD; if the direct "
            "host is unreachable (IPv4-only network), use the session pooler URL.",
        )


def step_base_schema(conn) -> None:
    try:
        run_sql(conn, BASE_SCHEMA_SQL)
        info("✓ Extensions + base tables (cities, 3 cache tables, ledger) ensured")
    except Exception as exc:
        conn.rollback()
        fail("base schema creation", str(exc))


def step_apply_sql_files(conn) -> None:
    applied = {
        row[0]: row[1]
        for row in query(conn, "select filename, checksum from public.setup_script_ledger")
    }
    for rel in SQL_FILES_IN_ORDER:
        path = SUPABASE_DIR / rel
        if not path.is_file():
            fail(f"apply {rel}", f"File not found: {path}")
        sql = path.read_text(encoding="utf-8")
        checksum = hashlib.sha256(sql.encode("utf-8")).hexdigest()[:16]

        if rel in applied:
            marker = "" if applied[rel] == checksum else "  (warning: file changed since)"
            info(f"– Skipping {rel}: already applied{marker}")
            continue

        try:
            run_sql(conn, sql)
            run_sql(
                conn,
                "insert into public.setup_script_ledger (filename, checksum) "
                f"values ('{rel}', '{checksum}') on conflict (filename) do nothing",
            )
            info(f"✓ Applied {rel}")
        except Exception as exc:
            conn.rollback()
            fail(f"apply {rel}", str(exc))


def step_seed_cities(conn, csv_path: Path) -> None:
    if not csv_path.is_file():
        fail("seed cities", f"CSV not found: {csv_path}")

    def parse_rows():
        with open(csv_path, newline="", encoding="utf-8") as fh:
            for rec in csv.DictReader(fh):
                try:
                    city_id = int(rec.get("id", ""))
                except (TypeError, ValueError):
                    continue

                def num(key, cast):
                    try:
                        value = cast(rec.get(key, ""))
                        return value if value else None  # mirror seed-cities.ts (`|| null`)
                    except (TypeError, ValueError):
                        return None

                yield (
                    city_id,
                    rec.get("city", ""),
                    rec.get("city_ascii", ""),
                    num("lat", float),
                    num("lng", float),
                    rec.get("country", ""),
                    rec.get("iso2", ""),
                    rec.get("iso3", ""),
                    rec.get("admin_name", ""),
                    rec.get("capital", ""),
                    num("population", int),
                )

    columns = "id, city, city_ascii, lat, lng, country, iso2, iso3, admin_name, capital, population"
    try:
        with conn.cursor() as cur:
            cur.execute(
                f"create temp table tmp_cities (like public.cities including defaults) on commit drop"
            )
            copy_sql = f"copy tmp_cities ({columns}) from stdin"
            count = 0
            if hasattr(cur, "copy"):  # psycopg3
                with cur.copy(copy_sql) as cp:
                    for row in parse_rows():
                        cp.write_row(row)
                        count += 1
            else:  # psycopg2
                buf = io.StringIO()
                writer = csv.writer(buf)
                for row in parse_rows():
                    writer.writerow(["\\N" if v is None else v for v in row])
                    count += 1
                buf.seek(0)
                cur.copy_expert(f"{copy_sql} with (format csv, null '\\N')", buf)
            cur.execute(
                f"""
                insert into public.cities ({columns})
                select {columns} from tmp_cities
                on conflict (id) do update set
                  city = excluded.city, city_ascii = excluded.city_ascii,
                  lat = excluded.lat, lng = excluded.lng,
                  country = excluded.country, iso2 = excluded.iso2,
                  iso3 = excluded.iso3, admin_name = excluded.admin_name,
                  capital = excluded.capital, population = excluded.population
                """
            )
        conn.commit()
        total = query(conn, "select count(*) from public.cities")[0][0]
        info(f"✓ Seeded cities: {count} rows processed, table now holds {total}")
    except SystemExit:
        raise
    except Exception as exc:
        conn.rollback()
        fail("seed cities", str(exc))


def step_verify(conn) -> None:
    problems = []

    rows = query(
        conn,
        "select tablename from pg_tables where schemaname = 'public'",
    )
    tables = {r[0] for r in rows}
    for t in EXPECTED_TABLES:
        if t not in tables:
            problems.append(f"missing table: public.{t}")

    rows = query(
        conn,
        "select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace "
        "where n.nspname = 'public'",
    )
    functions = {r[0] for r in rows}
    for f in EXPECTED_FUNCTIONS:
        if f not in functions:
            problems.append(f"missing function: public.{f}()")

    rows = query(
        conn,
        "select c.relname, c.relrowsecurity, count(p.policyname) "
        "from pg_class c join pg_namespace n on n.oid = c.relnamespace "
        "left join pg_policies p on p.tablename = c.relname and p.schemaname = 'public' "
        "where n.nspname = 'public' and c.relkind = 'r' "
        "group by c.relname, c.relrowsecurity",
    )
    rls = {r[0]: (r[1], r[2]) for r in rows}
    for t in EXPECTED_RLS_TABLES:
        enabled, policy_count = rls.get(t, (False, 0))
        if not enabled:
            problems.append(f"RLS not enabled on public.{t}")
        if t != "setup_script_ledger" and policy_count == 0:
            problems.append(f"no policies on public.{t}")

    # Functional smoke checks (read-only / reversible).
    try:
        n = query(conn, "select count(*) from public.cities")[0][0]
        if n == 0:
            problems.append("cities table is empty (seed step skipped or failed)")
        query(conn, "select * from public.get_provider_usage(current_date)")
        query(conn, "select public.slugify_city('Test City', 'Testland')")
    except Exception as exc:
        problems.append(f"functional check failed: {exc}")

    if problems:
        fail("post-setup verification", "\n  - " + "\n  - ".join(problems))
    info(f"✓ Verification passed: {len(EXPECTED_TABLES)} tables, "
         f"{len(EXPECTED_FUNCTIONS)} functions, RLS on {len(EXPECTED_RLS_TABLES)} tables")


def step_verify_rest() -> None:
    """Verify PostgREST + RLS posture over HTTP (uses stdlib only)."""
    base = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
    anon = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    service = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not base:
        info("– Skipping REST verification (NEXT_PUBLIC_SUPABASE_URL not set)")
        return

    def get(path: str, key: str) -> tuple[int, str]:
        req = urllib.request.Request(
            f"{base}{path}", headers={"apikey": key, "Authorization": f"Bearer {key}"}
        )
        try:
            with urllib.request.urlopen(req, timeout=15) as res:
                return res.status, res.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            return e.code, e.read().decode("utf-8", "replace")

    try:
        status, body = get("/rest/v1/cities?select=id&limit=1", service)
        if status != 200 or not json.loads(body):
            fail("REST verification", f"service-role read of cities failed: HTTP {status} {body[:200]}")
        if anon:
            status, body = get("/rest/v1/cities?select=id&limit=1", anon)
            if status != 200:
                fail("REST verification", f"anon read of cities failed: HTTP {status} — check RLS select policy")
            status, body = get("/rest/v1/provider_daily_usage?select=provider&limit=1", anon)
            if status == 200 and json.loads(body):
                fail(
                    "REST verification",
                    "anon role can read provider_daily_usage — RLS misconfigured "
                    "(must be service_role only)",
                )
        info("✓ REST verification passed (service-role reads OK, anon posture correct)")
    except SystemExit:
        raise
    except Exception as exc:
        fail("REST verification", str(exc))


# ─────────────────────────────── main ────────────────────────────────────


def main() -> None:
    parser = argparse.ArgumentParser(description="Bootstrap Supabase for bestcityspots")
    parser.add_argument("--skip-seed", action="store_true", help="skip city seeding")
    parser.add_argument(
        "--csv",
        default=str(REPO_ROOT / "data" / "worldcities.csv"),
        help="path to worldcities.csv (default: data/worldcities.csv)",
    )
    args = parser.parse_args()

    steps = 7
    info(f"bestcityspots Supabase setup — {steps} steps\n")

    info(f"[1/{steps}] Validating environment…")
    db_url = step_validate_env()

    info(f"[2/{steps}] Connecting to database…")
    conn = step_connect(db_url)

    info(f"[3/{steps}] Creating extensions + base tables…")
    step_base_schema(conn)

    info(f"[4/{steps}] Applying repo SQL files (schema, indexes, RLS, functions)…")
    step_apply_sql_files(conn)

    info(f"[5/{steps}] Seeding reference data…")
    if args.skip_seed:
        info("– Skipped (--skip-seed)")
    else:
        step_seed_cities(conn, Path(args.csv))

    info(f"[6/{steps}] Verifying schema, functions, and RLS…")
    step_verify(conn)

    info(f"[7/{steps}] Verifying REST API + RLS posture…")
    step_verify_rest()

    conn.close()
    info("\n✓ Supabase setup complete. Safe to re-run at any time.")


if __name__ == "__main__":
    main()

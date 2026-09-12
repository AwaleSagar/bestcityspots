-- bestcityspots — one-shot Supabase setup (generated 2026-06-12)
-- Paste into Dashboard → SQL Editor → Run. For a BLANK project only:
-- some files create policies non-idempotently, so re-running this whole
-- file on an existing schema will error (use scripts/setup_supabase.py
-- for idempotent re-runs). Seed cities afterwards with:
--   npx tsx scripts/seed-cities.ts data/worldcities.csv

-- ═══ 0. Extensions + base tables (from setup_supabase.py) ═══

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



-- ═══ security.sql ═══
-- Supabase/Postgres hardening: RLS + least-privilege policies.
-- Run these in Supabase SQL Editor (adjust table/schema names as needed).

-- 1) Ensure the table isn't writable from the client by default
--    (RLS blocks access unless a policy allows it).
alter table public.cities enable row level security;

-- Optional: If you previously disabled RLS, re-enable it.
-- alter table public.cities force row level security;

-- 2) Drop overly-permissive policies (if any exist).
-- NOTE: You must replace policy names with your actual ones if they differ.
-- drop policy if exists "Enable read access for all users" on public.cities;
-- drop policy if exists "Public cities read" on public.cities;
-- drop policy if exists "Public cities write" on public.cities;

-- 3) Allow ONLY read access (SELECT) from anon/authenticated.
--    If your cities table is public data, this is a safe default.
create policy "cities_select_anon_auth"
on public.cities
for select
to anon, authenticated
using (true);

-- 4) Explicitly prevent writes from anon/authenticated (defense in depth).
create policy "cities_no_insert"
on public.cities
for insert
to anon, authenticated
with check (false);

create policy "cities_no_update"
on public.cities
for update
to anon, authenticated
using (false);

create policy "cities_no_delete"
on public.cities
for delete
to anon, authenticated
using (false);

-- 5) Recommended: lock down sensitive columns if you add any later
--    (PII, internal notes, etc.). Prefer a VIEW or an RPC that only returns safe fields.
-- Example:
-- create view public.cities_public as
--   select id, city, city_ascii, country, population from public.cities;
-- alter view public.cities_public set (security_barrier = true);

-- 6) Client key safety:
-- - NEXT_PUBLIC_SUPABASE_ANON_KEY is meant to be public; security comes from RLS.
-- - NEVER ship service_role key to the browser; use it only on server (if at all).




-- ═══ performance.sql ═══
-- Performance indexes for Supabase/Postgres.
-- Run these in Supabase SQL Editor (adjust schema/table names if needed).

-- 1) Speed up "top cities" queries:
--    select ... from public.cities order by population desc limit 10;
create index if not exists cities_population_desc_idx
on public.cities (population desc nulls last);

-- Optional: a covering index (helps index-only scans for "top 10" if you always select these columns)
-- (Safe to keep both; you can drop the non-covering one later if desired.)
create index if not exists cities_population_desc_cover_idx
on public.cities (population desc nulls last)
include (id, city, city_ascii, country);

-- 2) Speed up ILIKE searches such as:
--    where city_ascii ilike '%tok%'
-- Requires pg_trgm. This keeps your current "contains" matching fast.
create extension if not exists pg_trgm;

create index if not exists cities_city_ascii_trgm_idx
on public.cities using gin (city_ascii gin_trgm_ops);

-- Optional (if you also search the display name):
-- create index if not exists cities_city_trgm_idx
-- on public.cities using gin (city gin_trgm_ops);

-- Refresh planner statistics after creating indexes (recommended)
analyze public.cities;



-- ═══ city_metrics.sql ═══
-- Core Metrics store (free/open feeds). Run in Supabase SQL.

create table if not exists public.city_metrics (
  city_id integer primary key references public.cities(id) on delete cascade,
  cost_index numeric,
  connectivity_mbps numeric,
  safety_score numeric,
  pollution_pm25 numeric,
  climate_comfort text,
  health_access_per_100k numeric,
  source jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.city_metrics enable row level security;

drop policy if exists city_metrics_select on public.city_metrics;
create policy city_metrics_select
on public.city_metrics
for select
to anon, authenticated
using (true);

drop policy if exists city_metrics_upsert on public.city_metrics;
create policy city_metrics_upsert
on public.city_metrics
for insert
to service_role
with check (true);

drop policy if exists city_metrics_update on public.city_metrics;
create policy city_metrics_update
on public.city_metrics
for update
to service_role
using (true);

create index if not exists city_metrics_updated_at_idx on public.city_metrics (updated_at desc);



-- ═══ city_ai_insights.sql ═══
-- City AI insights cache (1-year TTL) for Gemini-generated intros/attractions/seasons/weather.

create table if not exists public.city_ai_insights (
  city_id integer primary key references public.cities(id) on delete cascade,
  city_name text not null,
  country text,
  intro text,
  attractions jsonb,
  seasons jsonb,
  weather jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.city_ai_insights enable row level security;

-- Read for everyone (safe public content).
drop policy if exists city_ai_insights_select on public.city_ai_insights;
create policy city_ai_insights_select
on public.city_ai_insights
for select
to anon, authenticated
using (true);

-- Writes restricted to service_role. The anon key ships to browsers, so
-- permitting anon writes would allow stored content injection. Server write
-- paths use the service-role client via requireServerClient().
drop policy if exists city_ai_insights_insert on public.city_ai_insights;
create policy city_ai_insights_insert
on public.city_ai_insights
for insert
to service_role
with check (true);

drop policy if exists city_ai_insights_update on public.city_ai_insights;
create policy city_ai_insights_update
on public.city_ai_insights
for update
to service_role
using (true)
with check (true);

create index if not exists city_ai_insights_updated_at_idx on public.city_ai_insights (updated_at desc);



-- ═══ cache_optimization.sql ═══
-- =============================================================================
-- Cache Optimization Migrations
-- Applies: cache_hit_stats table, record_cache_event() tracking function
-- =============================================================================

-- 1. Cache hit/miss tracking table (aggregated by date + cache type)
CREATE TABLE IF NOT EXISTS public.cache_hit_stats (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_date date NOT NULL DEFAULT CURRENT_DATE,
  cache_type text NOT NULL,
  hit_count bigint NOT NULL DEFAULT 0,
  miss_count bigint NOT NULL DEFAULT 0,
  UNIQUE (event_date, cache_type)
);

ALTER TABLE public.cache_hit_stats ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_cache_hit_stats_date_type
  ON public.cache_hit_stats (event_date, cache_type);

-- 2. Lightweight RPC to record a cache hit or miss.
--    Called from application code: supabase.rpc('record_cache_event', { p_cache_type, p_is_hit })
CREATE OR REPLACE FUNCTION public.record_cache_event(
  p_cache_type text,
  p_is_hit boolean
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.cache_hit_stats (event_date, cache_type, hit_count, miss_count)
  VALUES (
    CURRENT_DATE,
    p_cache_type,
    CASE WHEN p_is_hit THEN 1 ELSE 0 END,
    CASE WHEN p_is_hit THEN 0 ELSE 1 END
  )
  ON CONFLICT (event_date, cache_type)
  DO UPDATE SET
    hit_count  = cache_hit_stats.hit_count  + EXCLUDED.hit_count,
    miss_count = cache_hit_stats.miss_count + EXCLUDED.miss_count;
END;
$$;

-- =============================================================================
-- Notes on application-level changes (not SQL):
--
-- * src/lib/cache-config.ts: Centralized TTL constants
--     PLACES_FRESH_DAYS: 30, PLACES_SOFT_REFRESH_DAYS: 7
--     INSIGHTS_FRESH_DAYS: 365, WEATHER_FRESH_MINUTES: 60
--     METRICS_FRESH_MINUTES: 60, TRENDING_FRESH_HOURS: 24
--
-- * src/lib/metrics.ts: Fixed write-back to city_metrics + 60-min TTL + SWR
-- * src/lib/weather.ts: Added stale-while-revalidate pattern
-- * src/lib/places.ts: Extended TTL to 30 days + soft-refresh at 7 days
-- * src/app/cities/[id]/page.tsx: Parallelized getCityMetrics + getCityWeather
-- =============================================================================



-- ═══ place_images_bucket.sql ═══
-- Place images bucket for caching Google Places photos.
-- Run in Supabase SQL Editor (Dashboard > SQL Editor).
-- Bucket is public for read; uploads require service_role or RLS policy below.

insert into storage.buckets (id, name, public)
values ('place_images', 'place_images', true)
on conflict (id) do update set public = true;

-- Allow public read (default for public buckets).
-- Allow service_role and authenticated uploads for place image caching.
drop policy if exists "place_images_public_read" on storage.objects;
create policy "place_images_public_read"
on storage.objects for select
to public
using (bucket_id = 'place_images');

drop policy if exists "place_images_upload" on storage.objects;
create policy "place_images_upload"
on storage.objects for insert
to authenticated, service_role
with check (bucket_id = 'place_images');



-- ═══ elastic_search.sql ═══
-- =============================================================================
-- Elastic Search Engine for BestCitySpots
-- PostgreSQL full-text search + trigram fuzzy matching + alias lookup
-- =============================================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent SCHEMA public;

-- 2. Immutable unaccent wrapper (required for use in index expressions / triggers)
CREATE OR REPLACE FUNCTION public.f_unaccent(text)
RETURNS text AS $$
  SELECT public.unaccent('public.unaccent', $1)
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT;

-- 3. Add tsvector column
ALTER TABLE public.cities ADD COLUMN IF NOT EXISTS search_document tsvector;

-- 4. Trigger: rebuild search_document on cities INSERT/UPDATE (includes AI insights)
CREATE OR REPLACE FUNCTION public.cities_search_document_trigger()
RETURNS trigger AS $$
DECLARE
  ai_intro text;
  ai_attractions text;
BEGIN
  SELECT
    coalesce(i.intro, ''),
    coalesce((SELECT string_agg(elem->>'name', ' ') FROM jsonb_array_elements(i.attractions) AS elem), '')
  INTO ai_intro, ai_attractions
  FROM public.city_ai_insights i
  WHERE i.city_id = NEW.id;

  IF ai_intro IS NULL THEN ai_intro := ''; END IF;
  IF ai_attractions IS NULL THEN ai_attractions := ''; END IF;

  NEW.search_document :=
    setweight(to_tsvector('english', coalesce(public.f_unaccent(NEW.city), '')), 'A') ||
    setweight(to_tsvector('english', coalesce(public.f_unaccent(NEW.city_ascii), '')), 'A') ||
    setweight(to_tsvector('english', coalesce(public.f_unaccent(NEW.country), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(public.f_unaccent(NEW.admin_name), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.capital, '')), 'B') ||
    setweight(to_tsvector('english', public.f_unaccent(ai_intro)), 'C') ||
    setweight(to_tsvector('english', public.f_unaccent(ai_attractions)), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cities_search_document ON public.cities;
CREATE TRIGGER trg_cities_search_document
  BEFORE INSERT OR UPDATE ON public.cities
  FOR EACH ROW
  EXECUTE FUNCTION public.cities_search_document_trigger();

-- 5. Sync trigger: when AI insights change, refresh the parent city's search_document
CREATE OR REPLACE FUNCTION public.city_ai_insights_search_sync()
RETURNS trigger AS $$
BEGIN
  UPDATE public.cities SET city = city WHERE id = NEW.city_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ai_insights_search_sync ON public.city_ai_insights;
CREATE TRIGGER trg_ai_insights_search_sync
  AFTER INSERT OR UPDATE ON public.city_ai_insights
  FOR EACH ROW
  EXECUTE FUNCTION public.city_ai_insights_search_sync();

-- 6. Aliases table for abbreviations, alt names, and common misspellings
CREATE TABLE IF NOT EXISTS public.city_search_aliases (
  alias text NOT NULL,
  city_id bigint NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  PRIMARY KEY (alias, city_id)
);

ALTER TABLE public.city_search_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on city_search_aliases"
  ON public.city_search_aliases FOR SELECT
  TO anon, authenticated
  USING (true);

-- 7. Indexes
CREATE INDEX IF NOT EXISTS cities_search_document_idx
  ON public.cities USING gin (search_document);

CREATE INDEX IF NOT EXISTS cities_country_trgm_idx
  ON public.cities USING gin (country gin_trgm_ops);

CREATE INDEX IF NOT EXISTS city_search_aliases_alias_trgm_idx
  ON public.city_search_aliases USING gin (alias gin_trgm_ops);

CREATE INDEX IF NOT EXISTS city_search_aliases_alias_idx
  ON public.city_search_aliases (alias);

-- 8. The elastic search RPC function (3-tier: FTS + fuzzy + alias)
CREATE OR REPLACE FUNCTION public.search_cities_elastic(
  query text,
  result_limit int DEFAULT 10
)
RETURNS TABLE (
  id bigint,
  city text,
  city_ascii text,
  lat double precision,
  lng double precision,
  country text,
  iso2 text,
  iso3 text,
  admin_name text,
  capital text,
  population bigint,
  rank_score real,
  match_type text
) LANGUAGE plpgsql STABLE AS $$
DECLARE
  clean_query text;
  tsq tsquery;
  safe_limit int;
BEGIN
  safe_limit := LEAST(GREATEST(result_limit, 1), 50);
  clean_query := lower(trim(public.f_unaccent(query)));

  IF length(clean_query) < 1 THEN
    RETURN;
  END IF;

  BEGIN
    tsq := phraseto_tsquery('english', clean_query);
    IF tsq IS NULL OR tsq = ''::tsquery THEN
      tsq := plainto_tsquery('english', clean_query);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    tsq := plainto_tsquery('english', clean_query);
  END;

  RETURN QUERY
  WITH
  -- Tier 1: Full-text search on search_document
  fts AS (
    SELECT
      c.id, c.city, c.city_ascii, c.lat, c.lng, c.country,
      c.iso2, c.iso3, c.admin_name, c.capital, c.population,
      ts_rank_cd(c.search_document, tsq, 32) AS fts_rank,
      'fts'::text AS mt
    FROM public.cities c
    WHERE c.search_document @@ tsq
      AND tsq IS NOT NULL AND tsq != ''::tsquery
    ORDER BY ts_rank_cd(c.search_document, tsq, 32) DESC,
             c.population DESC NULLS LAST
    LIMIT safe_limit
  ),

  -- Tier 2: Trigram fuzzy match on city_ascii and country
  fuzzy AS (
    SELECT
      c.id, c.city, c.city_ascii, c.lat, c.lng, c.country,
      c.iso2, c.iso3, c.admin_name, c.capital, c.population,
      GREATEST(
        similarity(lower(c.city_ascii), clean_query),
        similarity(lower(c.country), clean_query),
        word_similarity(clean_query, lower(c.city_ascii))
      ) AS trgm_score,
      'fuzzy'::text AS mt
    FROM public.cities c
    WHERE c.id NOT IN (SELECT f.id FROM fts f)
      AND (
        lower(c.city_ascii) % clean_query
        OR lower(c.country) % clean_query
        OR clean_query <% lower(c.city_ascii)
      )
    ORDER BY GREATEST(
      similarity(lower(c.city_ascii), clean_query),
      similarity(lower(c.country), clean_query),
      word_similarity(clean_query, lower(c.city_ascii))
    ) DESC,
    c.population DESC NULLS LAST
    LIMIT safe_limit
  ),

  -- Tier 3: Alias lookup
  alias_matches AS (
    SELECT
      c.id, c.city, c.city_ascii, c.lat, c.lng, c.country,
      c.iso2, c.iso3, c.admin_name, c.capital, c.population,
      similarity(a.alias, clean_query) AS alias_score,
      'alias'::text AS mt
    FROM public.city_search_aliases a
    JOIN public.cities c ON c.id = a.city_id
    WHERE a.alias % clean_query
       OR a.alias ILIKE clean_query || '%'
       OR clean_query ILIKE a.alias || '%'
  ),

  -- Combine all tiers with unified scoring
  combined AS (
    SELECT *, fts_rank AS raw_score FROM fts
    UNION ALL
    SELECT *, trgm_score AS raw_score FROM fuzzy
    UNION ALL
    SELECT *, alias_score AS raw_score FROM alias_matches
  ),

  -- Deduplicate: keep the best match_type per city
  deduped AS (
    SELECT DISTINCT ON (cb.id)
      cb.id, cb.city, cb.city_ascii, cb.lat, cb.lng, cb.country,
      cb.iso2, cb.iso3, cb.admin_name, cb.capital, cb.population,
      cb.mt,
      (cb.raw_score::real + (ln(GREATEST(cb.population, 1)) / 40.0)::real) AS final_score
    FROM combined cb
    ORDER BY cb.id, cb.raw_score DESC
  )

  SELECT
    d.id, d.city, d.city_ascii, d.lat, d.lng, d.country,
    d.iso2, d.iso3, d.admin_name, d.capital, d.population,
    d.final_score AS rank_score,
    d.mt AS match_type
  FROM deduped d
  ORDER BY d.final_score DESC, d.population DESC NULLS LAST
  LIMIT safe_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_cities_elastic(text, int) TO anon, authenticated;

-- 9. Backfill: touch all cities to populate search_document via trigger
-- UPDATE public.cities SET city = city;
-- ANALYZE public.cities;



-- ═══ 20260412_places_search_filters.sql ═══
-- Improve query performance for city/type cache lookups and JSONB filter scans.
-- Additive-only migration.

CREATE INDEX IF NOT EXISTS idx_city_places_cache_city_type_updated
  ON public.city_places_cache (city_name, place_type, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_city_places_cache_city_lower
  ON public.city_places_cache (lower(city_name));

CREATE INDEX IF NOT EXISTS idx_city_places_cache_places_data_gin
  ON public.city_places_cache
  USING GIN (places_data jsonb_path_ops);



-- ═══ visitor_analytics.sql ═══
-- Visitor Analytics Tables for Marketing Team
-- Aggregate-focused tables storing daily summaries (privacy-friendly)
-- Run in Supabase SQL Editor or via MCP

-- ============================================
-- 1. DAILY VISITOR STATS - Core daily metrics
-- ============================================
create table if not exists public.daily_visitor_stats (
  stat_date date primary key,
  total_visits integer not null default 0,
  unique_visitors integer not null default 0,
  page_views integer not null default 0,
  avg_session_duration_sec integer default 0,
  bounce_rate_pct integer default 0,
  new_visitors integer not null default 0,
  returning_visitors integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.daily_visitor_stats is 'Core daily visitor metrics for marketing analytics';

-- ============================================
-- 2. TRAFFIC SOURCES DAILY - Where visitors come from
-- ============================================
create table if not exists public.traffic_sources_daily (
  id bigint generated always as identity primary key,
  stat_date date not null,
  source_type text not null check (source_type in ('organic', 'social', 'referral', 'direct', 'paid', 'email', 'other')),
  source_name text not null,
  visits integer not null default 0,
  unique_visitors integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  
  unique (stat_date, source_type, source_name)
);

comment on table public.traffic_sources_daily is 'Daily breakdown of traffic by source (Google, Facebook, direct, etc.)';

-- ============================================
-- 3. DEVICE STATS DAILY - Device breakdown
-- ============================================
create table if not exists public.device_stats_daily (
  id bigint generated always as identity primary key,
  stat_date date not null,
  device_type text not null check (device_type in ('desktop', 'mobile', 'tablet', 'other')),
  browser text,
  os text,
  visits integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  
  unique (stat_date, device_type, browser, os)
);

comment on table public.device_stats_daily is 'Daily breakdown of visitors by device, browser, and OS';

-- ============================================
-- 4. GEO STATS DAILY - Geographic distribution (consent-based)
-- ============================================
create table if not exists public.geo_stats_daily (
  id bigint generated always as identity primary key,
  stat_date date not null,
  country_code text not null,
  country_name text not null,
  city text,
  visits integer not null default 0,
  unique_visitors integer not null default 0,
  consent_based boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  
  unique (stat_date, country_code, city)
);

comment on table public.geo_stats_daily is 'Daily geographic distribution of visitors (collected with consent)';

-- ============================================
-- 5. CITY VIEWS DAILY - Which cities users explore
-- ============================================
create table if not exists public.city_views_daily (
  id bigint generated always as identity primary key,
  stat_date date not null,
  city_id integer not null references public.cities(id) on delete cascade,
  views integer not null default 0,
  unique_viewers integer not null default 0,
  saves integer not null default 0,
  notes_added integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  
  unique (stat_date, city_id)
);

comment on table public.city_views_daily is 'Daily stats for which cities users are exploring on the platform';

-- ============================================
-- 6. USER ACTIONS DAILY - Aggregate user behavior
-- ============================================
create table if not exists public.user_actions_daily (
  id bigint generated always as identity primary key,
  stat_date date not null,
  action_type text not null check (action_type in (
    'search',
    'save_place',
    'remove_save',
    'add_note',
    'delete_note',
    'view_guide',
    'view_city',
    'click_maps_link',
    'share',
    'download_itinerary'
  )),
  action_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  
  unique (stat_date, action_type)
);

comment on table public.user_actions_daily is 'Daily aggregate counts of user actions for behavior analytics';

-- ============================================
-- INDEXES for fast date-range queries
-- ============================================
create index if not exists daily_visitor_stats_date_idx 
  on public.daily_visitor_stats (stat_date desc);

create index if not exists traffic_sources_daily_date_idx 
  on public.traffic_sources_daily (stat_date desc);

create index if not exists traffic_sources_daily_source_idx 
  on public.traffic_sources_daily (source_type, source_name);

create index if not exists device_stats_daily_date_idx 
  on public.device_stats_daily (stat_date desc);

create index if not exists device_stats_daily_device_idx 
  on public.device_stats_daily (device_type);

create index if not exists geo_stats_daily_date_idx 
  on public.geo_stats_daily (stat_date desc);

create index if not exists geo_stats_daily_country_idx 
  on public.geo_stats_daily (country_code);

create index if not exists city_views_daily_date_idx 
  on public.city_views_daily (stat_date desc);

create index if not exists city_views_daily_city_idx 
  on public.city_views_daily (city_id);

create index if not exists city_views_daily_views_idx 
  on public.city_views_daily (views desc);

create index if not exists user_actions_daily_date_idx 
  on public.user_actions_daily (stat_date desc);

create index if not exists user_actions_daily_action_idx 
  on public.user_actions_daily (action_type);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
alter table public.daily_visitor_stats enable row level security;
alter table public.traffic_sources_daily enable row level security;
alter table public.device_stats_daily enable row level security;
alter table public.geo_stats_daily enable row level security;
alter table public.city_views_daily enable row level security;
alter table public.user_actions_daily enable row level security;

-- SELECT policies: Only authenticated users (marketing team) can read
drop policy if exists daily_visitor_stats_select on public.daily_visitor_stats;
create policy daily_visitor_stats_select on public.daily_visitor_stats
  for select to authenticated using (true);

drop policy if exists traffic_sources_daily_select on public.traffic_sources_daily;
create policy traffic_sources_daily_select on public.traffic_sources_daily
  for select to authenticated using (true);

drop policy if exists device_stats_daily_select on public.device_stats_daily;
create policy device_stats_daily_select on public.device_stats_daily
  for select to authenticated using (true);

drop policy if exists geo_stats_daily_select on public.geo_stats_daily;
create policy geo_stats_daily_select on public.geo_stats_daily
  for select to authenticated using (true);

drop policy if exists city_views_daily_select on public.city_views_daily;
create policy city_views_daily_select on public.city_views_daily
  for select to authenticated using (true);

drop policy if exists user_actions_daily_select on public.user_actions_daily;
create policy user_actions_daily_select on public.user_actions_daily
  for select to authenticated using (true);

-- INSERT policies: Only service_role (backend API) can write
drop policy if exists daily_visitor_stats_insert on public.daily_visitor_stats;
create policy daily_visitor_stats_insert on public.daily_visitor_stats
  for insert to service_role with check (true);

drop policy if exists traffic_sources_daily_insert on public.traffic_sources_daily;
create policy traffic_sources_daily_insert on public.traffic_sources_daily
  for insert to service_role with check (true);

drop policy if exists device_stats_daily_insert on public.device_stats_daily;
create policy device_stats_daily_insert on public.device_stats_daily
  for insert to service_role with check (true);

drop policy if exists geo_stats_daily_insert on public.geo_stats_daily;
create policy geo_stats_daily_insert on public.geo_stats_daily
  for insert to service_role with check (true);

drop policy if exists city_views_daily_insert on public.city_views_daily;
create policy city_views_daily_insert on public.city_views_daily
  for insert to service_role with check (true);

drop policy if exists user_actions_daily_insert on public.user_actions_daily;
create policy user_actions_daily_insert on public.user_actions_daily
  for insert to service_role with check (true);

-- UPDATE policies: Only service_role can update
drop policy if exists daily_visitor_stats_update on public.daily_visitor_stats;
create policy daily_visitor_stats_update on public.daily_visitor_stats
  for update to service_role using (true);

drop policy if exists traffic_sources_daily_update on public.traffic_sources_daily;
create policy traffic_sources_daily_update on public.traffic_sources_daily
  for update to service_role using (true);

drop policy if exists device_stats_daily_update on public.device_stats_daily;
create policy device_stats_daily_update on public.device_stats_daily
  for update to service_role using (true);

drop policy if exists geo_stats_daily_update on public.geo_stats_daily;
create policy geo_stats_daily_update on public.geo_stats_daily
  for update to service_role using (true);

drop policy if exists city_views_daily_update on public.city_views_daily;
create policy city_views_daily_update on public.city_views_daily
  for update to service_role using (true);

drop policy if exists user_actions_daily_update on public.user_actions_daily;
create policy user_actions_daily_update on public.user_actions_daily
  for update to service_role using (true);

-- ============================================
-- HELPER FUNCTION: Update timestamp on modification
-- ============================================
create or replace function public.update_analytics_timestamp()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

-- Trigger for daily_visitor_stats (only table with updated_at)
drop trigger if exists daily_visitor_stats_updated_at on public.daily_visitor_stats;
create trigger daily_visitor_stats_updated_at
  before update on public.daily_visitor_stats
  for each row execute function public.update_analytics_timestamp();



-- ═══ analytics_functions.sql ═══
-- Analytics RPC Functions for atomic upserts
-- These functions handle concurrent writes safely with ON CONFLICT

-- =============================================================================
-- 1. Upsert Daily Visitor Stats
-- =============================================================================
create or replace function public.upsert_daily_visitor_stats(
  p_date date,
  p_visits integer,
  p_unique integer,
  p_pageviews integer,
  p_duration integer,
  p_bounce integer,
  p_new integer,
  p_returning integer
)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.daily_visitor_stats (
    stat_date, 
    total_visits, 
    unique_visitors, 
    page_views,
    avg_session_duration_sec,
    bounce_rate_pct,
    new_visitors,
    returning_visitors
  )
  values (
    p_date, 
    p_visits, 
    p_unique, 
    p_pageviews,
    p_duration,
    -- Bounce rate is a per-SESSION metric: the denominator is the session
    -- count (p_unique), never pageviews (p_visits). The merges below weight
    -- by unique_visitors for the same reason.
    case when p_unique > 0 then (p_bounce * 100 / p_unique) else 0 end,
    p_new,
    p_returning
  )
  on conflict (stat_date)
  do update set
    total_visits = daily_visitor_stats.total_visits + excluded.total_visits,
    unique_visitors = daily_visitor_stats.unique_visitors + excluded.unique_visitors,
    page_views = daily_visitor_stats.page_views + excluded.page_views,
    avg_session_duration_sec = case 
      when daily_visitor_stats.unique_visitors + excluded.unique_visitors > 0 
      then ((daily_visitor_stats.avg_session_duration_sec * daily_visitor_stats.unique_visitors) + 
            (excluded.avg_session_duration_sec * excluded.unique_visitors)) / 
           (daily_visitor_stats.unique_visitors + excluded.unique_visitors)
      else 0 
    end,
    bounce_rate_pct = case 
      when daily_visitor_stats.unique_visitors + excluded.unique_visitors > 0 
      then ((daily_visitor_stats.bounce_rate_pct * daily_visitor_stats.unique_visitors) + 
            (excluded.bounce_rate_pct * excluded.unique_visitors)) / 
           (daily_visitor_stats.unique_visitors + excluded.unique_visitors)
      else 0 
    end,
    new_visitors = daily_visitor_stats.new_visitors + excluded.new_visitors,
    returning_visitors = daily_visitor_stats.returning_visitors + excluded.returning_visitors,
    updated_at = timezone('utc', now());
end;
$$;

-- =============================================================================
-- 2. Upsert Traffic Sources
-- =============================================================================
create or replace function public.upsert_traffic_source(
  p_date date,
  p_source_type text,
  p_source_name text,
  p_visits integer default 1,
  p_unique integer default 1
)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.traffic_sources_daily (
    stat_date,
    source_type,
    source_name,
    visits,
    unique_visitors
  )
  values (p_date, p_source_type, p_source_name, p_visits, p_unique)
  on conflict (stat_date, source_type, source_name)
  do update set
    visits = traffic_sources_daily.visits + excluded.visits,
    unique_visitors = traffic_sources_daily.unique_visitors + excluded.unique_visitors;
end;
$$;

-- =============================================================================
-- 3. Upsert Device Stats
-- =============================================================================
create or replace function public.upsert_device_stats(
  p_date date,
  p_device text,
  p_browser text,
  p_os text
)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.device_stats_daily (
    stat_date,
    device_type,
    browser,
    os,
    visits
  )
  values (p_date, p_device, p_browser, p_os, 1)
  on conflict (stat_date, device_type, browser, os)
  do update set
    visits = device_stats_daily.visits + 1;
end;
$$;

-- =============================================================================
-- 4. Upsert Geo Stats
-- =============================================================================
create or replace function public.upsert_geo_stats(
  p_date date,
  p_country_code text,
  p_country_name text,
  p_city text default null
)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.geo_stats_daily (
    stat_date,
    country_code,
    country_name,
    city,
    visits,
    unique_visitors,
    consent_based
  )
  values (p_date, p_country_code, p_country_name, p_city, 1, 1, true)
  on conflict (stat_date, country_code, city)
  do update set
    visits = geo_stats_daily.visits + 1,
    unique_visitors = geo_stats_daily.unique_visitors + 1;
end;
$$;

-- =============================================================================
-- 5. Upsert City Views
-- =============================================================================
create or replace function public.upsert_city_views(
  p_date date,
  p_city_id integer
)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.city_views_daily (
    stat_date,
    city_id,
    views,
    unique_viewers
  )
  values (p_date, p_city_id, 1, 1)
  on conflict (stat_date, city_id)
  do update set
    views = city_views_daily.views + 1,
    unique_viewers = city_views_daily.unique_viewers + 1;
end;
$$;

-- =============================================================================
-- 6. Upsert User Action
-- =============================================================================
create or replace function public.upsert_user_action(
  p_date date,
  p_action text
)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.user_actions_daily (
    stat_date,
    action_type,
    action_count
  )
  values (p_date, p_action, 1)
  on conflict (stat_date, action_type)
  do update set
    action_count = user_actions_daily.action_count + 1;
end;
$$;

-- Grant execute permissions to service_role
grant execute on function public.upsert_daily_visitor_stats to service_role;
grant execute on function public.upsert_traffic_source to service_role;
grant execute on function public.upsert_device_stats to service_role;
grant execute on function public.upsert_geo_stats to service_role;
grant execute on function public.upsert_city_views to service_role;
grant execute on function public.upsert_user_action to service_role;



-- ═══ harden_security.sql ═══
-- Harden RLS policies based on Security Strategy Audit
-- Fixes overly permissive policies in city_ai_insights

-- 1. city_ai_insights: Restrict write access to service_role only
-- Previously allowed anon/authenticated to insert/update, which is a risk.
drop policy if exists city_ai_insights_insert on public.city_ai_insights;
create policy city_ai_insights_insert
on public.city_ai_insights
for insert
to service_role
with check (true);

drop policy if exists city_ai_insights_update on public.city_ai_insights;
create policy city_ai_insights_update
on public.city_ai_insights
for update
to service_role
using (true)
with check (true);

-- 2. Ensure RLS is enabled on all tables (Redundant safety check)
alter table public.cities enable row level security;
alter table public.city_metrics enable row level security;
alter table public.city_ai_insights enable row level security;

-- 3. Verify no other tables exist or need locking down
-- (Run this manually: select * from pg_tables where schemaname = 'public';)



-- ═══ city_ai_insights RLS lockdown (mirrors migrations/202606281400_lock_city_ai_insights_rls.sql) ═══
-- Lock down city_ai_insights writes to service_role ONLY.
-- SECURITY FIX (C1, stored-content-injection): an earlier version of this
-- block re-opened INSERT/UPDATE to anon/authenticated to work around upsert
-- failures. Because the anon key ships to every browser, that allowed anyone
-- to persist arbitrary content that renders on every city page. The real fix
-- for upsert failures is using the service-role client, not weakening RLS.

-- Drop existing policies
drop policy if exists city_ai_insights_insert on public.city_ai_insights;
drop policy if exists city_ai_insights_update on public.city_ai_insights;

-- Writes restricted to service_role
create policy city_ai_insights_insert
on public.city_ai_insights
for insert
to service_role
with check (true);

create policy city_ai_insights_update
on public.city_ai_insights
for update
to service_role
using (true)
with check (true);



-- ═══ 20260311_places_cache_cost_optimization.sql ═══
-- Optimize Google Places caching for lower API cost and safer writes.
-- Public reads remain allowed. Cache writes are restricted to service_role.

ALTER TABLE IF EXISTS public.city_places_cache
  ALTER COLUMN updated_at SET DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_city_places_cache_updated_at
  ON public.city_places_cache (updated_at DESC);

ALTER TABLE IF EXISTS public.city_places_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read for all" ON public.city_places_cache;
DROP POLICY IF EXISTS "Enable upsert for all" ON public.city_places_cache;

CREATE POLICY "city_places_cache_select_public"
ON public.city_places_cache
FOR SELECT
TO public
USING (true);

CREATE POLICY "city_places_cache_insert_service_role"
ON public.city_places_cache
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "city_places_cache_update_service_role"
ON public.city_places_cache
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "city_places_cache_delete_service_role"
ON public.city_places_cache
FOR DELETE
TO service_role
USING (true);

CREATE INDEX IF NOT EXISTS idx_place_details_cache_updated_at
  ON public.place_details_cache (updated_at DESC);

ALTER TABLE IF EXISTS public.place_details_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access" ON public.place_details_cache;
DROP POLICY IF EXISTS "Service role update access" ON public.place_details_cache;
DROP POLICY IF EXISTS "Service role write access" ON public.place_details_cache;

CREATE POLICY "place_details_cache_select_public"
ON public.place_details_cache
FOR SELECT
TO public
USING (true);

CREATE POLICY "place_details_cache_insert_service_role"
ON public.place_details_cache
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "place_details_cache_update_service_role"
ON public.place_details_cache
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "place_details_cache_delete_service_role"
ON public.place_details_cache
FOR DELETE
TO service_role
USING (true);

ALTER TABLE IF EXISTS public.cache_hit_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cache_hit_stats_service_role_all" ON public.cache_hit_stats;

CREATE POLICY "cache_hit_stats_service_role_all"
ON public.cache_hit_stats
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);


-- ═══ migrations/202604241700_cache_schema_versions.sql ═══
-- =============================================================================
-- Cache schema versioning.
--
-- Adds a `schema_version` column to every cache table, and a `prompt_version`
-- column to AI-generated caches. Application readers treat rows whose version
-- does not match the current code-level constant as a miss — bumping the
-- constant is the safe way to invalidate the world after a shape change.
--
-- Defaults to 1 so existing rows remain valid against the initial code-level
-- version (which is also 1).
-- =============================================================================

-- Cache tables that hold provider / internal data shapes.
ALTER TABLE IF EXISTS public.city_places_cache
  ADD COLUMN IF NOT EXISTS schema_version integer NOT NULL DEFAULT 1;

ALTER TABLE IF EXISTS public.place_details_cache
  ADD COLUMN IF NOT EXISTS schema_version integer NOT NULL DEFAULT 1;

ALTER TABLE IF EXISTS public.city_weather_cache
  ADD COLUMN IF NOT EXISTS schema_version integer NOT NULL DEFAULT 1;

ALTER TABLE IF EXISTS public.city_metrics
  ADD COLUMN IF NOT EXISTS schema_version integer NOT NULL DEFAULT 1;

-- AI-generated caches also track the prompt version so that a prompt change
-- (same shape, different wording) can invalidate cleanly without a full
-- schema bump.
ALTER TABLE IF EXISTS public.city_ai_insights
  ADD COLUMN IF NOT EXISTS schema_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS prompt_version integer NOT NULL DEFAULT 1;

ALTER TABLE IF EXISTS public.ai_trending_cache
  ADD COLUMN IF NOT EXISTS schema_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS prompt_version integer NOT NULL DEFAULT 1;

-- Support for scheduled SWR refresh scans: let the cache-warmer find stale
-- rows efficiently.
CREATE INDEX IF NOT EXISTS ix_city_places_cache_updated_at
  ON public.city_places_cache (updated_at);

CREATE INDEX IF NOT EXISTS ix_city_weather_cache_updated_at
  ON public.city_weather_cache (updated_at);

CREATE INDEX IF NOT EXISTS ix_city_metrics_updated_at
  ON public.city_metrics (updated_at);



-- ═══ migrations/202605080000_cities_slug_seo.sql ═══
-- =============================================================================
-- SEO Phase 1: slug-based city URLs (audit ref: T1).
--
-- Adds a stable, unique `slug` column to public.cities so that the application
-- can serve URLs like `/cities/lisbon-portugal` instead of `/cities/123`.
--
-- The column is also returned from the search_cities_elastic RPC (replaced in
-- place below) so that on-site search can navigate directly to canonical URLs
-- without an intermediate id->slug round trip.
--
-- Idempotent: re-running this migration on a database that already has the
-- column / index / function is a no-op.
-- =============================================================================

-- 1) Column ---------------------------------------------------------------
ALTER TABLE IF EXISTS public.cities
  ADD COLUMN IF NOT EXISTS slug text;

-- 2) Slugify helper -------------------------------------------------------
-- Deterministic, accent-stripped, lowercase, dash-separated slug.
-- Depends on public.f_unaccent() defined in supabase/elastic_search.sql.
CREATE OR REPLACE FUNCTION public.slugify_city(p_city text, p_country text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT trim(both '-' from
    regexp_replace(
      lower(public.f_unaccent(coalesce(p_city, '') || '-' || coalesce(p_country, ''))),
      '[^a-z0-9]+',
      '-',
      'g'
    )
  );
$$;

-- 3) Backfill -------------------------------------------------------------
-- Fill any NULL slug with the base form, then resolve collisions in two
-- passes:
--   Pass 1: append `iso2` (or, if iso2 is NULL on this row, the row id) so
--           the common case "same base in two different countries"
--           produces a friendly slug like `springfield-us`.
--   Pass 2: any slug still colliding (i.e. multiple rows share the same
--           base AND the same iso2) gets the row id appended. Because id
--           is unique, this terminates after at most two passes.
UPDATE public.cities
SET slug = public.slugify_city(city, country)
WHERE slug IS NULL OR slug = '';

WITH ranked AS (
  SELECT
    id,
    slug,
    ROW_NUMBER() OVER (
      PARTITION BY slug
      ORDER BY population DESC NULLS LAST, id
    ) AS rn
  FROM public.cities
  WHERE slug IS NOT NULL
)
UPDATE public.cities c
SET slug = c.slug || '-' || lower(coalesce(c.iso2, c.id::text))
FROM ranked r
WHERE r.id = c.id
  AND r.rn > 1;

WITH ranked AS (
  SELECT
    id,
    slug,
    ROW_NUMBER() OVER (
      PARTITION BY slug
      ORDER BY population DESC NULLS LAST, id
    ) AS rn
  FROM public.cities
  WHERE slug IS NOT NULL
)
UPDATE public.cities c
SET slug = c.slug || '-' || c.id::text
FROM ranked r
WHERE r.id = c.id
  AND r.rn > 1;

-- 4) Uniqueness -----------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS cities_slug_key ON public.cities (slug);

-- 5) Auto-populate trigger ------------------------------------------------
-- Ensures any future INSERT/UPDATE that omits slug gets a deterministic one
-- before it lands. Collision resolution for inserts is handled by the
-- backfill query above for existing rows; new rows that collide will trip
-- the unique index and surface as a constraint error to the writer (which
-- should rerun this migration's collision-resolution step or pass an
-- explicit slug).
CREATE OR REPLACE FUNCTION public.cities_set_slug_trigger()
RETURNS trigger AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.slugify_city(NEW.city, NEW.country);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cities_set_slug ON public.cities;
CREATE TRIGGER trg_cities_set_slug
  BEFORE INSERT OR UPDATE OF city, country, slug ON public.cities
  FOR EACH ROW
  EXECUTE FUNCTION public.cities_set_slug_trigger();

-- 6) RPC: include slug in elastic search results --------------------------
-- Replaces public.search_cities_elastic so callers can navigate directly to
-- the canonical /cities/{slug} URL. Body is the same as the canonical
-- definition in supabase/elastic_search.sql, with `slug` threaded through.
--
-- The prior definition in elastic_search.sql returns a different row type
-- (no `slug` column), so CREATE OR REPLACE cannot change it in place. Drop
-- the existing function first; idempotent because of IF EXISTS.
DROP FUNCTION IF EXISTS public.search_cities_elastic(text, int);

CREATE OR REPLACE FUNCTION public.search_cities_elastic(
  query text,
  result_limit int DEFAULT 10
)
RETURNS TABLE (
  id bigint,
  city text,
  city_ascii text,
  slug text,
  lat double precision,
  lng double precision,
  country text,
  iso2 text,
  iso3 text,
  admin_name text,
  capital text,
  population bigint,
  rank_score real,
  match_type text
) LANGUAGE plpgsql STABLE AS $$
DECLARE
  clean_query text;
  tsq tsquery;
  safe_limit int;
BEGIN
  safe_limit := LEAST(GREATEST(result_limit, 1), 50);
  clean_query := lower(trim(public.f_unaccent(query)));

  IF length(clean_query) < 1 THEN
    RETURN;
  END IF;

  BEGIN
    tsq := phraseto_tsquery('english', clean_query);
    IF tsq IS NULL OR tsq = ''::tsquery THEN
      tsq := plainto_tsquery('english', clean_query);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    tsq := plainto_tsquery('english', clean_query);
  END;

  RETURN QUERY
  WITH
  fts AS (
    SELECT
      c.id, c.city, c.city_ascii, c.slug, c.lat, c.lng, c.country,
      c.iso2, c.iso3, c.admin_name, c.capital, c.population,
      ts_rank_cd(c.search_document, tsq, 32) AS fts_rank,
      'fts'::text AS mt
    FROM public.cities c
    WHERE c.search_document @@ tsq
      AND tsq IS NOT NULL AND tsq != ''::tsquery
    ORDER BY ts_rank_cd(c.search_document, tsq, 32) DESC,
             c.population DESC NULLS LAST
    LIMIT safe_limit
  ),
  fuzzy AS (
    SELECT
      c.id, c.city, c.city_ascii, c.slug, c.lat, c.lng, c.country,
      c.iso2, c.iso3, c.admin_name, c.capital, c.population,
      GREATEST(
        similarity(lower(c.city_ascii), clean_query),
        similarity(lower(c.country), clean_query),
        word_similarity(clean_query, lower(c.city_ascii))
      ) AS trgm_score,
      'fuzzy'::text AS mt
    FROM public.cities c
    WHERE c.id NOT IN (SELECT f.id FROM fts f)
      AND (
        lower(c.city_ascii) % clean_query
        OR lower(c.country) % clean_query
        OR clean_query <% lower(c.city_ascii)
      )
    ORDER BY GREATEST(
      similarity(lower(c.city_ascii), clean_query),
      similarity(lower(c.country), clean_query),
      word_similarity(clean_query, lower(c.city_ascii))
    ) DESC,
    c.population DESC NULLS LAST
    LIMIT safe_limit
  ),
  alias_matches AS (
    SELECT
      c.id, c.city, c.city_ascii, c.slug, c.lat, c.lng, c.country,
      c.iso2, c.iso3, c.admin_name, c.capital, c.population,
      similarity(a.alias, clean_query) AS alias_score,
      'alias'::text AS mt
    FROM public.city_search_aliases a
    JOIN public.cities c ON c.id = a.city_id
    WHERE a.alias % clean_query
       OR a.alias ILIKE clean_query || '%'
       OR clean_query ILIKE a.alias || '%'
  ),
  combined AS (
    SELECT *, fts_rank AS raw_score FROM fts
    UNION ALL
    SELECT *, trgm_score AS raw_score FROM fuzzy
    UNION ALL
    SELECT *, alias_score AS raw_score FROM alias_matches
  ),
  deduped AS (
    SELECT DISTINCT ON (cb.id)
      cb.id, cb.city, cb.city_ascii, cb.slug, cb.lat, cb.lng, cb.country,
      cb.iso2, cb.iso3, cb.admin_name, cb.capital, cb.population,
      cb.mt,
      (cb.raw_score::real + (ln(GREATEST(cb.population, 1)) / 40.0)::real) AS final_score
    FROM combined cb
    ORDER BY cb.id, cb.raw_score DESC
  )
  SELECT
    d.id, d.city, d.city_ascii, d.slug, d.lat, d.lng, d.country,
    d.iso2, d.iso3, d.admin_name, d.capital, d.population,
    d.final_score AS rank_score,
    d.mt AS match_type
  FROM deduped d
  ORDER BY d.final_score DESC, d.population DESC NULLS LAST
  LIMIT safe_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_cities_elastic(text, int) TO anon, authenticated;



-- ═══ migrations/202606111000_provider_budget_and_cache_idempotency.sql ═══
-- Incident remediation P1/P5 (see bestcityspots-backend-incident-actions.md):
--
-- 1. Durable, cross-instance daily budget for paid providers. The previous
--    cost guard was an in-memory Map that reset on every container restart
--    (incident root cause 3). This table + atomic claim function survive
--    restarts and are shared by the web app AND the cache warmer.
--
-- 2. Idempotency constraints on cache tables so logically identical entries
--    can never duplicate (incident root cause 7 — repeat misses for the same
--    logical key multiplied provider calls).

-- ───────────────────────── provider daily budget ─────────────────────────

create table if not exists public.provider_daily_usage (
  provider   text not null,
  day        date not null,
  used       integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (provider, day)
);

comment on table public.provider_daily_usage is
  'Atomic daily call budget for paid providers (gemini, google-places). Written only via claim_provider_use().';

alter table public.provider_daily_usage enable row level security;

-- Service role only — the anon key must never read or mutate spend state.
drop policy if exists "provider_daily_usage_service_role_all" on public.provider_daily_usage;
create policy "provider_daily_usage_service_role_all"
on public.provider_daily_usage
for all
to service_role
using (true)
with check (true);

-- Atomically claim one provider call against the daily limit.
-- Returns true when the claim succeeded (caller may spend), false when the
-- budget is exhausted. The conditional UPDATE makes the check-and-increment
-- a single atomic statement — no read-modify-write race across instances.
create or replace function public.claim_provider_use(
  p_provider text,
  p_day date,
  p_limit integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used integer;
begin
  if p_limit <= 0 then
    return false;
  end if;

  insert into public.provider_daily_usage as u (provider, day, used)
  values (p_provider, p_day, 1)
  on conflict (provider, day) do update
    set used = u.used + 1,
        updated_at = now()
    where u.used < p_limit
  returning used into v_used;

  -- No row returned ⇒ the conditional update was skipped ⇒ budget exhausted.
  return v_used is not null;
end;
$$;

revoke all on function public.claim_provider_use(text, date, integer) from public;
grant execute on function public.claim_provider_use(text, date, integer) to service_role;

-- Read-only observability helper (dashboards / ops checks).
create or replace function public.get_provider_usage(p_day date)
returns table (provider text, used integer, updated_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select provider, used, updated_at
  from public.provider_daily_usage
  where day = p_day;
$$;

revoke all on function public.get_provider_usage(date) from public;
grant execute on function public.get_provider_usage(date) to service_role;

-- ───────────────────── cache idempotency constraints ─────────────────────
-- The application upserts with onConflict targets; these constraints make
-- those targets real and guarantee one row per logical cache entry.
-- Dedupe first (keep the most recently updated row), then enforce.

-- city_places_cache: one row per (city_name, place_type)
do $$
begin
  if to_regclass('public.city_places_cache') is not null then
    delete from public.city_places_cache a
    using public.city_places_cache b
    where a.city_name = b.city_name
      and a.place_type = b.place_type
      and a.ctid < b.ctid;

    if not exists (
      select 1 from pg_indexes
      where schemaname = 'public'
        and tablename = 'city_places_cache'
        and indexname = 'city_places_cache_city_name_place_type_key'
    ) then
      begin
        alter table public.city_places_cache
          add constraint city_places_cache_city_name_place_type_key
          unique (city_name, place_type);
      exception when duplicate_table or duplicate_object then
        null; -- constraint already exists under another name
      end;
    end if;
  end if;
end $$;

-- weather / metrics / insights caches: one row per city_id
do $$
declare
  t text;
begin
  foreach t in array array['city_weather_cache', 'city_metrics', 'city_ai_insights'] loop
    if to_regclass('public.' || t) is not null then
      execute format(
        'delete from public.%I a using public.%I b
           where a.city_id = b.city_id and a.ctid < b.ctid', t, t);
      -- city_id is already the primary key on these tables in the canonical
      -- schema; the dedupe above is a no-op there and only repairs drifted
      -- environments where the PK was lost.
    end if;
  end loop;
end $$;



-- ═══ migrations/202606120900_place_save_counters.sql ═══
-- US-12: anonymous "travelers saved this" counters. One aggregate row per
-- (place, day). No user identifiers, no sessions, no IPs.

create table if not exists public.place_saves_daily (
  place_id text not null,
  day date not null default current_date,
  saves integer not null default 0,
  primary key (place_id, day)
);

comment on table public.place_saves_daily is
  'Anonymous aggregate save counts per place per day (US-12). Written only via record_place_save().';

alter table public.place_saves_daily enable row level security;

drop policy if exists "place_saves_daily_service_role_all" on public.place_saves_daily;
create policy "place_saves_daily_service_role_all"
on public.place_saves_daily
for all
to service_role
using (true)
with check (true);

create or replace function public.record_place_save(p_place_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_place_id is null or p_place_id !~ '^[A-Za-z0-9_-]{4,128}$' then
    return;
  end if;

  insert into public.place_saves_daily as t (place_id, day, saves)
  values (p_place_id, current_date, 1)
  on conflict (place_id, day) do update
    set saves = t.saves + 1;
end;
$$;

revoke all on function public.record_place_save(text) from public;
grant execute on function public.record_place_save(text) to service_role;

create or replace function public.get_place_save_totals(p_place_ids text[])
returns table (place_id text, total bigint)
language sql
security definer
set search_path = public
stable
as $$
  select place_id, sum(saves)::bigint as total
  from public.place_saves_daily
  where place_id = any (p_place_ids)
  group by place_id;
$$;

revoke all on function public.get_place_save_totals(text[]) from public;
grant execute on function public.get_place_save_totals(text[]) to service_role;



-- ═══ migrations/202606281500_create_ai_trending_cache.sql ═══
-- Trending-destinations cache (24h). Referenced by src/lib/intelligence.ts
-- but previously never created by any SQL file. Singleton row keyed id=1.
-- service_role-only writes; public read.

create table if not exists public.ai_trending_cache (
  id smallint primary key default 1,
  city_names jsonb not null default '[]'::jsonb,
  prompt_version integer not null default 1,
  schema_version integer not null default 1,
  updated_at timestamptz not null default now(),
  constraint ai_trending_cache_singleton check (id = 1)
);

comment on table public.ai_trending_cache is
  'Singleton cache of AI-generated trending destination names (24h). Written via service_role only.';

alter table public.ai_trending_cache enable row level security;

drop policy if exists ai_trending_cache_select on public.ai_trending_cache;
create policy ai_trending_cache_select
on public.ai_trending_cache
for select
to anon, authenticated
using (true);

drop policy if exists ai_trending_cache_insert on public.ai_trending_cache;
create policy ai_trending_cache_insert
on public.ai_trending_cache
for insert
to service_role
with check (true);

drop policy if exists ai_trending_cache_update on public.ai_trending_cache;
create policy ai_trending_cache_update
on public.ai_trending_cache
for update
to service_role
using (true)
with check (true);

insert into public.ai_trending_cache (id) values (1) on conflict (id) do nothing;


-- ═══ migrations/202606141200_fix_search_cities_elastic_coord_types.sql ═══
-- =============================================================================
-- Fix: search_cities_elastic return type mismatch on lat/lng.
--
-- public.cities stores lat/lng as `double precision`, but every prior
-- definition of search_cities_elastic declared `RETURNS TABLE (... lat numeric,
-- lng numeric ...)`. Postgres requires the function body's output types to
-- match the declared types exactly, so the RPC failed at call time with
-- "structure of query does not match function result type" on any clean build
-- whose cities table uses double precision (the canonical repo schema).
--
-- This recreates the function with `lat double precision, lng double precision`
-- — which also matches the TypeScript `City` type (lat/lng: number); PostgREST
-- serializes double precision as JSON numbers, whereas numeric came back as
-- strings. Body is otherwise identical to the slug-aware definition in
-- migrations/202605080000_cities_slug_seo.sql.
--
-- Idempotent: DROP IF EXISTS + CREATE OR REPLACE + GRANT.
-- =============================================================================

DROP FUNCTION IF EXISTS public.search_cities_elastic(text, int);

CREATE OR REPLACE FUNCTION public.search_cities_elastic(
  query text,
  result_limit int DEFAULT 10
)
RETURNS TABLE (
  id bigint,
  city text,
  city_ascii text,
  slug text,
  lat double precision,
  lng double precision,
  country text,
  iso2 text,
  iso3 text,
  admin_name text,
  capital text,
  population bigint,
  rank_score real,
  match_type text
) LANGUAGE plpgsql STABLE AS $$
DECLARE
  clean_query text;
  tsq tsquery;
  safe_limit int;
BEGIN
  safe_limit := LEAST(GREATEST(result_limit, 1), 50);
  clean_query := lower(trim(public.f_unaccent(query)));

  IF length(clean_query) < 1 THEN
    RETURN;
  END IF;

  BEGIN
    tsq := phraseto_tsquery('english', clean_query);
    IF tsq IS NULL OR tsq = ''::tsquery THEN
      tsq := plainto_tsquery('english', clean_query);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    tsq := plainto_tsquery('english', clean_query);
  END;

  RETURN QUERY
  WITH
  fts AS (
    SELECT
      c.id, c.city, c.city_ascii, c.slug, c.lat, c.lng, c.country,
      c.iso2, c.iso3, c.admin_name, c.capital, c.population,
      ts_rank_cd(c.search_document, tsq, 32) AS fts_rank,
      'fts'::text AS mt
    FROM public.cities c
    WHERE c.search_document @@ tsq
      AND tsq IS NOT NULL AND tsq != ''::tsquery
    ORDER BY ts_rank_cd(c.search_document, tsq, 32) DESC,
             c.population DESC NULLS LAST
    LIMIT safe_limit
  ),
  fuzzy AS (
    SELECT
      c.id, c.city, c.city_ascii, c.slug, c.lat, c.lng, c.country,
      c.iso2, c.iso3, c.admin_name, c.capital, c.population,
      GREATEST(
        similarity(lower(c.city_ascii), clean_query),
        similarity(lower(c.country), clean_query),
        word_similarity(clean_query, lower(c.city_ascii))
      ) AS trgm_score,
      'fuzzy'::text AS mt
    FROM public.cities c
    WHERE c.id NOT IN (SELECT f.id FROM fts f)
      AND (
        lower(c.city_ascii) % clean_query
        OR lower(c.country) % clean_query
        OR clean_query <% lower(c.city_ascii)
      )
    ORDER BY GREATEST(
      similarity(lower(c.city_ascii), clean_query),
      similarity(lower(c.country), clean_query),
      word_similarity(clean_query, lower(c.city_ascii))
    ) DESC,
    c.population DESC NULLS LAST
    LIMIT safe_limit
  ),
  alias_matches AS (
    SELECT
      c.id, c.city, c.city_ascii, c.slug, c.lat, c.lng, c.country,
      c.iso2, c.iso3, c.admin_name, c.capital, c.population,
      similarity(a.alias, clean_query) AS alias_score,
      'alias'::text AS mt
    FROM public.city_search_aliases a
    JOIN public.cities c ON c.id = a.city_id
    WHERE a.alias % clean_query
       OR a.alias ILIKE clean_query || '%'
       OR clean_query ILIKE a.alias || '%'
  ),
  combined AS (
    SELECT *, fts_rank AS raw_score FROM fts
    UNION ALL
    SELECT *, trgm_score AS raw_score FROM fuzzy
    UNION ALL
    SELECT *, alias_score AS raw_score FROM alias_matches
  ),
  deduped AS (
    SELECT DISTINCT ON (cb.id)
      cb.id, cb.city, cb.city_ascii, cb.slug, cb.lat, cb.lng, cb.country,
      cb.iso2, cb.iso3, cb.admin_name, cb.capital, cb.population,
      cb.mt,
      (cb.raw_score::real + (ln(GREATEST(cb.population, 1)) / 40.0)::real) AS final_score
    FROM combined cb
    ORDER BY cb.id, cb.raw_score DESC
  )
  SELECT
    d.id, d.city, d.city_ascii, d.slug, d.lat, d.lng, d.country,
    d.iso2, d.iso3, d.admin_name, d.capital, d.population,
    d.final_score AS rank_score,
    d.mt AS match_type
  FROM deduped d
  ORDER BY d.final_score DESC, d.population DESC NULLS LAST
  LIMIT safe_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_cities_elastic(text, int) TO anon, authenticated;



-- ═══ migrations/202607071200_fix_daily_visitor_stats_bounce_duration_weighting.sql ═══
-- =============================================================================
-- Fix: upsert_daily_visitor_stats weighted per-session rates by pageviews.
--
-- bounce_rate_pct and avg_session_duration_sec are per-SESSION metrics, but
-- the merge in upsert_daily_visitor_stats weighted them by total_visits
-- (which recordDailyVisitorStats set to the pageview count). The effect was
-- that a single bounced session with N pageviews reported a bounce rate of
-- 100/N % instead of 100% — e.g. one bounced session of three pageviews
-- surfaced as 33.3% rather than 100%. Average session duration was skewed
-- the same way (sessions with more pageviews overweighted the mean).
--
-- This re-weights both merges by unique_visitors (the session count) and
-- computes the initial bounce_rate_pct against p_unique. Page-view volume
-- (total_visits, page_views) is unchanged, so dashboard traffic numbers are
-- unaffected; only the per-session rates become correct.
--
-- No data backfill is required: existing daily rows keep their historical
-- (incorrect) rates, and every write from this function forward is correct.
--
-- Idempotent: CREATE OR REPLACE preserves the existing signature/grants.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.upsert_daily_visitor_stats(
  p_date date,
  p_visits integer,
  p_unique integer,
  p_pageviews integer,
  p_duration integer,
  p_bounce integer,
  p_new integer,
  p_returning integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.daily_visitor_stats (
    stat_date,
    total_visits,
    unique_visitors,
    page_views,
    avg_session_duration_sec,
    bounce_rate_pct,
    new_visitors,
    returning_visitors
  )
  VALUES (
    p_date,
    p_visits,
    p_unique,
    p_pageviews,
    p_duration,
    -- Per-SESSION rate: denominator is the session count (p_unique).
    CASE WHEN p_unique > 0 THEN (p_bounce * 100 / p_unique) ELSE 0 END,
    p_new,
    p_returning
  )
  ON CONFLICT (stat_date)
  DO UPDATE SET
    total_visits = daily_visitor_stats.total_visits + excluded.total_visits,
    unique_visitors = daily_visitor_stats.unique_visitors + excluded.unique_visitors,
    page_views = daily_visitor_stats.page_views + excluded.page_views,
    avg_session_duration_sec = CASE
      WHEN daily_visitor_stats.unique_visitors + excluded.unique_visitors > 0
      THEN ((daily_visitor_stats.avg_session_duration_sec * daily_visitor_stats.unique_visitors) +
            (excluded.avg_session_duration_sec * excluded.unique_visitors)) /
           (daily_visitor_stats.unique_visitors + excluded.unique_visitors)
      ELSE 0
    END,
    bounce_rate_pct = CASE
      WHEN daily_visitor_stats.unique_visitors + excluded.unique_visitors > 0
      THEN ((daily_visitor_stats.bounce_rate_pct * daily_visitor_stats.unique_visitors) +
            (excluded.bounce_rate_pct * excluded.unique_visitors)) /
           (daily_visitor_stats.unique_visitors + excluded.unique_visitors)
      ELSE 0
    END,
    new_visitors = daily_visitor_stats.new_visitors + excluded.new_visitors,
    returning_visitors = daily_visitor_stats.returning_visitors + excluded.returning_visitors,
    updated_at = timezone('utc', now());
END;
$$;

-- SECURITY: this function is SECURITY DEFINER, so it bypasses RLS. Pin its
-- search_path and drop the EXECUTE grant PostgreSQL hands to PUBLIC by default
-- (granting to service_role does not remove it) — otherwise the browser-visible
-- anon key can call it through PostgREST. Added retroactively by the 2026-09-12
-- audit (H-1/L-2); migrations/202609121200 applies the same fix to every
-- analytics RPC for environments that already ran this file. Kept here so the
-- migration is correct standalone and a from-scratch replay never leaves a
-- window where the function is world-executable.
ALTER FUNCTION public.upsert_daily_visitor_stats(date, integer, integer, integer, integer, integer, integer, integer) SET search_path = public;
REVOKE ALL ON FUNCTION public.upsert_daily_visitor_stats(date, integer, integer, integer, integer, integer, integer, integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_daily_visitor_stats(date, integer, integer, integer, integer, integer, integer, integer) TO service_role;



-- ═══ migrations/202609121200_harden_function_grants_and_storage.sql ═══
-- =============================================================================
-- Security audit remediation (docs/security-audit-2026-09-12.md): H-1, L-2,
-- M-1, L-4.
--
-- H-1 (High) — the six analytics upsert functions are SECURITY DEFINER but
--   only ever GRANTed to service_role. PostgreSQL grants EXECUTE on a new
--   function to PUBLIC by default, and granting to another role does not
--   remove it; `anon` inherits PUBLIC, PostgREST exposes every public-schema
--   function at /rest/v1/rpc/<name>, and SECURITY DEFINER runs as the owner —
--   so the browser-visible anon key could write to every analytics table,
--   bypassing the service_role-only RLS policies entirely. Poisoned
--   city_views_daily rows also drive the homepage Living Index
--   (src/app/actions.ts).
--
-- L-2 (Low) — the same functions resolve unqualified names through the
--   caller's search_path. Pin it, as claim_provider_use / record_place_save
--   already do.
--
-- M-1 (Medium) — the public-read place_images bucket accepted INSERTs from
--   any `authenticated` role. The app writes it only with the service-role
--   client (src/lib/places.ts), so the grant was unused — and with Supabase
--   sign-ups enabled, anyone could self-register and upload arbitrary objects
--   to a public bucket on the project domain.
--
-- L-4 (Low) — search_cities_elastic is (intentionally) anon-executable, but
--   an uncapped `query` runs FTS plus three trigram similarity computations
--   per row. The call goes browser → PostgREST, so it is not behind the nginx
--   rate limit. Cap the normalized query length inside the function.
--
-- Idempotent: revoke/grant/alter and CREATE OR REPLACE throughout.
-- =============================================================================

-- ───────────────── H-1 + L-2: analytics RPC grants & search_path ─────────────
--
-- Signatures are spelled in full because each name must be resolved
-- unambiguously. All six are called only through
-- src/platform/data-access/analytics-repository.ts, which uses the
-- service-role client — nothing in the app loses access.

do $$
declare
  fn text;
  signatures text[] := array[
    'upsert_daily_visitor_stats(date,integer,integer,integer,integer,integer,integer,integer)',
    'upsert_traffic_source(date,text,text,integer,integer)',
    'upsert_device_stats(date,text,text,text)',
    'upsert_geo_stats(date,text,text,text)',
    'upsert_city_views(date,integer)',
    'upsert_user_action(date,text)'
  ];
begin
  foreach fn in array signatures loop
    -- Skip cleanly if a deployment predates one of these functions.
    if to_regprocedure('public.' || fn) is null then
      raise notice 'skipping missing function public.%', fn;
      continue;
    end if;

    execute format('revoke all on function public.%s from public', fn);
    execute format('revoke all on function public.%s from anon, authenticated', fn);
    execute format('grant execute on function public.%s to service_role', fn);
    execute format('alter function public.%s set search_path = public', fn);
  end loop;
end $$;

-- Same treatment for the remaining callable helpers that are service-role-only
-- in practice. record_cache_event is not SECURITY DEFINER (RLS already blocks
-- anon writes to cache_hit_stats), but there is no reason for anon to hold
-- EXECUTE on it; slugify_city is a pure helper used by the cities trigger.
do $$
declare
  fn text;
  signatures text[] := array[
    'record_cache_event(text,boolean)',
    'slugify_city(text,text)'
  ];
begin
  foreach fn in array signatures loop
    if to_regprocedure('public.' || fn) is null then
      raise notice 'skipping missing function public.%', fn;
      continue;
    end if;
    execute format('revoke all on function public.%s from public', fn);
    execute format('revoke all on function public.%s from anon, authenticated', fn);
    execute format('grant execute on function public.%s to service_role', fn);
  end loop;
end $$;

-- Verification query for operators (run manually after applying):
--
--   select p.proname,
--          p.prosecdef                              as security_definer,
--          p.proconfig                              as settings,
--          pg_catalog.pg_get_function_identity_arguments(p.oid) as args,
--          p.proacl                                 as grants
--   from pg_proc p
--   join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname = 'public'
--   order by p.proname;
--
-- Expect: no `=X/` (PUBLIC execute) entry in proacl for any SECURITY DEFINER
-- function, and `search_path=public` in settings for each of them.

-- ───────────────────── M-1: place_images uploads ─────────────────────────────

drop policy if exists "place_images_upload" on storage.objects;
create policy "place_images_upload"
on storage.objects for insert
to service_role
with check (bucket_id = 'place_images');

-- Public read is intentional (cached place imagery is served straight from
-- storage and whitelisted in next.config.ts remotePatterns) and is unchanged.

-- ─────────────────── L-4: bound the anon-executable search ───────────────────
--
-- Body is identical to migrations/202606141200_fix_search_cities_elastic_coord_types.sql
-- except for the added length cap. CREATE OR REPLACE (no DROP) keeps the
-- existing grants intact; the signature and return type are unchanged.

CREATE OR REPLACE FUNCTION public.search_cities_elastic(
  query text,
  result_limit int DEFAULT 10
)
RETURNS TABLE (
  id bigint,
  city text,
  city_ascii text,
  slug text,
  lat double precision,
  lng double precision,
  country text,
  iso2 text,
  iso3 text,
  admin_name text,
  capital text,
  population bigint,
  rank_score real,
  match_type text
) LANGUAGE plpgsql STABLE AS $$
DECLARE
  clean_query text;
  tsq tsquery;
  safe_limit int;
  -- Longest city+country string in the dataset is well under this; the cap
  -- exists so an anon caller cannot hand the trigram operators an arbitrarily
  -- long needle to compare against every row.
  max_query_length constant int := 100;
BEGIN
  safe_limit := LEAST(GREATEST(result_limit, 1), 50);
  clean_query := left(lower(trim(public.f_unaccent(query))), max_query_length);

  IF length(clean_query) < 1 THEN
    RETURN;
  END IF;

  BEGIN
    tsq := phraseto_tsquery('english', clean_query);
    IF tsq IS NULL OR tsq = ''::tsquery THEN
      tsq := plainto_tsquery('english', clean_query);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    tsq := plainto_tsquery('english', clean_query);
  END;

  RETURN QUERY
  WITH
  fts AS (
    SELECT
      c.id, c.city, c.city_ascii, c.slug, c.lat, c.lng, c.country,
      c.iso2, c.iso3, c.admin_name, c.capital, c.population,
      ts_rank_cd(c.search_document, tsq, 32) AS fts_rank,
      'fts'::text AS mt
    FROM public.cities c
    WHERE c.search_document @@ tsq
      AND tsq IS NOT NULL AND tsq != ''::tsquery
    ORDER BY ts_rank_cd(c.search_document, tsq, 32) DESC,
             c.population DESC NULLS LAST
    LIMIT safe_limit
  ),
  fuzzy AS (
    SELECT
      c.id, c.city, c.city_ascii, c.slug, c.lat, c.lng, c.country,
      c.iso2, c.iso3, c.admin_name, c.capital, c.population,
      GREATEST(
        similarity(lower(c.city_ascii), clean_query),
        similarity(lower(c.country), clean_query),
        word_similarity(clean_query, lower(c.city_ascii))
      ) AS trgm_score,
      'fuzzy'::text AS mt
    FROM public.cities c
    WHERE c.id NOT IN (SELECT f.id FROM fts f)
      AND (
        lower(c.city_ascii) % clean_query
        OR lower(c.country) % clean_query
        OR clean_query <% lower(c.city_ascii)
      )
    ORDER BY GREATEST(
      similarity(lower(c.city_ascii), clean_query),
      similarity(lower(c.country), clean_query),
      word_similarity(clean_query, lower(c.city_ascii))
    ) DESC,
    c.population DESC NULLS LAST
    LIMIT safe_limit
  ),
  alias_matches AS (
    SELECT
      c.id, c.city, c.city_ascii, c.slug, c.lat, c.lng, c.country,
      c.iso2, c.iso3, c.admin_name, c.capital, c.population,
      similarity(a.alias, clean_query) AS alias_score,
      'alias'::text AS mt
    FROM public.city_search_aliases a
    JOIN public.cities c ON c.id = a.city_id
    WHERE a.alias % clean_query
       OR a.alias ILIKE clean_query || '%'
       OR clean_query ILIKE a.alias || '%'
  ),
  combined AS (
    SELECT *, fts_rank AS raw_score FROM fts
    UNION ALL
    SELECT *, trgm_score AS raw_score FROM fuzzy
    UNION ALL
    SELECT *, alias_score AS raw_score FROM alias_matches
  ),
  deduped AS (
    SELECT DISTINCT ON (cb.id)
      cb.id, cb.city, cb.city_ascii, cb.slug, cb.lat, cb.lng, cb.country,
      cb.iso2, cb.iso3, cb.admin_name, cb.capital, cb.population,
      cb.mt,
      (cb.raw_score::real + (ln(GREATEST(cb.population, 1)) / 40.0)::real) AS final_score
    FROM combined cb
    ORDER BY cb.id, cb.raw_score DESC
  )
  SELECT
    d.id, d.city, d.city_ascii, d.slug, d.lat, d.lng, d.country,
    d.iso2, d.iso3, d.admin_name, d.capital, d.population,
    d.final_score AS rank_score,
    d.mt AS match_type
  FROM deduped d
  ORDER BY d.final_score DESC, d.population DESC NULLS LAST
  LIMIT safe_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_cities_elastic(text, int) TO anon, authenticated;

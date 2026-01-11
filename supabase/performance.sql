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

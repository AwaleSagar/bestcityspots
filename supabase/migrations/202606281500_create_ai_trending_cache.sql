-- Create the ai_trending_cache table (G1 fix).
--
-- This table was referenced by application code (src/lib/intelligence.ts) and
-- by migrations/202604241700 (which only ALTER TABLE IF EXISTS ... ADD COLUMN,
-- a silent no-op when the table is absent) but was never created by any SQL
-- file. As a result the 24h trending-destinations cache never persisted on a
-- fresh setup — every request rebuilt it and re-billed the AI provider.
--
-- Shape is inferred from intelligence.ts (singleton row keyed id=1, columns
-- city_names/updated_at/prompt_version) plus the schema/prompt version columns
-- added by 202604241700. Write posture is service_role-only (never expose the
-- service key to the browser); reads are public since trending destinations
-- are intended public content. Matches the city_ai_insights posture.

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

-- Public read.
drop policy if exists ai_trending_cache_select on public.ai_trending_cache;
create policy ai_trending_cache_select
on public.ai_trending_cache
for select
to anon, authenticated
using (true);

-- service_role-only writes.
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

-- Seed the singleton row so upserts from intelligence.ts hit the UPDATE path.
insert into public.ai_trending_cache (id) values (1) on conflict (id) do nothing;

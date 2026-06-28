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

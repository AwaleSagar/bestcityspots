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

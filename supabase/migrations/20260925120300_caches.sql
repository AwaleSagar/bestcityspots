-- =============================================================================
-- Provider caches (cache-first + stale-while-revalidate; TTLs live in
-- src/lib/cache-config.ts). Public read so server components can use the
-- publishable key; writes are server-only through the secret key.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- city_places_cache — Google Places results per city and category.
-- Keyed by city id (not display name) so same-named cities never share rows.
-- ---------------------------------------------------------------------------
create table public.city_places_cache (
  city_id bigint not null references public.cities (id) on delete cascade,
  place_type text not null check (place_type in ('landmarks', 'restaurants', 'hotels')),
  places_data jsonb not null default '[]'::jsonb check (jsonb_typeof(places_data) = 'array'),
  updated_at timestamptz not null default now(),
  primary key (city_id, place_type)
);

create index city_places_cache_updated_at_idx on public.city_places_cache (updated_at);

alter table public.city_places_cache enable row level security;

create policy "places cache is publicly readable"
  on public.city_places_cache for select
  to anon, authenticated
  using (true);

grant select on public.city_places_cache to anon, authenticated;
grant select, insert, update, delete on public.city_places_cache to service_role;

-- ---------------------------------------------------------------------------
-- city_weather_cache — OpenWeather / Open-Meteo snapshot (60 min TTL).
-- Every field is required by the app's Zod model, so they're NOT NULL here.
-- ---------------------------------------------------------------------------
create table public.city_weather_cache (
  city_id bigint primary key references public.cities (id) on delete cascade,
  temp double precision not null,
  feels_like double precision not null,
  temp_min double precision not null,
  temp_max double precision not null,
  humidity double precision not null check (humidity between 0 and 100),
  description text not null check (char_length(description) <= 200),
  icon text not null check (char_length(icon) <= 16),
  wind_speed double precision not null check (wind_speed >= 0),
  aqi double precision not null check (aqi >= 0),
  aqi_label text not null check (char_length(aqi_label) <= 64),
  updated_at timestamptz not null default now()
);

create index city_weather_cache_updated_at_idx on public.city_weather_cache (updated_at);

alter table public.city_weather_cache enable row level security;

create policy "weather cache is publicly readable"
  on public.city_weather_cache for select
  to anon, authenticated
  using (true);

grant select on public.city_weather_cache to anon, authenticated;
grant select, insert, update, delete on public.city_weather_cache to service_role;

-- ---------------------------------------------------------------------------
-- city_live_metrics — the only metrics a live refresh writes (Open-Meteo).
-- Durable reference metrics come from country_indicators via the view below,
-- so a refresh can never overwrite them.
-- ---------------------------------------------------------------------------
create table public.city_live_metrics (
  city_id bigint primary key references public.cities (id) on delete cascade,
  pollution_pm25 numeric(7, 2) check (pollution_pm25 >= 0),
  climate_comfort text check (climate_comfort in ('Hot', 'Warm', 'Mild', 'Cool', 'Cold')),
  source jsonb not null default '{}'::jsonb check (jsonb_typeof(source) = 'object'),
  updated_at timestamptz not null default now()
);

create index city_live_metrics_pm25_idx on public.city_live_metrics (pollution_pm25)
  where pollution_pm25 is not null;
create index city_live_metrics_updated_at_idx on public.city_live_metrics (updated_at);

alter table public.city_live_metrics enable row level security;

create policy "live metrics are publicly readable"
  on public.city_live_metrics for select
  to anon, authenticated
  using (true);

grant select on public.city_live_metrics to anon, authenticated;
grant select, insert, update, delete on public.city_live_metrics to service_role;

-- ---------------------------------------------------------------------------
-- city_metrics — read model consumed by the city page, compare, the priorities
-- mixer and the topical hubs. security_invoker = true so the caller's RLS on
-- the underlying tables applies (a definer view would bypass it).
--
-- cost_index / homicide_rate_per_100k / health_access_per_100k are
-- COUNTRY-LEVEL World Bank figures; `source` says so for every value.
-- ---------------------------------------------------------------------------
create view public.city_metrics
with (security_invoker = true)
as
select
  c.id as city_id,
  ci.price_level_index as cost_index,
  ci.homicide_rate_per_100k,
  round(ci.physicians_per_1000 * 100, 1) as health_access_per_100k,
  m.pollution_pm25,
  m.climate_comfort,
  m.updated_at,
  coalesce(ci.source, '{}'::jsonb) || coalesce(m.source, '{}'::jsonb) as source
from public.cities c
left join public.city_live_metrics m on m.city_id = c.id
left join public.country_indicators ci on ci.iso2 = c.iso2;

comment on view public.city_metrics is
  'Per-city metrics read model: live Open-Meteo values + country-level World Bank indicators.';

grant select on public.city_metrics to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- city_ai_insights — AI city briefing (365 day TTL, invalidated by
-- prompt_version bumps in src/lib/providers/gemini.ts).
-- ---------------------------------------------------------------------------
create table public.city_ai_insights (
  city_id bigint primary key references public.cities (id) on delete cascade,
  intro text not null check (char_length(intro) <= 4000),
  attractions jsonb not null default '[]'::jsonb check (jsonb_typeof(attractions) = 'array'),
  seasons jsonb not null default '[]'::jsonb check (jsonb_typeof(seasons) = 'array'),
  weather jsonb not null default '[]'::jsonb check (jsonb_typeof(weather) = 'array'),
  prompt_version smallint not null check (prompt_version > 0),
  updated_at timestamptz not null default now()
);

alter table public.city_ai_insights enable row level security;

create policy "ai insights are publicly readable"
  on public.city_ai_insights for select
  to anon, authenticated
  using (true);

grant select on public.city_ai_insights to anon, authenticated;
grant select, insert, update, delete on public.city_ai_insights to service_role;

-- ---------------------------------------------------------------------------
-- ai_trending_cache — single-row list of "City, Country" strings (24 h TTL).
-- ---------------------------------------------------------------------------
create table public.ai_trending_cache (
  id smallint primary key default 1 check (id = 1),
  city_names jsonb not null default '[]'::jsonb check (jsonb_typeof(city_names) = 'array'),
  prompt_version smallint not null check (prompt_version > 0),
  updated_at timestamptz not null default now()
);

alter table public.ai_trending_cache enable row level security;

create policy "trending cache is publicly readable"
  on public.ai_trending_cache for select
  to anon, authenticated
  using (true);

grant select on public.ai_trending_cache to anon, authenticated;
grant select, insert, update, delete on public.ai_trending_cache to service_role;

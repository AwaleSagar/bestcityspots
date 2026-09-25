-- =============================================================================
-- Reference data: countries, cities, search aliases, country indicators.
--
-- Loaded by scripts/db/seed-geonames.ts (GeoNames, CC BY 4.0) and
-- scripts/db/import-world-bank.ts (World Bank WDI, CC BY 4.0). Public read,
-- server-only write (the secret key maps to `service_role`).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- countries (GeoNames countryInfo.txt)
-- ---------------------------------------------------------------------------
create table public.countries (
  iso2 text primary key check (iso2 ~ '^[A-Z]{2}$'),
  iso3 text not null unique check (iso3 ~ '^[A-Z]{3}$'),
  name text not null unique check (char_length(name) between 1 and 120),
  continent text check (continent in ('AF', 'AN', 'AS', 'EU', 'NA', 'OC', 'SA')),
  capital text check (char_length(capital) <= 200),
  population bigint check (population >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Target of the composite FK below, so a city's denormalized country name
  -- and ISO3 can never drift from this table.
  unique (iso2, iso3, name)
);

comment on table public.countries is
  'Countries from GeoNames countryInfo.txt (CC BY 4.0). Written only by scripts/db/seed-geonames.ts.';

create trigger countries_set_updated_at
  before update on public.countries
  for each row execute function private.set_updated_at();

alter table public.countries enable row level security;

create policy "countries are publicly readable"
  on public.countries for select
  to anon, authenticated
  using (true);

grant select on public.countries to anon, authenticated;
grant select, insert, update, delete on public.countries to service_role;

-- ---------------------------------------------------------------------------
-- cities (GeoNames cities15000; id = geonameid)
-- ---------------------------------------------------------------------------
create table public.cities (
  id bigint primary key check (id > 0),
  city text not null check (char_length(city) between 1 and 200),
  city_ascii text not null check (char_length(city_ascii) between 1 and 200),
  -- Canonical URL segment, e.g. `lisbon-portugal`. Computed by the seed
  -- script (collisions get `-<iso2>` then `-<id>`), never by a trigger.
  slug text not null unique
    check (char_length(slug) <= 200 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  country text not null,
  iso2 text not null,
  iso3 text not null,
  admin_name text not null default '' check (char_length(admin_name) <= 200),
  -- primary = national capital, admin = first-level admin seat,
  -- minor = lower-level admin seat (GeoNames PPLC / PPLA / PPLA2-4).
  capital text not null default '' check (capital in ('', 'primary', 'admin', 'minor')),
  population bigint not null default 0 check (population >= 0),
  search_document tsvector generated always as (
    setweight(to_tsvector('simple'::regconfig, private.immutable_unaccent(city)), 'A')
    || setweight(to_tsvector('simple'::regconfig, city_ascii), 'A')
    || setweight(to_tsvector('simple'::regconfig, private.immutable_unaccent(country)), 'B')
    || setweight(to_tsvector('simple'::regconfig, private.immutable_unaccent(admin_name)), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (iso2, iso3, country)
    references public.countries (iso2, iso3, name)
    on update cascade
);

comment on table public.cities is
  'Cities from GeoNames cities15000 (CC BY 4.0). Written only by scripts/db/seed-geonames.ts.';

create trigger cities_set_updated_at
  before update on public.cities
  for each row execute function private.set_updated_at();

-- Top-N listings, sitemap, static params.
create index cities_population_idx on public.cities (population desc)
  include (id, city, city_ascii, slug, country);
-- Country pages (`eq country` + population order) and the composite FK.
create index cities_country_population_idx on public.cities (country, population desc);
create index cities_iso2_iso3_country_idx on public.cities (iso2, iso3, country);
-- Trending-city name matching (`in city`).
create index cities_city_idx on public.cities (city);
-- "Locate me" bounding-box lookups.
create index cities_lat_lng_idx on public.cities (lat, lng);
-- Search. The expressions must match search_cities() exactly or the planner
-- can't use them.
create index cities_search_document_idx on public.cities using gin (search_document);
create index cities_city_ascii_trgm_idx on public.cities
  using gin (lower(city_ascii) extensions.gin_trgm_ops);

alter table public.cities enable row level security;

create policy "cities are publicly readable"
  on public.cities for select
  to anon, authenticated
  using (true);

grant select on public.cities to anon, authenticated;
grant select, insert, update, delete on public.cities to service_role;

-- ---------------------------------------------------------------------------
-- city_aliases (GeoNames alternate names, ASCII only — e.g. Bombay → Mumbai)
-- ---------------------------------------------------------------------------
create table public.city_aliases (
  city_id bigint not null references public.cities (id) on delete cascade,
  alias text not null check (char_length(alias) between 2 and 80),
  primary key (city_id, alias)
);

comment on table public.city_aliases is
  'Alternate city names used by search_cities(). Derived from GeoNames alternatenames.';

create index city_aliases_alias_trgm_idx on public.city_aliases
  using gin (lower(alias) extensions.gin_trgm_ops);

alter table public.city_aliases enable row level security;

create policy "city aliases are publicly readable"
  on public.city_aliases for select
  to anon, authenticated
  using (true);

grant select on public.city_aliases to anon, authenticated;
grant select, insert, update, delete on public.city_aliases to service_role;

-- ---------------------------------------------------------------------------
-- country_indicators (World Bank WDI; country-level, labelled as such)
-- ---------------------------------------------------------------------------
create table public.country_indicators (
  iso2 text primary key references public.countries (iso2) on delete cascade on update cascade,
  -- PPP conversion factor ÷ market exchange rate × 100 (United States = 100).
  price_level_index numeric(7, 2) check (price_level_index > 0),
  price_level_year smallint check (price_level_year between 1990 and 2100),
  -- Intentional homicides per 100,000 people (UNODC via WDI VC.IHR.PSRC.P5).
  homicide_rate_per_100k numeric(8, 3) check (homicide_rate_per_100k >= 0),
  homicide_year smallint check (homicide_year between 1990 and 2100),
  -- Physicians per 1,000 people (WHO via WDI SH.MED.PHYS.ZS).
  physicians_per_1000 numeric(6, 3) check (physicians_per_1000 >= 0),
  physicians_year smallint check (physicians_year between 1990 and 2100),
  -- Human-readable provenance per metric, keyed like CityMetrics.source
  -- (`cost`, `safety`, `health`).
  source jsonb not null default '{}'::jsonb check (jsonb_typeof(source) = 'object'),
  imported_at timestamptz not null default now(),
  check ((price_level_index is null) = (price_level_year is null)),
  check ((homicide_rate_per_100k is null) = (homicide_year is null)),
  check ((physicians_per_1000 is null) = (physicians_year is null))
);

comment on table public.country_indicators is
  'World Bank WDI indicators (CC BY 4.0), country-level. Written only by scripts/db/import-world-bank.ts.';

alter table public.country_indicators enable row level security;

create policy "country indicators are publicly readable"
  on public.country_indicators for select
  to anon, authenticated
  using (true);

grant select on public.country_indicators to anon, authenticated;
grant select, insert, update, delete on public.country_indicators to service_role;

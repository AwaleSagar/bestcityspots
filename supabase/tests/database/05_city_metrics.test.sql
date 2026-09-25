-- city_metrics read model: live values + country-level World Bank indicators,
-- with provenance, and live refreshes that can't clobber durable data.
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into public.countries (iso2, iso3, name) values ('ZZ', 'ZZZ', 'Testland');
insert into public.country_indicators (
  iso2, price_level_index, price_level_year, homicide_rate_per_100k, homicide_year,
  physicians_per_1000, physicians_year, source
) values (
  'ZZ', 55.5, 2024, 1.2, 2023, 3.1, 2022,
  '{"cost": "World Bank WDI · 2024 · country-level", "safety": "World Bank WDI (UNODC) · 2023 · country-level", "health": "World Bank WDI (WHO) · 2022 · country-level"}'
);
insert into public.cities (id, city, city_ascii, slug, lat, lng, country, iso2, iso3, population) values
  (990000201, 'Metricton', 'Metricton', 'metricton-testland', 5, 5, 'Testland', 'ZZ', 'ZZZ', 50000),
  (990000202, 'Quietville', 'Quietville', 'quietville-testland', 6, 6, 'Testland', 'ZZ', 'ZZZ', 40000);
insert into public.city_live_metrics (city_id, pollution_pm25, climate_comfort, source)
values (990000201, 12.3, 'Mild', '{"pollution": "open-meteo/air-quality", "climate": "open-meteo/weather"}');

set local role anon;

select results_eq(
  $$ select cost_index, homicide_rate_per_100k, health_access_per_100k, pollution_pm25, climate_comfort
     from public.city_metrics where city_id = 990000201 $$,
  $$ values (55.50::numeric, 1.200::numeric, 310.0::numeric, 12.30::numeric, 'Mild'::text) $$,
  'live and country-level metrics are combined per city'
);

select ok(
  (select source ?& array['cost', 'safety', 'health', 'pollution', 'climate']
   from public.city_metrics where city_id = 990000201),
  'every metric carries its provenance'
);

select results_eq(
  $$ select cost_index, updated_at from public.city_metrics where city_id = 990000202 $$,
  $$ values (55.50::numeric, null::timestamptz) $$,
  'a city without a live refresh still gets country-level data (and reads as stale)'
);

select throws_ok(
  $$ insert into public.city_live_metrics (city_id, pollution_pm25) values (990000202, 1) $$,
  '42501',
  null,
  'anon cannot write live metrics'
);

reset role;
set local role service_role;

-- A live refresh rewrites only the live row; indicators are untouched.
insert into public.city_live_metrics (city_id, pollution_pm25, climate_comfort, source)
values (990000201, 40.0, 'Hot', '{"pollution": "open-meteo/air-quality"}')
on conflict (city_id) do update set
  pollution_pm25 = excluded.pollution_pm25,
  climate_comfort = excluded.climate_comfort,
  source = excluded.source,
  updated_at = now();

select results_eq(
  $$ select cost_index, pollution_pm25, climate_comfort from public.city_metrics where city_id = 990000201 $$,
  $$ values (55.50::numeric, 40.00::numeric, 'Hot'::text) $$,
  'a live refresh cannot overwrite country indicators'
);

select throws_ok(
  $$ insert into public.city_live_metrics (city_id, climate_comfort) values (990000202, 'Balmy') $$,
  '23514',
  null,
  'climate comfort values are constrained'
);

select * from finish();
rollback;

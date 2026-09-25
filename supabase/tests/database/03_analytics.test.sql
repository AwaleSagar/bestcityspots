-- Aggregate analytics RPCs: exact session rates, NULL-dimension dedupe,
-- accepted actions, and tolerance of unknown city ids.
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into public.countries (iso2, iso3, name) values ('ZZ', 'ZZZ', 'Testland');
insert into public.cities (id, city, city_ascii, slug, lat, lng, country, iso2, iso3, population)
values (990000101, 'Viewville', 'Viewville', 'viewville-testland', 1, 1, 'Testland', 'ZZ', 'ZZZ', 1000);

set local role service_role;

-- Two ended sessions (one bounced) plus a mid-session batch with no end event.
select public.upsert_daily_visitor_stats(date '2026-02-01', 3, 1, 1, 0, 1, 0, 120);
select public.upsert_daily_visitor_stats(date '2026-02-01', 1, 1, 0, 1, 1, 1, 10);
select public.upsert_daily_visitor_stats(date '2026-02-01', 2, 1, 0, 1, 0, 0, 0);

select results_eq(
  $$ select page_views, sessions, sessions_ended, avg_session_duration_sec, bounce_rate_pct
     from public.daily_visitor_summary where stat_date = date '2026-02-01' $$,
  $$ values (6, 3, 2, 65, 50.0::numeric) $$,
  'rates derive from ended sessions only; batches without an end do not skew them'
);

select throws_ok(
  $$ select public.upsert_daily_visitor_stats(date '2026-02-01', 1, 1, 0, 0, 1, 2, 5) $$,
  '22023',
  'invalid visitor stats payload',
  'more bounces than ended sessions is rejected'
);
select throws_ok(
  $$ select public.upsert_daily_visitor_stats(date '2026-02-01', -1, 1, 0, 0, 0, 0, 0) $$,
  '22023',
  'invalid visitor stats payload',
  'negative counters are rejected'
);

-- NULL dimensions collapse into one row instead of piling up duplicates.
select public.upsert_device_stats(date '2026-02-01', 'mobile', null, null);
select public.upsert_device_stats(date '2026-02-01', 'mobile', null, null);
select results_eq(
  $$ select count(*)::int, sum(visits)::int from public.device_stats_daily
     where stat_date = date '2026-02-01' and device_type = 'mobile' $$,
  $$ values (1, 2) $$,
  'unknown browser/os dedupe into a single counter'
);

select public.upsert_geo_stats(date '2026-02-01', 'fr', 'France', null);
select public.upsert_geo_stats(date '2026-02-01', 'FR', 'France', null);
select results_eq(
  $$ select country_code, city, visits from public.geo_stats_daily where stat_date = date '2026-02-01' $$,
  $$ values ('FR'::text, ''::text, 2) $$,
  'country-only geo rows dedupe and country codes are normalised'
);

select public.upsert_traffic_source(date '2026-02-01', 'organic', 'Google', 1, 1);
select public.upsert_traffic_source(date '2026-02-01', 'organic', 'Google', 1, 0);
select results_eq(
  $$ select visits, new_visitors from public.traffic_sources_daily
     where stat_date = date '2026-02-01' and source_name = 'Google' $$,
  $$ values (2, 1) $$,
  'traffic sources accumulate visits and new visitors'
);

-- City views: unknown ids ignored, known ids counted and ranked.
select lives_ok(
  $$ select public.upsert_city_views(date '2026-02-01', 123456789012) $$,
  'an unknown city id does not raise'
);
select is(
  (select count(*)::int from public.city_views_daily where city_id = 123456789012),
  0,
  'an unknown city id is not stored'
);
select public.upsert_city_views(current_date, 990000101);
select public.upsert_city_views(current_date, 990000101);
select public.upsert_city_views(current_date, 990000101);
select results_eq(
  $$ select city_id, views from public.get_cities_by_traffic(1, 30) $$,
  $$ values (990000101::bigint, 3::bigint) $$,
  'get_cities_by_traffic ranks recent views'
);

-- Actions.
select lives_ok(
  $$ select public.upsert_user_action(date '2026-02-01', 'click_affiliate') $$,
  'click_affiliate is an accepted action'
);
select throws_ok(
  $$ select public.upsert_user_action(date '2026-02-01', 'drop_tables') $$,
  '23514',
  null,
  'unknown actions are rejected'
);
select is(
  (select action_count from public.user_actions_daily
   where stat_date = date '2026-02-01' and action_type = 'click_affiliate'),
  1,
  'actions are counted'
);

select * from finish();
rollback;

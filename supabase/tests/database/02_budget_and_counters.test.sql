-- Cost guard, anonymous save counters and cache sampling, called the way the
-- app calls them: with the secret key (service_role).
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

set local role service_role;

-- claim_provider_use: atomic, never exceeds the limit.
select is(public.claim_provider_use('test-provider', date '2026-01-01', 2), true, 'first claim under the limit succeeds');
select is(public.claim_provider_use('test-provider', date '2026-01-01', 2), true, 'claim reaching the limit succeeds');
select is(public.claim_provider_use('test-provider', date '2026-01-01', 2), false, 'claim beyond the limit is refused');
select is(
  (select used from public.provider_daily_usage where provider = 'test-provider' and day = date '2026-01-01'),
  2,
  'usage is capped at the limit'
);
select is(public.claim_provider_use('test-provider', date '2026-01-02', 0), false, 'a zero limit always refuses');
select is(public.claim_provider_use('test-provider', date '2026-01-03', 1), true, 'a new day starts a new budget');

-- record_place_save / get_place_save_totals.
select lives_ok($$ select public.record_place_save('ChIJtest1234') $$, 'valid place id is recorded');
select public.record_place_save('ChIJtest1234');
select throws_ok(
  $$ select public.record_place_save('not a place id!') $$,
  '22023',
  'invalid place id',
  'malformed place id is rejected'
);
select results_eq(
  $$ select place_id, total from public.get_place_save_totals(array['ChIJtest1234', 'ChIJunknown00']) $$,
  $$ values ('ChIJtest1234'::text, 2::bigint) $$,
  'totals sum saves and omit unknown ids'
);

-- record_cache_event.
select public.record_cache_event('places:hotels', true);
select public.record_cache_event('places:hotels', true);
select public.record_cache_event('places:hotels', false);
select results_eq(
  $$ select hit_count, miss_count from public.cache_hit_stats
     where cache_type = 'places:hotels' and event_date = current_date $$,
  $$ values (2::bigint, 1::bigint) $$,
  'cache events accumulate hits and misses per day'
);

select throws_ok(
  $$ select public.record_cache_event('Bad Type With Spaces', true) $$,
  '23514',
  null,
  'cache type format is enforced'
);

select * from finish();
rollback;

-- Security posture: RLS everywhere, explicit grants, no privilege-escalating
-- functions, and service-only RPCs unreachable by browser-facing roles.
begin;
create extension if not exists pgtap with schema extensions;
select plan(31);

-- Every table in `public` has RLS enabled.
select is(
  (select count(*)::int from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
  0,
  'every public table has row level security enabled'
);

-- No SECURITY DEFINER functions in our schemas (they would bypass RLS).
select is(
  (select count(*)::int from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('public', 'private') and p.prosecdef),
  0,
  'no SECURITY DEFINER functions in public/private'
);

-- Every function in our schemas pins search_path.
select is(
  (select count(*)::int from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('public', 'private')
     and not exists (
       select 1 from unnest(coalesce(p.proconfig, '{}')) cfg where cfg like 'search_path=%'
     )),
  0,
  'every public/private function sets search_path'
);

-- Views run with the caller's privileges.
select is(
  (select count(*)::int from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'v'
     and not coalesce('security_invoker=true' = any (c.reloptions), false)),
  0,
  'every public view is security_invoker'
);

-- Public reference data + caches: anon may read, never write.
select ok(has_table_privilege('anon', 'public.cities', 'select'), 'anon can read cities');
select ok(not has_table_privilege('anon', 'public.cities', 'insert'), 'anon cannot insert cities');
select ok(not has_table_privilege('anon', 'public.cities', 'update'), 'anon cannot update cities');
select ok(not has_table_privilege('anon', 'public.cities', 'delete'), 'anon cannot delete cities');
select ok(has_table_privilege('anon', 'public.city_metrics', 'select'), 'anon can read the city_metrics view');
select ok(not has_table_privilege('anon', 'public.city_places_cache', 'insert'), 'anon cannot write the places cache');
select ok(not has_table_privilege('anon', 'public.city_ai_insights', 'update'), 'anon cannot write AI insights');
select ok(not has_table_privilege('authenticated', 'public.city_weather_cache', 'insert'), 'authenticated cannot write the weather cache');

-- Server-only ledgers: invisible to anon entirely.
select ok(not has_table_privilege('anon', 'public.provider_daily_usage', 'select'), 'anon cannot read provider usage');
select ok(not has_table_privilege('anon', 'public.place_saves_daily', 'select'), 'anon cannot read place saves');
select ok(not has_table_privilege('anon', 'public.daily_visitor_stats', 'select'), 'anon cannot read analytics');
select ok(not has_table_privilege('anon', 'public.app_admins', 'select'), 'anon cannot read app_admins');
select ok(not has_table_privilege('authenticated', 'public.app_admins', 'insert'), 'authenticated cannot grant itself admin');
select ok(not has_table_privilege('authenticated', 'public.provider_daily_usage', 'update'), 'authenticated cannot write provider usage');

-- Service-only RPCs: no EXECUTE for anon/authenticated (the 2026-09 audit gap).
select ok(not has_function_privilege('anon', 'public.claim_provider_use(text, date, integer)', 'execute'), 'anon cannot claim provider budget');
select ok(not has_function_privilege('authenticated', 'public.claim_provider_use(text, date, integer)', 'execute'), 'authenticated cannot claim provider budget');
select ok(not has_function_privilege('anon', 'public.record_place_save(text)', 'execute'), 'anon cannot record place saves');
select ok(not has_function_privilege('anon', 'public.get_place_save_totals(text[])', 'execute'), 'anon cannot read save totals');
select ok(not has_function_privilege('anon', 'public.record_cache_event(text, boolean)', 'execute'), 'anon cannot record cache events');
select ok(not has_function_privilege('anon', 'public.upsert_daily_visitor_stats(date, integer, integer, integer, integer, integer, integer, integer)', 'execute'), 'anon cannot write visitor stats');
select ok(not has_function_privilege('anon', 'public.upsert_city_views(date, bigint)', 'execute'), 'anon cannot write city views');
select ok(not has_function_privilege('anon', 'public.get_cities_by_traffic(integer, integer)', 'execute'), 'anon cannot read traffic ranking');
select ok(has_function_privilege('service_role', 'public.claim_provider_use(text, date, integer)', 'execute'), 'service_role can claim provider budget');

-- The one browser-callable RPC.
select ok(has_function_privilege('anon', 'public.search_cities(text, integer)', 'execute'), 'anon can search cities');

-- Behavioural check (not just catalog flags): anon really is refused.
set local role anon;
select throws_ok(
  $$ insert into public.cities (id, city, city_ascii, slug, lat, lng, country, iso2, iso3)
     values (1, 'x', 'x', 'x', 0, 0, 'x', 'XX', 'XXX') $$,
  '42501',
  null,
  'anon insert into cities is rejected'
);
select throws_ok(
  $$ select public.claim_provider_use('gemini', current_date, 100) $$,
  '42501',
  null,
  'anon call to claim_provider_use is rejected'
);
reset role;

-- Storage bucket is public-read, jpeg-only, size-capped.
select results_eq(
  $$ select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'place_images' $$,
  $$ values (true, 1048576::bigint, array['image/jpeg']) $$,
  'place_images bucket is public, 1 MiB, image/jpeg only'
);

select * from finish();
rollback;

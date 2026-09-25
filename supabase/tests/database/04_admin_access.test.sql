-- Admin-only auth: RLS lets admins (and only admins) read operational data
-- with their own session; nobody but service_role can grant admin.
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000a001', 'admin@example.test'),
  ('00000000-0000-4000-8000-00000000b002', 'reader@example.test');
insert into public.app_admins (user_id, email)
values ('00000000-0000-4000-8000-00000000a001', 'admin@example.test');

insert into public.daily_visitor_stats (stat_date, page_views, sessions) values (date '2026-03-01', 10, 4);
insert into public.provider_daily_usage (provider, day, used) values ('gemini', date '2026-03-01', 7);

-- Signed-in, but not an admin.
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-00000000b002", "role": "authenticated"}';

select is((select private.is_admin()), false, 'a regular user is not an admin');
select is((select count(*)::int from public.daily_visitor_stats), 0, 'a regular user sees no analytics');
select is((select count(*)::int from public.provider_daily_usage), 0, 'a regular user sees no provider usage');
select is((select count(*)::int from public.app_admins), 0, 'a regular user cannot list admins');
select throws_ok(
  $$ insert into public.app_admins (user_id, email)
     values ('00000000-0000-4000-8000-00000000b002', 'reader@example.test') $$,
  '42501',
  null,
  'a regular user cannot make themselves admin'
);

-- Signed in as the admin.
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-00000000a001", "role": "authenticated"}';

select is((select private.is_admin()), true, 'the admin is recognised');
select is((select count(*)::int from public.daily_visitor_stats), 1, 'the admin reads analytics');
select is((select used from public.provider_daily_usage where provider = 'gemini'), 7, 'the admin reads provider usage');
select is((select count(*)::int from public.app_admins), 1, 'the admin sees only their own membership row');
select throws_ok(
  $$ update public.daily_visitor_stats set page_views = 0 $$,
  '42501',
  null,
  'admin access is read-only'
);

-- Anonymous visitors can't even attempt it.
reset role;
set local role anon;
select throws_ok(
  $$ select count(*) from public.daily_visitor_stats $$,
  '42501',
  null,
  'anon has no access to analytics'
);

select * from finish();
rollback;

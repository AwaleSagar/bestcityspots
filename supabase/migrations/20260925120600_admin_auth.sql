-- =============================================================================
-- Admin-only authentication.
--
-- The public site has no accounts. Supabase Auth exists solely for invite-only
-- admins: self-service sign-up is disabled (supabase/config.toml and the
-- hosted Auth settings), and an account only becomes an admin when
-- `npm run admin -- add <email>` (secret key) inserts it into app_admins.
--
-- Admins read the operational ledgers through RLS with their own session —
-- the admin UI never uses the secret key.
-- =============================================================================

create table public.app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null check (char_length(email) between 3 and 320),
  created_at timestamptz not null default now()
);

comment on table public.app_admins is
  'Users allowed into /admin. Managed only by scripts/admin.ts with the secret key.';

alter table public.app_admins enable row level security;

-- A signed-in user may learn whether *they* are an admin, nothing more.
create policy "users can read their own admin membership"
  on public.app_admins for select
  to authenticated
  using (user_id = (select auth.uid()));

grant select on public.app_admins to authenticated;
grant select, insert, update, delete on public.app_admins to service_role;

-- SECURITY INVOKER on purpose: it only needs the caller's own app_admins row,
-- which the policy above already exposes. Wrapped in (select ...) at call
-- sites so Postgres evaluates it once per statement, not once per row.
create or replace function private.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.app_admins a where a.user_id = (select auth.uid())
  )
$$;

revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Admin read access to operational ledgers.
-- ---------------------------------------------------------------------------
create policy "admins can read daily visitor stats"
  on public.daily_visitor_stats for select to authenticated
  using ((select private.is_admin()));
grant select on public.daily_visitor_stats to authenticated;
grant select on public.daily_visitor_summary to authenticated;

create policy "admins can read traffic sources"
  on public.traffic_sources_daily for select to authenticated
  using ((select private.is_admin()));
grant select on public.traffic_sources_daily to authenticated;

create policy "admins can read device stats"
  on public.device_stats_daily for select to authenticated
  using ((select private.is_admin()));
grant select on public.device_stats_daily to authenticated;

create policy "admins can read geo stats"
  on public.geo_stats_daily for select to authenticated
  using ((select private.is_admin()));
grant select on public.geo_stats_daily to authenticated;

create policy "admins can read city views"
  on public.city_views_daily for select to authenticated
  using ((select private.is_admin()));
grant select on public.city_views_daily to authenticated;

create policy "admins can read user actions"
  on public.user_actions_daily for select to authenticated
  using ((select private.is_admin()));
grant select on public.user_actions_daily to authenticated;

create policy "admins can read provider usage"
  on public.provider_daily_usage for select to authenticated
  using ((select private.is_admin()));
grant select on public.provider_daily_usage to authenticated;

create policy "admins can read cache hit stats"
  on public.cache_hit_stats for select to authenticated
  using ((select private.is_admin()));
grant select on public.cache_hit_stats to authenticated;

create policy "admins can read place saves"
  on public.place_saves_daily for select to authenticated
  using ((select private.is_admin()));
grant select on public.place_saves_daily to authenticated;

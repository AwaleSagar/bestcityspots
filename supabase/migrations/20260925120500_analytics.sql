-- =============================================================================
-- Privacy-first, aggregate-only visitor analytics (written by POST
-- /api/analytics via src/lib/analytics.ts). No per-visitor rows exist: every
-- table is a daily counter. Writes go through service_role-only invoker RPCs;
-- admins read through RLS (admin_auth migration).
--
-- Differences from the retired schema, all deliberate:
--   * Session rates are derived from raw counters (sessions_ended,
--     bounced_sessions, total_session_duration_sec) instead of re-weighted
--     integer averages that drifted on every merge.
--   * Nullable dimensions are stored as '' so composite primary keys dedupe
--     correctly (NULLs never matched ON CONFLICT before).
--   * `click_affiliate` is an accepted action.
--   * Unknown city ids are ignored instead of raising FK errors.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- daily_visitor_stats
-- ---------------------------------------------------------------------------
create table public.daily_visitor_stats (
  stat_date date primary key,
  page_views integer not null default 0 check (page_views >= 0),
  -- Sum of distinct session ids per ingested batch (approximate by design:
  -- the server keeps no session state).
  sessions integer not null default 0 check (sessions >= 0),
  new_visitors integer not null default 0 check (new_visitors >= 0),
  returning_visitors integer not null default 0 check (returning_visitors >= 0),
  sessions_ended integer not null default 0 check (sessions_ended >= 0),
  bounced_sessions integer not null default 0 check (bounced_sessions >= 0),
  total_session_duration_sec bigint not null default 0 check (total_session_duration_sec >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (bounced_sessions <= sessions_ended)
);

create trigger daily_visitor_stats_set_updated_at
  before update on public.daily_visitor_stats
  for each row execute function private.set_updated_at();

alter table public.daily_visitor_stats enable row level security;
grant select, insert, update, delete on public.daily_visitor_stats to service_role;

create or replace function public.upsert_daily_visitor_stats(
  p_date date,
  p_page_views integer,
  p_sessions integer,
  p_new_visitors integer,
  p_returning_visitors integer,
  p_sessions_ended integer,
  p_bounced_sessions integer,
  p_session_duration_sec integer
)
returns void
language plpgsql
volatile
set search_path = ''
as $$
begin
  if p_date is null
    or least(p_page_views, p_sessions, p_new_visitors, p_returning_visitors,
             p_sessions_ended, p_bounced_sessions, p_session_duration_sec) < 0
    or greatest(p_page_views, p_sessions, p_new_visitors, p_returning_visitors,
                p_sessions_ended, p_bounced_sessions) > 1000
    or p_session_duration_sec > 86400
    or p_bounced_sessions > p_sessions_ended
  then
    raise exception 'invalid visitor stats payload' using errcode = '22023';
  end if;

  insert into public.daily_visitor_stats as d (
    stat_date, page_views, sessions, new_visitors, returning_visitors,
    sessions_ended, bounced_sessions, total_session_duration_sec
  )
  values (
    p_date, p_page_views, p_sessions, p_new_visitors, p_returning_visitors,
    p_sessions_ended, p_bounced_sessions, p_session_duration_sec
  )
  on conflict (stat_date) do update set
    page_views = d.page_views + excluded.page_views,
    sessions = d.sessions + excluded.sessions,
    new_visitors = d.new_visitors + excluded.new_visitors,
    returning_visitors = d.returning_visitors + excluded.returning_visitors,
    sessions_ended = d.sessions_ended + excluded.sessions_ended,
    bounced_sessions = d.bounced_sessions + excluded.bounced_sessions,
    total_session_duration_sec = d.total_session_duration_sec + excluded.total_session_duration_sec;
end;
$$;

revoke all on function public.upsert_daily_visitor_stats(date, integer, integer, integer, integer, integer, integer, integer)
  from public, anon, authenticated;
grant execute on function public.upsert_daily_visitor_stats(date, integer, integer, integer, integer, integer, integer, integer)
  to service_role;

-- Derived per-day rates for dashboards and scripts/analytics-report.ts.
create view public.daily_visitor_summary
with (security_invoker = true)
as
select
  stat_date,
  page_views,
  sessions,
  new_visitors,
  returning_visitors,
  sessions_ended,
  case when sessions_ended > 0
    then round(total_session_duration_sec::numeric / sessions_ended)::integer
  end as avg_session_duration_sec,
  case when sessions_ended > 0
    then round(100.0 * bounced_sessions / sessions_ended, 1)
  end as bounce_rate_pct
from public.daily_visitor_stats;

grant select on public.daily_visitor_summary to service_role;

-- ---------------------------------------------------------------------------
-- traffic_sources_daily
-- ---------------------------------------------------------------------------
create table public.traffic_sources_daily (
  stat_date date not null,
  source_type text not null
    check (source_type in ('organic', 'social', 'referral', 'direct', 'paid', 'email', 'other')),
  source_name text not null check (char_length(source_name) between 1 and 100),
  visits integer not null default 0 check (visits >= 0),
  new_visitors integer not null default 0 check (new_visitors >= 0),
  primary key (stat_date, source_type, source_name)
);

alter table public.traffic_sources_daily enable row level security;
grant select, insert, update, delete on public.traffic_sources_daily to service_role;

create or replace function public.upsert_traffic_source(
  p_date date,
  p_source_type text,
  p_source_name text,
  p_visits integer default 1,
  p_new_visitors integer default 0
)
returns void
language sql
volatile
set search_path = ''
as $$
  insert into public.traffic_sources_daily as t (stat_date, source_type, source_name, visits, new_visitors)
  values (p_date, p_source_type, p_source_name, greatest(p_visits, 0), greatest(p_new_visitors, 0))
  on conflict (stat_date, source_type, source_name) do update set
    visits = t.visits + excluded.visits,
    new_visitors = t.new_visitors + excluded.new_visitors
$$;

revoke all on function public.upsert_traffic_source(date, text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.upsert_traffic_source(date, text, text, integer, integer)
  to service_role;

-- ---------------------------------------------------------------------------
-- device_stats_daily ('' = unknown browser / OS)
-- ---------------------------------------------------------------------------
create table public.device_stats_daily (
  stat_date date not null,
  device_type text not null check (device_type in ('desktop', 'mobile', 'tablet', 'other')),
  browser text not null default '' check (char_length(browser) <= 50),
  os text not null default '' check (char_length(os) <= 50),
  visits integer not null default 0 check (visits >= 0),
  primary key (stat_date, device_type, browser, os)
);

alter table public.device_stats_daily enable row level security;
grant select, insert, update, delete on public.device_stats_daily to service_role;

create or replace function public.upsert_device_stats(
  p_date date,
  p_device text,
  p_browser text,
  p_os text
)
returns void
language sql
volatile
set search_path = ''
as $$
  insert into public.device_stats_daily as d (stat_date, device_type, browser, os, visits)
  values (p_date, p_device, coalesce(p_browser, ''), coalesce(p_os, ''), 1)
  on conflict (stat_date, device_type, browser, os) do update set visits = d.visits + 1
$$;

revoke all on function public.upsert_device_stats(date, text, text, text)
  from public, anon, authenticated;
grant execute on function public.upsert_device_stats(date, text, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- geo_stats_daily — recorded only with the visitor's geo consent.
-- ('' city = country-level only)
-- ---------------------------------------------------------------------------
create table public.geo_stats_daily (
  stat_date date not null,
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  country_name text not null check (char_length(country_name) between 1 and 100),
  city text not null default '' check (char_length(city) <= 100),
  visits integer not null default 0 check (visits >= 0),
  primary key (stat_date, country_code, city)
);

alter table public.geo_stats_daily enable row level security;
grant select, insert, update, delete on public.geo_stats_daily to service_role;

create or replace function public.upsert_geo_stats(
  p_date date,
  p_country_code text,
  p_country_name text,
  p_city text default null
)
returns void
language sql
volatile
set search_path = ''
as $$
  insert into public.geo_stats_daily as g (stat_date, country_code, country_name, city, visits)
  values (p_date, upper(p_country_code), p_country_name, coalesce(p_city, ''), 1)
  on conflict (stat_date, country_code, city) do update set
    visits = g.visits + 1,
    country_name = excluded.country_name
$$;

revoke all on function public.upsert_geo_stats(date, text, text, text)
  from public, anon, authenticated;
grant execute on function public.upsert_geo_stats(date, text, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- city_views_daily
-- ---------------------------------------------------------------------------
create table public.city_views_daily (
  stat_date date not null,
  city_id bigint not null references public.cities (id) on delete cascade,
  views integer not null default 0 check (views >= 0),
  primary key (stat_date, city_id)
);

create index city_views_daily_city_idx on public.city_views_daily (city_id);

alter table public.city_views_daily enable row level security;
grant select, insert, update, delete on public.city_views_daily to service_role;

-- City ids arrive from the browser, so unknown ids are dropped silently
-- rather than surfacing FK violations.
create or replace function public.upsert_city_views(p_date date, p_city_id bigint)
returns void
language sql
volatile
set search_path = ''
as $$
  insert into public.city_views_daily as v (stat_date, city_id, views)
  select p_date, c.id, 1
  from public.cities c
  where c.id = p_city_id
  on conflict (stat_date, city_id) do update set views = v.views + 1
$$;

revoke all on function public.upsert_city_views(date, bigint) from public, anon, authenticated;
grant execute on function public.upsert_city_views(date, bigint) to service_role;

-- Most-viewed cities over a trailing window; drives demand-based cache
-- pre-warming (scripts/warm-cache.ts) and the home page "living index".
create or replace function public.get_cities_by_traffic(
  result_limit integer default 50,
  lookback_days integer default 30
)
returns table (city_id bigint, views bigint)
language sql
stable
set search_path = ''
as $$
  select v.city_id, sum(v.views)::bigint as views
  from public.city_views_daily v
  where v.stat_date >= current_date - least(greatest(coalesce(lookback_days, 30), 1), 365)
  group by v.city_id
  order by views desc, v.city_id
  limit least(greatest(coalesce(result_limit, 50), 1), 500)
$$;

revoke all on function public.get_cities_by_traffic(integer, integer) from public, anon, authenticated;
grant execute on function public.get_cities_by_traffic(integer, integer) to service_role;

-- ---------------------------------------------------------------------------
-- user_actions_daily (values mirror ActionType in src/lib/analytics.ts)
-- ---------------------------------------------------------------------------
create table public.user_actions_daily (
  stat_date date not null,
  action_type text not null check (action_type in (
    'search', 'save_place', 'remove_save', 'add_note', 'delete_note', 'view_guide',
    'view_city', 'click_maps_link', 'share', 'download_itinerary', 'click_affiliate'
  )),
  action_count integer not null default 0 check (action_count >= 0),
  primary key (stat_date, action_type)
);

alter table public.user_actions_daily enable row level security;
grant select, insert, update, delete on public.user_actions_daily to service_role;

create or replace function public.upsert_user_action(p_date date, p_action text)
returns void
language sql
volatile
set search_path = ''
as $$
  insert into public.user_actions_daily as a (stat_date, action_type, action_count)
  values (p_date, p_action, 1)
  on conflict (stat_date, action_type) do update set action_count = a.action_count + 1
$$;

revoke all on function public.upsert_user_action(date, text) from public, anon, authenticated;
grant execute on function public.upsert_user_action(date, text) to service_role;

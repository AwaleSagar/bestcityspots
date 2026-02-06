-- Analytics RPC Functions for atomic upserts
-- These functions handle concurrent writes safely with ON CONFLICT

-- =============================================================================
-- 1. Upsert Daily Visitor Stats
-- =============================================================================
create or replace function public.upsert_daily_visitor_stats(
  p_date date,
  p_visits integer,
  p_unique integer,
  p_pageviews integer,
  p_duration integer,
  p_bounce integer,
  p_new integer,
  p_returning integer
)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.daily_visitor_stats (
    stat_date, 
    total_visits, 
    unique_visitors, 
    page_views,
    avg_session_duration_sec,
    bounce_rate_pct,
    new_visitors,
    returning_visitors
  )
  values (
    p_date, 
    p_visits, 
    p_unique, 
    p_pageviews,
    p_duration,
    case when p_visits > 0 then (p_bounce * 100 / p_visits) else 0 end,
    p_new,
    p_returning
  )
  on conflict (stat_date)
  do update set
    total_visits = daily_visitor_stats.total_visits + excluded.total_visits,
    unique_visitors = daily_visitor_stats.unique_visitors + excluded.unique_visitors,
    page_views = daily_visitor_stats.page_views + excluded.page_views,
    avg_session_duration_sec = case 
      when daily_visitor_stats.total_visits + excluded.total_visits > 0 
      then ((daily_visitor_stats.avg_session_duration_sec * daily_visitor_stats.total_visits) + 
            (excluded.avg_session_duration_sec * excluded.total_visits)) / 
           (daily_visitor_stats.total_visits + excluded.total_visits)
      else 0 
    end,
    bounce_rate_pct = case 
      when daily_visitor_stats.total_visits + excluded.total_visits > 0 
      then ((daily_visitor_stats.bounce_rate_pct * daily_visitor_stats.total_visits) + 
            (excluded.bounce_rate_pct * excluded.total_visits)) / 
           (daily_visitor_stats.total_visits + excluded.total_visits)
      else 0 
    end,
    new_visitors = daily_visitor_stats.new_visitors + excluded.new_visitors,
    returning_visitors = daily_visitor_stats.returning_visitors + excluded.returning_visitors,
    updated_at = timezone('utc', now());
end;
$$;

-- =============================================================================
-- 2. Upsert Traffic Sources
-- =============================================================================
create or replace function public.upsert_traffic_source(
  p_date date,
  p_source_type text,
  p_source_name text,
  p_visits integer default 1,
  p_unique integer default 1
)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.traffic_sources_daily (
    stat_date,
    source_type,
    source_name,
    visits,
    unique_visitors
  )
  values (p_date, p_source_type, p_source_name, p_visits, p_unique)
  on conflict (stat_date, source_type, source_name)
  do update set
    visits = traffic_sources_daily.visits + excluded.visits,
    unique_visitors = traffic_sources_daily.unique_visitors + excluded.unique_visitors;
end;
$$;

-- =============================================================================
-- 3. Upsert Device Stats
-- =============================================================================
create or replace function public.upsert_device_stats(
  p_date date,
  p_device text,
  p_browser text,
  p_os text
)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.device_stats_daily (
    stat_date,
    device_type,
    browser,
    os,
    visits
  )
  values (p_date, p_device, p_browser, p_os, 1)
  on conflict (stat_date, device_type, browser, os)
  do update set
    visits = device_stats_daily.visits + 1;
end;
$$;

-- =============================================================================
-- 4. Upsert Geo Stats
-- =============================================================================
create or replace function public.upsert_geo_stats(
  p_date date,
  p_country_code text,
  p_country_name text,
  p_city text default null
)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.geo_stats_daily (
    stat_date,
    country_code,
    country_name,
    city,
    visits,
    unique_visitors,
    consent_based
  )
  values (p_date, p_country_code, p_country_name, p_city, 1, 1, true)
  on conflict (stat_date, country_code, city)
  do update set
    visits = geo_stats_daily.visits + 1,
    unique_visitors = geo_stats_daily.unique_visitors + 1;
end;
$$;

-- =============================================================================
-- 5. Upsert City Views
-- =============================================================================
create or replace function public.upsert_city_views(
  p_date date,
  p_city_id integer
)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.city_views_daily (
    stat_date,
    city_id,
    views,
    unique_viewers
  )
  values (p_date, p_city_id, 1, 1)
  on conflict (stat_date, city_id)
  do update set
    views = city_views_daily.views + 1,
    unique_viewers = city_views_daily.unique_viewers + 1;
end;
$$;

-- =============================================================================
-- 6. Upsert User Action
-- =============================================================================
create or replace function public.upsert_user_action(
  p_date date,
  p_action text
)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.user_actions_daily (
    stat_date,
    action_type,
    action_count
  )
  values (p_date, p_action, 1)
  on conflict (stat_date, action_type)
  do update set
    action_count = user_actions_daily.action_count + 1;
end;
$$;

-- Grant execute permissions to service_role
grant execute on function public.upsert_daily_visitor_stats to service_role;
grant execute on function public.upsert_traffic_source to service_role;
grant execute on function public.upsert_device_stats to service_role;
grant execute on function public.upsert_geo_stats to service_role;
grant execute on function public.upsert_city_views to service_role;
grant execute on function public.upsert_user_action to service_role;

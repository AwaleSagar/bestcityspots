-- Visitor Analytics Tables for Marketing Team
-- Aggregate-focused tables storing daily summaries (privacy-friendly)
-- Run in Supabase SQL Editor or via MCP

-- ============================================
-- 1. DAILY VISITOR STATS - Core daily metrics
-- ============================================
create table if not exists public.daily_visitor_stats (
  stat_date date primary key,
  total_visits integer not null default 0,
  unique_visitors integer not null default 0,
  page_views integer not null default 0,
  avg_session_duration_sec integer default 0,
  bounce_rate_pct integer default 0,
  new_visitors integer not null default 0,
  returning_visitors integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.daily_visitor_stats is 'Core daily visitor metrics for marketing analytics';

-- ============================================
-- 2. TRAFFIC SOURCES DAILY - Where visitors come from
-- ============================================
create table if not exists public.traffic_sources_daily (
  id bigint generated always as identity primary key,
  stat_date date not null,
  source_type text not null check (source_type in ('organic', 'social', 'referral', 'direct', 'paid', 'email', 'other')),
  source_name text not null,
  visits integer not null default 0,
  unique_visitors integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  
  unique (stat_date, source_type, source_name)
);

comment on table public.traffic_sources_daily is 'Daily breakdown of traffic by source (Google, Facebook, direct, etc.)';

-- ============================================
-- 3. DEVICE STATS DAILY - Device breakdown
-- ============================================
create table if not exists public.device_stats_daily (
  id bigint generated always as identity primary key,
  stat_date date not null,
  device_type text not null check (device_type in ('desktop', 'mobile', 'tablet', 'other')),
  browser text,
  os text,
  visits integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  
  unique (stat_date, device_type, browser, os)
);

comment on table public.device_stats_daily is 'Daily breakdown of visitors by device, browser, and OS';

-- ============================================
-- 4. GEO STATS DAILY - Geographic distribution (consent-based)
-- ============================================
create table if not exists public.geo_stats_daily (
  id bigint generated always as identity primary key,
  stat_date date not null,
  country_code text not null,
  country_name text not null,
  city text,
  visits integer not null default 0,
  unique_visitors integer not null default 0,
  consent_based boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  
  unique (stat_date, country_code, city)
);

comment on table public.geo_stats_daily is 'Daily geographic distribution of visitors (collected with consent)';

-- ============================================
-- 5. CITY VIEWS DAILY - Which cities users explore
-- ============================================
create table if not exists public.city_views_daily (
  id bigint generated always as identity primary key,
  stat_date date not null,
  city_id integer not null references public.cities(id) on delete cascade,
  views integer not null default 0,
  unique_viewers integer not null default 0,
  saves integer not null default 0,
  notes_added integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  
  unique (stat_date, city_id)
);

comment on table public.city_views_daily is 'Daily stats for which cities users are exploring on the platform';

-- ============================================
-- 6. USER ACTIONS DAILY - Aggregate user behavior
-- ============================================
create table if not exists public.user_actions_daily (
  id bigint generated always as identity primary key,
  stat_date date not null,
  action_type text not null check (action_type in (
    'search',
    'save_place',
    'remove_save',
    'add_note',
    'delete_note',
    'view_guide',
    'view_city',
    'click_maps_link',
    'share',
    'download_itinerary'
  )),
  action_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  
  unique (stat_date, action_type)
);

comment on table public.user_actions_daily is 'Daily aggregate counts of user actions for behavior analytics';

-- ============================================
-- INDEXES for fast date-range queries
-- ============================================
create index if not exists daily_visitor_stats_date_idx 
  on public.daily_visitor_stats (stat_date desc);

create index if not exists traffic_sources_daily_date_idx 
  on public.traffic_sources_daily (stat_date desc);

create index if not exists traffic_sources_daily_source_idx 
  on public.traffic_sources_daily (source_type, source_name);

create index if not exists device_stats_daily_date_idx 
  on public.device_stats_daily (stat_date desc);

create index if not exists device_stats_daily_device_idx 
  on public.device_stats_daily (device_type);

create index if not exists geo_stats_daily_date_idx 
  on public.geo_stats_daily (stat_date desc);

create index if not exists geo_stats_daily_country_idx 
  on public.geo_stats_daily (country_code);

create index if not exists city_views_daily_date_idx 
  on public.city_views_daily (stat_date desc);

create index if not exists city_views_daily_city_idx 
  on public.city_views_daily (city_id);

create index if not exists city_views_daily_views_idx 
  on public.city_views_daily (views desc);

create index if not exists user_actions_daily_date_idx 
  on public.user_actions_daily (stat_date desc);

create index if not exists user_actions_daily_action_idx 
  on public.user_actions_daily (action_type);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
alter table public.daily_visitor_stats enable row level security;
alter table public.traffic_sources_daily enable row level security;
alter table public.device_stats_daily enable row level security;
alter table public.geo_stats_daily enable row level security;
alter table public.city_views_daily enable row level security;
alter table public.user_actions_daily enable row level security;

-- SELECT policies: Only authenticated users (marketing team) can read
drop policy if exists daily_visitor_stats_select on public.daily_visitor_stats;
create policy daily_visitor_stats_select on public.daily_visitor_stats
  for select to authenticated using (true);

drop policy if exists traffic_sources_daily_select on public.traffic_sources_daily;
create policy traffic_sources_daily_select on public.traffic_sources_daily
  for select to authenticated using (true);

drop policy if exists device_stats_daily_select on public.device_stats_daily;
create policy device_stats_daily_select on public.device_stats_daily
  for select to authenticated using (true);

drop policy if exists geo_stats_daily_select on public.geo_stats_daily;
create policy geo_stats_daily_select on public.geo_stats_daily
  for select to authenticated using (true);

drop policy if exists city_views_daily_select on public.city_views_daily;
create policy city_views_daily_select on public.city_views_daily
  for select to authenticated using (true);

drop policy if exists user_actions_daily_select on public.user_actions_daily;
create policy user_actions_daily_select on public.user_actions_daily
  for select to authenticated using (true);

-- INSERT policies: Only service_role (backend API) can write
drop policy if exists daily_visitor_stats_insert on public.daily_visitor_stats;
create policy daily_visitor_stats_insert on public.daily_visitor_stats
  for insert to service_role with check (true);

drop policy if exists traffic_sources_daily_insert on public.traffic_sources_daily;
create policy traffic_sources_daily_insert on public.traffic_sources_daily
  for insert to service_role with check (true);

drop policy if exists device_stats_daily_insert on public.device_stats_daily;
create policy device_stats_daily_insert on public.device_stats_daily
  for insert to service_role with check (true);

drop policy if exists geo_stats_daily_insert on public.geo_stats_daily;
create policy geo_stats_daily_insert on public.geo_stats_daily
  for insert to service_role with check (true);

drop policy if exists city_views_daily_insert on public.city_views_daily;
create policy city_views_daily_insert on public.city_views_daily
  for insert to service_role with check (true);

drop policy if exists user_actions_daily_insert on public.user_actions_daily;
create policy user_actions_daily_insert on public.user_actions_daily
  for insert to service_role with check (true);

-- UPDATE policies: Only service_role can update
drop policy if exists daily_visitor_stats_update on public.daily_visitor_stats;
create policy daily_visitor_stats_update on public.daily_visitor_stats
  for update to service_role using (true);

drop policy if exists traffic_sources_daily_update on public.traffic_sources_daily;
create policy traffic_sources_daily_update on public.traffic_sources_daily
  for update to service_role using (true);

drop policy if exists device_stats_daily_update on public.device_stats_daily;
create policy device_stats_daily_update on public.device_stats_daily
  for update to service_role using (true);

drop policy if exists geo_stats_daily_update on public.geo_stats_daily;
create policy geo_stats_daily_update on public.geo_stats_daily
  for update to service_role using (true);

drop policy if exists city_views_daily_update on public.city_views_daily;
create policy city_views_daily_update on public.city_views_daily
  for update to service_role using (true);

drop policy if exists user_actions_daily_update on public.user_actions_daily;
create policy user_actions_daily_update on public.user_actions_daily
  for update to service_role using (true);

-- ============================================
-- HELPER FUNCTION: Update timestamp on modification
-- ============================================
create or replace function public.update_analytics_timestamp()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

-- Trigger for daily_visitor_stats (only table with updated_at)
drop trigger if exists daily_visitor_stats_updated_at on public.daily_visitor_stats;
create trigger daily_visitor_stats_updated_at
  before update on public.daily_visitor_stats
  for each row execute function public.update_analytics_timestamp();

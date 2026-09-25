-- =============================================================================
-- Server-only ledgers: the paid-provider cost guard, anonymous place-save
-- counters and cache hit/miss sampling.
--
-- No Data API role other than service_role can touch these tables, and every
-- RPC is SECURITY INVOKER with EXECUTE granted to service_role only — so even
-- a mistakenly granted EXECUTE could not bypass RLS. Admins get read access in
-- the admin_auth migration.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- provider_daily_usage — durable per-day call counter (src/lib/cost-guard.ts).
-- ---------------------------------------------------------------------------
create table public.provider_daily_usage (
  provider text not null check (provider ~ '^[a-z0-9-]{1,40}$'),
  day date not null,
  used integer not null default 0 check (used >= 0),
  updated_at timestamptz not null default now(),
  primary key (provider, day)
);

alter table public.provider_daily_usage enable row level security;
grant select, insert, update, delete on public.provider_daily_usage to service_role;

-- Atomically claim one unit of today's budget. Returns false once `used`
-- reaches `p_limit` (or when the limit is not positive). A single upsert with
-- a guarded DO UPDATE makes concurrent claims safe without explicit locks.
create or replace function public.claim_provider_use(p_provider text, p_day date, p_limit integer)
returns boolean
language plpgsql
volatile
set search_path = ''
as $$
declare
  claimed integer;
begin
  if p_limit is null or p_limit <= 0 then
    return false;
  end if;

  insert into public.provider_daily_usage as u (provider, day, used, updated_at)
  values (p_provider, p_day, 1, now())
  on conflict (provider, day) do update
    set used = u.used + 1, updated_at = now()
    where u.used < p_limit
  returning u.used into claimed;

  return claimed is not null;
end;
$$;

revoke all on function public.claim_provider_use(text, date, integer) from public, anon, authenticated;
grant execute on function public.claim_provider_use(text, date, integer) to service_role;

-- ---------------------------------------------------------------------------
-- place_saves_daily — anonymous "N travelers saved this" counters (US-12).
-- No user identifiers anywhere: one row per place per day.
-- ---------------------------------------------------------------------------
create table public.place_saves_daily (
  place_id text not null check (place_id ~ '^[A-Za-z0-9_-]{4,128}$'),
  day date not null default current_date,
  saves integer not null default 0 check (saves >= 0),
  primary key (place_id, day)
);

alter table public.place_saves_daily enable row level security;
grant select, insert, update, delete on public.place_saves_daily to service_role;

create or replace function public.record_place_save(p_place_id text)
returns void
language plpgsql
volatile
set search_path = ''
as $$
begin
  if p_place_id is null or p_place_id !~ '^[A-Za-z0-9_-]{4,128}$' then
    raise exception 'invalid place id' using errcode = '22023';
  end if;

  insert into public.place_saves_daily as s (place_id, day, saves)
  values (p_place_id, current_date, 1)
  on conflict (place_id, day) do update set saves = s.saves + 1;
end;
$$;

revoke all on function public.record_place_save(text) from public, anon, authenticated;
grant execute on function public.record_place_save(text) to service_role;

-- Totals for up to 200 place ids (a city page renders far fewer).
create or replace function public.get_place_save_totals(p_place_ids text[])
returns table (place_id text, total bigint)
language sql
stable
set search_path = ''
as $$
  select s.place_id, sum(s.saves)::bigint as total
  from public.place_saves_daily s
  where s.place_id = any (p_place_ids[1:200])
  group by s.place_id
$$;

revoke all on function public.get_place_save_totals(text[]) from public, anon, authenticated;
grant execute on function public.get_place_save_totals(text[]) to service_role;

-- ---------------------------------------------------------------------------
-- cache_hit_stats — sampled cache effectiveness (places cache, ~10%).
-- ---------------------------------------------------------------------------
create table public.cache_hit_stats (
  event_date date not null default current_date,
  cache_type text not null check (cache_type ~ '^[a-z0-9:_-]{1,64}$'),
  hit_count bigint not null default 0 check (hit_count >= 0),
  miss_count bigint not null default 0 check (miss_count >= 0),
  primary key (event_date, cache_type)
);

alter table public.cache_hit_stats enable row level security;
grant select, insert, update, delete on public.cache_hit_stats to service_role;

create or replace function public.record_cache_event(p_cache_type text, p_is_hit boolean)
returns void
language sql
volatile
set search_path = ''
as $$
  insert into public.cache_hit_stats as s (event_date, cache_type, hit_count, miss_count)
  values (
    current_date,
    p_cache_type,
    case when p_is_hit then 1 else 0 end,
    case when p_is_hit then 0 else 1 end
  )
  on conflict (event_date, cache_type) do update
    set hit_count = s.hit_count + excluded.hit_count,
        miss_count = s.miss_count + excluded.miss_count
$$;

revoke all on function public.record_cache_event(text, boolean) from public, anon, authenticated;
grant execute on function public.record_cache_event(text, boolean) to service_role;

-- Incident remediation P1/P5 (see bestcityspots-backend-incident-actions.md):
--
-- 1. Durable, cross-instance daily budget for paid providers. The previous
--    cost guard was an in-memory Map that reset on every container restart
--    (incident root cause 3). This table + atomic claim function survive
--    restarts and are shared by the web app AND the cache warmer.
--
-- 2. Idempotency constraints on cache tables so logically identical entries
--    can never duplicate (incident root cause 7 — repeat misses for the same
--    logical key multiplied provider calls).

-- ───────────────────────── provider daily budget ─────────────────────────

create table if not exists public.provider_daily_usage (
  provider   text not null,
  day        date not null,
  used       integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (provider, day)
);

comment on table public.provider_daily_usage is
  'Atomic daily call budget for paid providers (gemini, google-places). Written only via claim_provider_use().';

alter table public.provider_daily_usage enable row level security;

-- Service role only — the anon key must never read or mutate spend state.
drop policy if exists "provider_daily_usage_service_role_all" on public.provider_daily_usage;
create policy "provider_daily_usage_service_role_all"
on public.provider_daily_usage
for all
to service_role
using (true)
with check (true);

-- Atomically claim one provider call against the daily limit.
-- Returns true when the claim succeeded (caller may spend), false when the
-- budget is exhausted. The conditional UPDATE makes the check-and-increment
-- a single atomic statement — no read-modify-write race across instances.
create or replace function public.claim_provider_use(
  p_provider text,
  p_day date,
  p_limit integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used integer;
begin
  if p_limit <= 0 then
    return false;
  end if;

  insert into public.provider_daily_usage as u (provider, day, used)
  values (p_provider, p_day, 1)
  on conflict (provider, day) do update
    set used = u.used + 1,
        updated_at = now()
    where u.used < p_limit
  returning used into v_used;

  -- No row returned ⇒ the conditional update was skipped ⇒ budget exhausted.
  return v_used is not null;
end;
$$;

revoke all on function public.claim_provider_use(text, date, integer) from public;
grant execute on function public.claim_provider_use(text, date, integer) to service_role;

-- Read-only observability helper (dashboards / ops checks).
create or replace function public.get_provider_usage(p_day date)
returns table (provider text, used integer, updated_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select provider, used, updated_at
  from public.provider_daily_usage
  where day = p_day;
$$;

revoke all on function public.get_provider_usage(date) from public;
grant execute on function public.get_provider_usage(date) to service_role;

-- ───────────────────── cache idempotency constraints ─────────────────────
-- The application upserts with onConflict targets; these constraints make
-- those targets real and guarantee one row per logical cache entry.
-- Dedupe first (keep the most recently updated row), then enforce.

-- city_places_cache: one row per (city_name, place_type)
do $$
begin
  if to_regclass('public.city_places_cache') is not null then
    delete from public.city_places_cache a
    using public.city_places_cache b
    where a.city_name = b.city_name
      and a.place_type = b.place_type
      and a.ctid < b.ctid;

    if not exists (
      select 1 from pg_indexes
      where schemaname = 'public'
        and tablename = 'city_places_cache'
        and indexname = 'city_places_cache_city_name_place_type_key'
    ) then
      begin
        alter table public.city_places_cache
          add constraint city_places_cache_city_name_place_type_key
          unique (city_name, place_type);
      exception when duplicate_table or duplicate_object then
        null; -- constraint already exists under another name
      end;
    end if;
  end if;
end $$;

-- weather / metrics / insights caches: one row per city_id
do $$
declare
  t text;
begin
  foreach t in array array['city_weather_cache', 'city_metrics', 'city_ai_insights'] loop
    if to_regclass('public.' || t) is not null then
      execute format(
        'delete from public.%I a using public.%I b
           where a.city_id = b.city_id and a.ctid < b.ctid', t, t);
      -- city_id is already the primary key on these tables in the canonical
      -- schema; the dedupe above is a no-op there and only repairs drifted
      -- environments where the PK was lost.
    end if;
  end loop;
end $$;

-- US-12 (product audit AF-6): anonymous "travelers saved this" counters.
--
-- Privacy model: one aggregate row per (place, day). No user identifiers,
-- no sessions, no IPs — the table cannot express WHO saved anything, only
-- HOW MANY times a place was saved. Documented on /methodology.

create table if not exists public.place_saves_daily (
  place_id text not null,
  day date not null default current_date,
  saves integer not null default 0,
  primary key (place_id, day)
);

comment on table public.place_saves_daily is
  'Anonymous aggregate save counts per place per day (US-12). Written only via record_place_save().';

alter table public.place_saves_daily enable row level security;

drop policy if exists "place_saves_daily_service_role_all" on public.place_saves_daily;
create policy "place_saves_daily_service_role_all"
on public.place_saves_daily
for all
to service_role
using (true)
with check (true);

-- Atomic increment; validates the id shape server-side as defense in depth.
create or replace function public.record_place_save(p_place_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_place_id is null or p_place_id !~ '^[A-Za-z0-9_-]{4,128}$' then
    return;
  end if;

  insert into public.place_saves_daily as t (place_id, day, saves)
  values (p_place_id, current_date, 1)
  on conflict (place_id, day) do update
    set saves = t.saves + 1;
end;
$$;

revoke all on function public.record_place_save(text) from public;
grant execute on function public.record_place_save(text) to service_role;

-- Aggregate totals for a set of places (server-side reads on city pages).
create or replace function public.get_place_save_totals(p_place_ids text[])
returns table (place_id text, total bigint)
language sql
security definer
set search_path = public
stable
as $$
  select place_id, sum(saves)::bigint as total
  from public.place_saves_daily
  where place_id = any (p_place_ids)
  group by place_id;
$$;

revoke all on function public.get_place_save_totals(text[]) from public;
grant execute on function public.get_place_save_totals(text[]) to service_role;

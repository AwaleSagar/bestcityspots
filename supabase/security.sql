-- Supabase/Postgres hardening: RLS + least-privilege policies.
-- Run these in Supabase SQL Editor (adjust table/schema names as needed).

-- 1) Ensure the table isn't writable from the client by default
--    (RLS blocks access unless a policy allows it).
alter table public.cities enable row level security;

-- Optional: If you previously disabled RLS, re-enable it.
-- alter table public.cities force row level security;

-- 2) Drop overly-permissive policies (if any exist).
-- NOTE: You must replace policy names with your actual ones if they differ.
-- drop policy if exists "Enable read access for all users" on public.cities;
-- drop policy if exists "Public cities read" on public.cities;
-- drop policy if exists "Public cities write" on public.cities;

-- 3) Allow ONLY read access (SELECT) from anon/authenticated.
--    If your cities table is public data, this is a safe default.
create policy "cities_select_anon_auth"
on public.cities
for select
to anon, authenticated
using (true);

-- 4) Explicitly prevent writes from anon/authenticated (defense in depth).
create policy "cities_no_insert"
on public.cities
for insert
to anon, authenticated
with check (false);

create policy "cities_no_update"
on public.cities
for update
to anon, authenticated
using (false);

create policy "cities_no_delete"
on public.cities
for delete
to anon, authenticated
using (false);

-- 5) Recommended: lock down sensitive columns if you add any later
--    (PII, internal notes, etc.). Prefer a VIEW or an RPC that only returns safe fields.
-- Example:
-- create view public.cities_public as
--   select id, city, city_ascii, country, population from public.cities;
-- alter view public.cities_public set (security_barrier = true);

-- 6) Client key safety:
-- - NEXT_PUBLIC_SUPABASE_ANON_KEY is meant to be public; security comes from RLS.
-- - NEVER ship service_role key to the browser; use it only on server (if at all).


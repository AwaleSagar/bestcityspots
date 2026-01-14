-- Harden RLS policies based on Security Strategy Audit
-- Fixes overly permissive policies in city_ai_insights

-- 1. city_ai_insights: Restrict write access to service_role only
-- Previously allowed anon/authenticated to insert/update, which is a risk.
drop policy if exists city_ai_insights_insert on public.city_ai_insights;
create policy city_ai_insights_insert
on public.city_ai_insights
for insert
to service_role
with check (true);

drop policy if exists city_ai_insights_update on public.city_ai_insights;
create policy city_ai_insights_update
on public.city_ai_insights
for update
to service_role
using (true);

-- 2. Ensure RLS is enabled on all tables (Redundant safety check)
alter table public.cities enable row level security;
alter table public.city_metrics enable row level security;
alter table public.city_ai_insights enable row level security;

-- 3. Verify no other tables exist or need locking down
-- (Run this manually: select * from pg_tables where schemaname = 'public';)

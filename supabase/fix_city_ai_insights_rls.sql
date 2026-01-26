-- Fix RLS policies for city_ai_insights to allow server-side upserts
-- Run this in your Supabase SQL editor if upserts are still failing

-- Drop existing policies
drop policy if exists city_ai_insights_insert on public.city_ai_insights;
drop policy if exists city_ai_insights_update on public.city_ai_insights;

-- Allow inserts for anon/authenticated (server-side operations)
create policy city_ai_insights_insert
on public.city_ai_insights
for insert
to anon, authenticated
with check (true);

-- Allow updates for anon/authenticated (server-side operations)
-- The 'using' clause allows selecting existing rows, 'with check' allows updating them
create policy city_ai_insights_update
on public.city_ai_insights
for update
to anon, authenticated
using (true)
with check (true);

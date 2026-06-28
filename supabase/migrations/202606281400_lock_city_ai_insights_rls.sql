-- Migration: lock down city_ai_insights writes to service_role only.
-- Fixes the C1 stored-content-injection chain.
--
-- Before this change, INSERT and UPDATE on city_ai_insights were granted to
-- anon/authenticated. Because NEXT_PUBLIC_SUPABASE_ANON_KEY ships to every
-- browser, any visitor could persist arbitrary intro/attractions/seasons
-- content that then renders on the corresponding city page (including inside
-- JSON-LD via dangerouslySetInnerHTML), enabling stored content injection.
--
-- Writes must require the service_role key (never shipped to the browser).
-- Public SELECT is preserved. This aligns city_ai_insights with the existing
-- posture of city_weather_cache, city_metrics, and city_places_cache (all
-- already service_role-write).

drop policy if exists city_ai_insights_insert on public.city_ai_insights;
drop policy if exists city_ai_insights_update on public.city_ai_insights;

create policy city_ai_insights_insert
on public.city_ai_insights
for insert
to service_role
with check (true);

create policy city_ai_insights_update
on public.city_ai_insights
for update
to service_role
using (true)
with check (true);

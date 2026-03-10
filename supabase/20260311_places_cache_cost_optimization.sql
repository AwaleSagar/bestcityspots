-- Optimize Google Places caching for lower API cost and safer writes.
-- Public reads remain allowed. Cache writes are restricted to service_role.

ALTER TABLE IF EXISTS public.city_places_cache
  ALTER COLUMN updated_at SET DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_city_places_cache_updated_at
  ON public.city_places_cache (updated_at DESC);

ALTER TABLE IF EXISTS public.city_places_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read for all" ON public.city_places_cache;
DROP POLICY IF EXISTS "Enable upsert for all" ON public.city_places_cache;

CREATE POLICY "city_places_cache_select_public"
ON public.city_places_cache
FOR SELECT
TO public
USING (true);

CREATE POLICY "city_places_cache_insert_service_role"
ON public.city_places_cache
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "city_places_cache_update_service_role"
ON public.city_places_cache
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "city_places_cache_delete_service_role"
ON public.city_places_cache
FOR DELETE
TO service_role
USING (true);

CREATE INDEX IF NOT EXISTS idx_place_details_cache_updated_at
  ON public.place_details_cache (updated_at DESC);

ALTER TABLE IF EXISTS public.place_details_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access" ON public.place_details_cache;
DROP POLICY IF EXISTS "Service role update access" ON public.place_details_cache;
DROP POLICY IF EXISTS "Service role write access" ON public.place_details_cache;

CREATE POLICY "place_details_cache_select_public"
ON public.place_details_cache
FOR SELECT
TO public
USING (true);

CREATE POLICY "place_details_cache_insert_service_role"
ON public.place_details_cache
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "place_details_cache_update_service_role"
ON public.place_details_cache
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "place_details_cache_delete_service_role"
ON public.place_details_cache
FOR DELETE
TO service_role
USING (true);

ALTER TABLE IF EXISTS public.cache_hit_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cache_hit_stats_service_role_all" ON public.cache_hit_stats;

CREATE POLICY "cache_hit_stats_service_role_all"
ON public.cache_hit_stats
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
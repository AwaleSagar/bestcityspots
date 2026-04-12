-- Improve query performance for city/type cache lookups and JSONB filter scans.
-- Additive-only migration.

CREATE INDEX IF NOT EXISTS idx_city_places_cache_city_type_updated
  ON public.city_places_cache (city_name, place_type, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_city_places_cache_city_lower
  ON public.city_places_cache (lower(city_name));

CREATE INDEX IF NOT EXISTS idx_city_places_cache_places_data_gin
  ON public.city_places_cache
  USING GIN (places_data jsonb_path_ops);

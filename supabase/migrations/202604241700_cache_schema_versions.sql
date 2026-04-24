-- =============================================================================
-- Cache schema versioning.
--
-- Adds a `schema_version` column to every cache table, and a `prompt_version`
-- column to AI-generated caches. Application readers treat rows whose version
-- does not match the current code-level constant as a miss — bumping the
-- constant is the safe way to invalidate the world after a shape change.
--
-- Defaults to 1 so existing rows remain valid against the initial code-level
-- version (which is also 1).
-- =============================================================================

-- Cache tables that hold provider / internal data shapes.
ALTER TABLE IF EXISTS public.city_places_cache
  ADD COLUMN IF NOT EXISTS schema_version integer NOT NULL DEFAULT 1;

ALTER TABLE IF EXISTS public.place_details_cache
  ADD COLUMN IF NOT EXISTS schema_version integer NOT NULL DEFAULT 1;

ALTER TABLE IF EXISTS public.city_weather_cache
  ADD COLUMN IF NOT EXISTS schema_version integer NOT NULL DEFAULT 1;

ALTER TABLE IF EXISTS public.city_metrics
  ADD COLUMN IF NOT EXISTS schema_version integer NOT NULL DEFAULT 1;

-- AI-generated caches also track the prompt version so that a prompt change
-- (same shape, different wording) can invalidate cleanly without a full
-- schema bump.
ALTER TABLE IF EXISTS public.city_ai_insights
  ADD COLUMN IF NOT EXISTS schema_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS prompt_version integer NOT NULL DEFAULT 1;

ALTER TABLE IF EXISTS public.ai_trending_cache
  ADD COLUMN IF NOT EXISTS schema_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS prompt_version integer NOT NULL DEFAULT 1;

-- Support for scheduled SWR refresh scans: let the cache-warmer find stale
-- rows efficiently.
CREATE INDEX IF NOT EXISTS ix_city_places_cache_updated_at
  ON public.city_places_cache (updated_at);

CREATE INDEX IF NOT EXISTS ix_city_weather_cache_updated_at
  ON public.city_weather_cache (updated_at);

CREATE INDEX IF NOT EXISTS ix_city_metrics_updated_at
  ON public.city_metrics (updated_at);

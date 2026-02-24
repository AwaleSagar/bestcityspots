-- =============================================================================
-- Cache Optimization Migrations
-- Applies: cache_hit_stats table, record_cache_event() tracking function
-- =============================================================================

-- 1. Cache hit/miss tracking table (aggregated by date + cache type)
CREATE TABLE IF NOT EXISTS public.cache_hit_stats (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_date date NOT NULL DEFAULT CURRENT_DATE,
  cache_type text NOT NULL,
  hit_count bigint NOT NULL DEFAULT 0,
  miss_count bigint NOT NULL DEFAULT 0,
  UNIQUE (event_date, cache_type)
);

ALTER TABLE public.cache_hit_stats ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_cache_hit_stats_date_type
  ON public.cache_hit_stats (event_date, cache_type);

-- 2. Lightweight RPC to record a cache hit or miss.
--    Called from application code: supabase.rpc('record_cache_event', { p_cache_type, p_is_hit })
CREATE OR REPLACE FUNCTION public.record_cache_event(
  p_cache_type text,
  p_is_hit boolean
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.cache_hit_stats (event_date, cache_type, hit_count, miss_count)
  VALUES (
    CURRENT_DATE,
    p_cache_type,
    CASE WHEN p_is_hit THEN 1 ELSE 0 END,
    CASE WHEN p_is_hit THEN 0 ELSE 1 END
  )
  ON CONFLICT (event_date, cache_type)
  DO UPDATE SET
    hit_count  = cache_hit_stats.hit_count  + EXCLUDED.hit_count,
    miss_count = cache_hit_stats.miss_count + EXCLUDED.miss_count;
END;
$$;

-- =============================================================================
-- Notes on application-level changes (not SQL):
--
-- * src/lib/cache-config.ts: Centralized TTL constants
--     PLACES_FRESH_DAYS: 30, PLACES_SOFT_REFRESH_DAYS: 7
--     INSIGHTS_FRESH_DAYS: 365, WEATHER_FRESH_MINUTES: 60
--     METRICS_FRESH_MINUTES: 60, TRENDING_FRESH_HOURS: 24
--
-- * src/lib/metrics.ts: Fixed write-back to city_metrics + 60-min TTL + SWR
-- * src/lib/weather.ts: Added stale-while-revalidate pattern
-- * src/lib/places.ts: Extended TTL to 30 days + soft-refresh at 7 days
-- * src/app/cities/[id]/page.tsx: Parallelized getCityMetrics + getCityWeather
-- =============================================================================

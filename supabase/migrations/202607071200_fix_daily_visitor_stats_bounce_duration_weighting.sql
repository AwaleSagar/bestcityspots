-- =============================================================================
-- Fix: upsert_daily_visitor_stats weighted per-session rates by pageviews.
--
-- bounce_rate_pct and avg_session_duration_sec are per-SESSION metrics, but
-- the merge in upsert_daily_visitor_stats weighted them by total_visits
-- (which recordDailyVisitorStats set to the pageview count). The effect was
-- that a single bounced session with N pageviews reported a bounce rate of
-- 100/N % instead of 100% — e.g. one bounced session of three pageviews
-- surfaced as 33.3% rather than 100%. Average session duration was skewed
-- the same way (sessions with more pageviews overweighted the mean).
--
-- This re-weights both merges by unique_visitors (the session count) and
-- computes the initial bounce_rate_pct against p_unique. Page-view volume
-- (total_visits, page_views) is unchanged, so dashboard traffic numbers are
-- unaffected; only the per-session rates become correct.
--
-- No data backfill is required: existing daily rows keep their historical
-- (incorrect) rates, and every write from this function forward is correct.
--
-- Idempotent: CREATE OR REPLACE preserves the existing signature/grants.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.upsert_daily_visitor_stats(
  p_date date,
  p_visits integer,
  p_unique integer,
  p_pageviews integer,
  p_duration integer,
  p_bounce integer,
  p_new integer,
  p_returning integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.daily_visitor_stats (
    stat_date,
    total_visits,
    unique_visitors,
    page_views,
    avg_session_duration_sec,
    bounce_rate_pct,
    new_visitors,
    returning_visitors
  )
  VALUES (
    p_date,
    p_visits,
    p_unique,
    p_pageviews,
    p_duration,
    -- Per-SESSION rate: denominator is the session count (p_unique).
    CASE WHEN p_unique > 0 THEN (p_bounce * 100 / p_unique) ELSE 0 END,
    p_new,
    p_returning
  )
  ON CONFLICT (stat_date)
  DO UPDATE SET
    total_visits = daily_visitor_stats.total_visits + excluded.total_visits,
    unique_visitors = daily_visitor_stats.unique_visitors + excluded.unique_visitors,
    page_views = daily_visitor_stats.page_views + excluded.page_views,
    avg_session_duration_sec = CASE
      WHEN daily_visitor_stats.unique_visitors + excluded.unique_visitors > 0
      THEN ((daily_visitor_stats.avg_session_duration_sec * daily_visitor_stats.unique_visitors) +
            (excluded.avg_session_duration_sec * excluded.unique_visitors)) /
           (daily_visitor_stats.unique_visitors + excluded.unique_visitors)
      ELSE 0
    END,
    bounce_rate_pct = CASE
      WHEN daily_visitor_stats.unique_visitors + excluded.unique_visitors > 0
      THEN ((daily_visitor_stats.bounce_rate_pct * daily_visitor_stats.unique_visitors) +
            (excluded.bounce_rate_pct * excluded.unique_visitors)) /
           (daily_visitor_stats.unique_visitors + excluded.unique_visitors)
      ELSE 0
    END,
    new_visitors = daily_visitor_stats.new_visitors + excluded.new_visitors,
    returning_visitors = daily_visitor_stats.returning_visitors + excluded.returning_visitors,
    updated_at = timezone('utc', now());
END;
$$;

-- SECURITY: this function is SECURITY DEFINER, so it bypasses RLS. Pin its
-- search_path and drop the EXECUTE grant PostgreSQL hands to PUBLIC by default
-- (granting to service_role does not remove it) — otherwise the browser-visible
-- anon key can call it through PostgREST. Added retroactively by the 2026-09-12
-- audit (H-1/L-2); migrations/202609121200 applies the same fix to every
-- analytics RPC for environments that already ran this file. Kept here so the
-- migration is correct standalone and a from-scratch replay never leaves a
-- window where the function is world-executable.
ALTER FUNCTION public.upsert_daily_visitor_stats(date, integer, integer, integer, integer, integer, integer, integer) SET search_path = public;
REVOKE ALL ON FUNCTION public.upsert_daily_visitor_stats(date, integer, integer, integer, integer, integer, integer, integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_daily_visitor_stats(date, integer, integer, integer, integer, integer, integer, integer) TO service_role;

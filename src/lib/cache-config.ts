/**
 * Centralized cache TTL configuration.
 * All cache layers import from here instead of using scattered magic numbers.
 */
export const CACHE_TTL = {
  /** Places (landmarks, restaurants, hotels): serve from cache up to 30 days */
  PLACES_FRESH_DAYS: 30,
  /** Places: trigger a non-blocking background refresh after 7 days */
  PLACES_SOFT_REFRESH_DAYS: 7,
  /** AI city insights: 365-day TTL (content is evergreen) */
  INSIGHTS_FRESH_DAYS: 365,
  /** Weather: 60-minute TTL to balance freshness vs API quota (1,000/day) */
  WEATHER_FRESH_MINUTES: 60,
  /** City metrics (Open-Meteo pollution + comfort): 60-minute TTL */
  METRICS_FRESH_MINUTES: 60,
  /** AI-generated trending destinations: 24-hour TTL */
  TRENDING_FRESH_HOURS: 24,
} as const;

/** Returns true if the given timestamp is within the TTL window. */
export function isCacheFresh(updatedAt: string | null | undefined, ttlMs: number): boolean {
  if (!updatedAt) return false;
  const age = Date.now() - new Date(updatedAt).getTime();
  return age < ttlMs;
}

/** Convenience: minutes -> milliseconds */
export function minutes(n: number) { return n * 60 * 1000; }
/** Convenience: hours -> milliseconds */
export function hours(n: number) { return n * 60 * 60 * 1000; }
/** Convenience: days -> milliseconds */
export function days(n: number) { return n * 24 * 60 * 60 * 1000; }

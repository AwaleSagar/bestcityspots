/**
 * Centralized cache TTL + versioning configuration.
 *
 * Every cache tier (HTTP edge, L1 in-memory, L2 Supabase) sources its
 * freshness window from here. Bumping a `schemaVersion` invalidates readers
 * for that tier without requiring a database migration.
 */

export interface CacheTier {
  /** Serve from cache without background refresh while age < fresh. */
  freshMs: number;
  /** While fresh <= age < fresh+swr, serve cached and trigger background refresh. */
  swrMs: number;
  /** While fresh+swr <= age < hard, block on provider; fall back to stale on failure. */
  hardMs: number;
  /** Cache schema version; readers treat mismatches as a miss. Bump to invalidate. */
  schemaVersion: number;
}

const minute = 60 * 1000;
const hour = 60 * minute;
const day = 24 * hour;

/**
 * Tiered TTL for each cached resource. Values chosen to balance provider cost
 * against freshness requirements — see docs/plan for rationale.
 */
export const CACHE_TIERS = {
  PLACES: {
    freshMs: 30 * day,
    swrMs: 7 * day,
    hardMs: 90 * day,
    schemaVersion: 1,
  },
  INSIGHTS: {
    freshMs: 365 * day,
    swrMs: 30 * day,
    hardMs: 730 * day,
    schemaVersion: 1,
  },
  WEATHER: {
    freshMs: 60 * minute,
    swrMs: 30 * minute,
    hardMs: 24 * hour,
    schemaVersion: 1,
  },
  METRICS: {
    freshMs: 60 * minute,
    swrMs: 30 * minute,
    hardMs: 24 * hour,
    schemaVersion: 1,
  },
  TRENDING: {
    freshMs: 24 * hour,
    swrMs: 12 * hour,
    hardMs: 7 * day,
    schemaVersion: 1,
  },
} as const satisfies Record<string, CacheTier>;

export type CacheTierKey = keyof typeof CACHE_TIERS;

/**
 * Legacy flat TTL object retained for backwards compatibility with existing
 * call sites. New code should prefer `CACHE_TIERS` and the classify helper.
 *
 * Values are derived from `CACHE_TIERS` so the two cannot silently drift.
 */
export const CACHE_TTL = {
  PLACES_FRESH_DAYS: CACHE_TIERS.PLACES.freshMs / day,
  PLACES_SOFT_REFRESH_DAYS: CACHE_TIERS.PLACES.swrMs / day,
  INSIGHTS_FRESH_DAYS: CACHE_TIERS.INSIGHTS.freshMs / day,
  WEATHER_FRESH_MINUTES: CACHE_TIERS.WEATHER.freshMs / minute,
  METRICS_FRESH_MINUTES: CACHE_TIERS.METRICS.freshMs / minute,
  TRENDING_FRESH_HOURS: CACHE_TIERS.TRENDING.freshMs / hour,
} as const;

export type CacheFreshness = "fresh" | "swr" | "stale" | "expired";

/** Classify an `updatedAt` timestamp against a tier. */
export function classifyAge(
  updatedAt: string | null | undefined,
  tier: CacheTier,
  now = Date.now()
): CacheFreshness {
  if (!updatedAt) return "expired";
  const parsed = Date.parse(updatedAt);
  if (Number.isNaN(parsed)) return "expired";
  const age = now - parsed;
  // Negative age = timestamp is in the future (clock skew or freshly written
  // record whose clock is slightly ahead). Treat as fresh — it's the most
  // recent value we have.
  if (age < 0) return "fresh";
  if (age < tier.freshMs) return "fresh";
  if (age < tier.freshMs + tier.swrMs) return "swr";
  if (age < tier.hardMs) return "stale";
  return "expired";
}

/** Returns true if the given timestamp is within `ttlMs` milliseconds. */
export function isCacheFresh(updatedAt: string | null | undefined, ttlMs: number): boolean {
  if (!updatedAt) return false;
  const parsed = Date.parse(updatedAt);
  if (Number.isNaN(parsed)) return false;
  return Date.now() - parsed < ttlMs;
}

/** Convenience conversions. */
export function minutes(n: number) {
  return n * minute;
}
export function hours(n: number) {
  return n * hour;
}
export function days(n: number) {
  return n * day;
}

// ---------------------------------------------------------------------------
// Tag helpers — stable strings used for admin invalidation and Next's
// `revalidateTag` hooks.
// ---------------------------------------------------------------------------

export const cacheTags = {
  placesByCity(cityId: number | string, type: string): string {
    return `places:${cityId}:${type}`;
  },
  weather(cityId: number | string): string {
    return `weather:${cityId}`;
  },
  metrics(cityId: number | string): string {
    return `metrics:${cityId}`;
  },
  insight(cityId: number | string): string {
    return `insight:${cityId}`;
  },
  trending(): string {
    return "trending:global";
  },
};

/** HTTP `Cache-Control` header value for an idempotent GET endpoint. */
const cacheControlCache = new WeakMap<CacheTier, string>();
export function cacheControlFor(tier: CacheTier): string {
  const cached = cacheControlCache.get(tier);
  if (cached) return cached;
  const sMaxAge = Math.max(1, Math.floor(tier.freshMs / 1000));
  const swr = Math.max(1, Math.floor(tier.swrMs / 1000));
  const value = `public, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`;
  cacheControlCache.set(tier, value);
  return value;
}

/**
 * Cache-invalidation versions for AI-generated content, stored alongside each
 * cached row (`city_ai_insights.prompt_version`, `ai_trending_cache.prompt_version`).
 * Increment when a prompt or the expected response shape changes.
 *
 * Dependency-free so the cache warmers (scripts/) can stamp rows with the same
 * version the app checks.
 */
export const PROMPT_VERSIONS = {
  CITY_INSIGHT: 2,
  TRENDING_CITIES: 3,
} as const;

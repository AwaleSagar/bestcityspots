# BestCitySpots — Backend Performance Audit Report

**Date:** 2026-05-03
**Scope:** 30 source files across 6 layers (core lib, API providers, business logic, API routes, server actions, client components)
**Methodology:** Claude Code phased analysis — 6 batches, structured file-level review

---

## 🚨 Critical Issues (Fix Immediately)

All items shipped ✅

| # | File | Issue | Impact |
|---|------|-------|--------|
| ~~C1~~ | ~~`src/lib/providers/gemini.ts`~~ | ~~**Wrong model name** `gemini-3-flash-preview` — every AI call returns 404~~ | ~~All Gemini-powered features are broken~~ |
| ~~C2~~ | ~~`src/lib/providers/openMeteo.ts`~~ | ~~**`fetchPm25` returns forecast value, not current** — uses `values[values.length-1]` (24h future) instead of current hour index~~ | ~~AQI data is wrong~~ |
| ~~C3~~ | ~~`src/lib/providers/openMeteo.ts`~~ | ~~**`* 3.6` double-conversion** — Open-Meteo returns km/h by default; multiplier inflates wind speed 3.6×~~ | ~~Wind data is wrong~~ |
| ~~C4~~ | ~~`src/lib/cities.ts`~~ | ~~**`findNearestCity` fires up to 6 sequential DB round trips** — iterates `[0.5, 1, 2, 5, 10]` box sizes with await per iteration~~ | ~~~500ms-2s latency per city lookup~~ |
| ~~C5~~ | ~~`src/lib/intelligence.ts`~~ | ~~**`matchCitiesInDb` matches on city name only** — non-unique names return wrong cities (e.g. Springfield, MO instead of Springfield, IL)~~ | ~~Incorrect recommendations~~ |
| ~~C6~~ | ~~`src/lib/http.ts`~~ | ~~**Unbounded `breakers` Map** — every distinct provider string creates a permanent entry → memory leak~~ | ~~OOM in long-running / serverless~~ |
| ~~C7~~ | ~~`src/app/cities/[id]/page.tsx`~~ | ~~**Double `getCityById` call per page load** — `generateMetadata` and page component each call independently~~ | ~~2× DB queries per page view~~ |
| ~~C8~~ | ~~`src/components/features/city/CitySphereBackground.tsx`~~ | ~~**`willChange: "transform"` on 120 elements** — 120 GPU compositor layers exhausts VRAM on mobile~~ | ~~Jank / crashes on low-end devices~~ |

---

## 🔴 High Severity (Fix This Week)

All items shipped ✅

| # | File | Issue |
|---|------|-------|
| ~~H1~~ | ~~`src/lib/providers/gemini.ts`~~ | ~~No timeout on `generateContent` — hanging model response blocks caller indefinitely~~ |
| ~~H2~~ | ~~`src/lib/providers/openweather.ts`~~ | ~~Missing temperature fields silently default to `0` — cannot distinguish "0°C" from "field absent"~~ |
| ~~H3~~ | ~~`src/lib/providers/openweather.ts`~~ | ~~AQI failure completely silent — `.catch(() => null)` with no logging~~ |
| ~~H4~~ | ~~`src/lib/providers/openweather.ts`~~ | ~~No 429/rate-limit handling — falls into generic error path~~ |
| ~~H5~~ | ~~`src/lib/providers/googlePlaces.ts`~~ | ~~5xx responses classified as `"error"` instead of `"outage"` — circuit-breaker can't distinguish~~ |
| ~~H6~~ | ~~`src/lib/providers/googlePlaces.ts`~~ | ~~429 quota exhaustion not logged — operational blind spot~~ |
| ~~H7~~ | ~~`src/lib/weather.ts`~~ | ~~Background revalidation silently swallows errors — cache goes stale forever with zero logs~~ |
| ~~H8~~ | ~~`src/lib/weather.ts`~~ | ~~Open-Meteo fallback never attempts PM2.5 — `aqi` hardcoded to `0` despite free `fetchPm25` being available~~ |
| ~~H9~~ | ~~`src/lib/places.ts`~~ | ~~Blurhash computed for existing images but never persisted — re-downloads & re-hashes on every cache hit~~ |
| ~~H10~~ | ~~`src/lib/places.ts`~~ | ~~Image enrichment batch size of 3 is too conservative — up to 27 serial HTTP calls for 27 places~~ |
| ~~H11~~ | ~~`src/lib/intelligence.ts`~~ | ~~`isFresh()` duplicates `isCacheFresh()` from `cache-config.ts` — dual source of truth~~ |
| ~~H12~~ | ~~`src/lib/intelligence.ts`~~ | ~~`TrendingCitiesSchema` recreated inside function body on every call — Zod allocation waste~~ |
| ~~H13~~ | ~~`src/app/api/places/search/route.ts`~~ | ~~No route-level timeout — cold path can exceed 30s, serverless timeout returns generic error~~ |
| ~~H14~~ | ~~`src/app/api/analytics/route.ts`~~ | ~~N+1 RPC loop — up to ~100 individual DB calls per 50-event batch~~ |
| ~~H15~~ | ~~`src/app/cities/[id]/page.tsx`~~ | ~~`metrics` + `weather` block initial HTML — both awaited synchronously before any byte ships~~ |
| ~~H16~~ | ~~`src/components/features/city/CitySphereBackground.tsx`~~ | ~~RAF loop never pauses when off-screen — runs at 60fps indefinitely~~ |
| ~~H17~~ | ~~`src/components/features/city/CitySphereBackground.tsx`~~ | ~~120-node re-render every 2.5s — no `React.memo` on individual sphere nodes~~ |
| ~~H18~~ | ~~`src/components/features/city/CitySearch.tsx`~~ | ~~`activeFilter` change triggers full API re-fetch instead of client-side filter~~ |
| ~~H19~~ | ~~`src/hooks/useRecentSearches.ts`~~ | ~~`setJsonStorageItem` inside `setState` updater — double-write in React Strict Mode~~ |

---

## 🟡 Medium Severity (Fix This Sprint)

29/30 shipped ✅ — M14 intentionally deferred

| # | File | Issue |
|---|------|-------|
| ~~M1~~ | ~~`src/lib/cache.ts`~~ | ~~Expired entries only evicted on `get` — stale data blocks fresh writes via LRU~~ |
| ~~M2~~ | ~~`src/lib/cache-config.ts`~~ | ~~`CACHE_TTL` and `CACHE_TIERS` encode same values — can silently drift~~ |
| ~~M3~~ | ~~`src/lib/cache-config.ts`~~ | ~~`classifyAge` and `isCacheFresh` both allocate `Date` objects — use `Date.parse()`~~ |
| ~~M4~~ | ~~`src/lib/storage.ts`~~ | ~~`JSON.stringify` runs before `hasLocalStorage()` check — wasted serialization on SSR~~ |
| ~~M5~~ | ~~`src/lib/http.ts`~~ | ~~Half-open circuit breaker not atomic — thundering herd on recovery~~ |
| ~~M6~~ | ~~`src/lib/http.ts`~~ | ~~429 ignores `Retry-After` header — wastes quota or latency~~ |
| ~~M7~~ | ~~`src/lib/providers/gemini.ts`~~ | ~~`sanitizeJsonResponse` and `sanitizeJsonArrayResponse` are near-duplicates~~ |
| ~~M8~~ | ~~`src/lib/providers/gemini.ts`~~ | ~~Error `reason` too coarse — no `"rate_limit"` distinction~~ |
| ~~M9~~ | ~~`src/lib/providers/googlePlaces.ts`~~ | ~~`getApiKey()` re-evaluates `serverEnv()` on every call~~ |
| ~~M10~~ | ~~`src/lib/providers/openMeteo.ts`~~ | ~~`conditionFromWeatherCode` has coverage gaps for codes 83-84, 87-88, 90-94~~ |
| ~~M11~~ | ~~`src/lib/weather.ts`~~ | ~~`select("*")` over-fetches from cache table~~ |
| ~~M12~~ | ~~`src/lib/weather.ts`~~ | ~~`parseCachedWeather(cached)` called twice on same object~~ |
| ~~M13~~ | ~~`src/lib/cities.ts`~~ | ~~`searchCache` is FIFO not LRU, no TTL — stale autocomplete results persist~~ |
| M14 | `src/lib/places.ts` | `searchPlaces` triggers 3 API calls when no type filter provided _(deferred — intentional fan-out)_ |
| ~~M15~~ | ~~`src/lib/places.ts`~~ | ~~`normalizeCachedPlace` uses `JSON.stringify` for array comparison~~ |
| ~~M16~~ | ~~`src/lib/places.ts`~~ | ~~`dedupePlaces` called twice when fallback runs~~ |
| ~~M17~~ | ~~`src/lib/intelligence.ts`~~ | ~~`matchCitiesInDb` return type `City[]` but only 6 of 10 fields selected~~ |
| ~~M18~~ | ~~`src/lib/place-search-utils.ts`~~ | ~~`sortPlaces` recomputes `getScore` O(n log n) times during sort~~ |
| ~~M19~~ | ~~`src/app/api/health/route.ts`~~ | ~~No try-catch — unhandled 500 with no JSON body~~ |
| ~~M20~~ | ~~`src/app/api/health/route.ts`~~ | ~~503 responses cached by CDN with `s-maxage=30` — serves "down" for 30s~~ |
| ~~M21~~ | ~~`src/app/api/cities/sphere/route.ts`~~ | ~~No try-catch; silent empty 200 on missing `category` param~~ |
| ~~M22~~ | ~~`src/app/cities/[id]/page.tsx`~~ | ~~Inert `Suspense` around `CityVitals` — `weather` already resolved above~~ |
| ~~M23~~ | ~~`src/app/cities/[id]/page.tsx`~~ | ~~No ISR / static generation — every request is fully dynamic~~ |
| ~~M24~~ | ~~`src/app/cities/[id]/ExperiencesSection.tsx`~~ | ~~`placeNotesMap`, `filteredData`, `displayData`, `tabCounts` not memoized~~ |
| ~~M25~~ | ~~`src/app/cities/[id]/ExperiencesSection.tsx`~~ | ~~Constants (`tabs`, `priceLevelLabels`, `priceLevels`) defined inside component~~ |
| ~~M26~~ | ~~`src/components/features/city/CitySphereBackground.tsx`~~ | ~~CSS `transition` on RAF-driven transforms — dead weight~~ |
| ~~M27~~ | ~~`src/components/features/city/CitySphereBackground.tsx`~~ | ~~Unstable `${label}-${i}` keys cause full remount on label load~~ |
| ~~M28~~ | ~~`src/components/features/city/CitySearch.tsx`~~ | ~~`matchTypeLabel` called twice per result row~~ |
| ~~M29~~ | ~~`src/components/features/city/CitySearch.tsx`~~ | ~~`handleKeyDown`, `handleLocate` not wrapped in `useCallback`~~ |
| ~~M30~~ | ~~`src/hooks/useDeviceType.ts`~~ | ~~`visualViewport.resize` fires at 60fps with no throttle~~ |

---

## 🟢 Low Severity (Polish)

All items shipped ✅

| # | File | Issue |
|---|------|-------|
| ~~L1~~ | ~~`src/lib/cache.ts`~~ | ~~`set` checks `map.has()` then `map.delete()` — two Map lookups where one suffices~~ |
| ~~L2~~ | ~~`src/lib/cache.ts`~~ | ~~Eviction `while` loop runs at most once — replace with `if`~~ |
| ~~L3~~ | ~~`src/lib/cache-config.ts`~~ | ~~`cacheControlFor` recomputes static strings per call — precompute~~ |
| ~~L4~~ | ~~`src/lib/storage.ts`~~ | ~~`hasLocalStorage()` re-evaluates `typeof window` per call~~ |
| ~~L5~~ | ~~`src/lib/storage.ts`~~ | ~~`console.warn` on every failed write with no throttle~~ |
| ~~L6~~ | ~~`src/lib/http.ts`~~ | ~~Headers reconstructed on every retry attempt~~ |
| ~~L7~~ | ~~`src/lib/http.ts`~~ | ~~`isIdempotent` normalizes method string per call~~ |
| ~~L8~~ | ~~`src/lib/providers/gemini.ts`~~ | ~~`await result.response.text()` — `.text()` is synchronous in the SDK~~ |
| ~~L9~~ | ~~`src/lib/weather.ts`~~ | ~~Dead reassignment of `primary`~~ |
| ~~L10~~ | ~~`src/lib/weather.ts`~~ | ~~No input validation on `lat`/`lng`~~ |
| ~~L11~~ | ~~`src/lib/cities.ts`~~ | ~~`getTopCities` not cached at module level~~ |
| ~~L12~~ | ~~`src/lib/places.ts`~~ | ~~`recordPlacesCacheEvent` RPC on every cold request — no sampling~~ |
| ~~L13~~ | ~~`src/lib/places.ts`~~ | ~~`displayedTop` sort runs on every warm cache hit~~ |
| ~~L14~~ | ~~`src/lib/ranking.ts`~~ | ~~`rank()` makes 3 passes, allocates n wrapper objects~~ |
| ~~L15~~ | ~~`src/lib/geo.ts`~~ | ~~`sin(x)` computed twice per haversine call~~ |
| ~~L16~~ | ~~`src/lib/intelligence.ts`~~ | ~~Inline date arithmetic duplicates `cache-config.ts` utilities~~ |
| ~~L17~~ | ~~`src/app/actions.ts`~~ | ~~Sequential AI→fallback waterfall; no request-level dedup~~ |
| ~~L18~~ | ~~`src/components/features/city/CitySearch.tsx`~~ | ~~`highlightMatch` uses `useMemo` instead of module-scope function~~ |
| ~~L19~~ | ~~`src/components/features/city/CitySearch.tsx`~~ | ~~`timeOfDay` becomes stale across midnight~~ |
| ~~L20~~ | ~~`src/components/features/city/CitySearch.tsx`~~ | ~~No `React.memo` wrapper~~ |
| ~~L21~~ | ~~`src/hooks/useNetworkQuality.ts`~~ | ~~Dual `getConnection()` reads — potential divergence~~ |
| ~~L22~~ | ~~`src/hooks/useRecentSearches.ts`~~ | ~~`queueMicrotask` causes extra render on mount~~ |

---

## 📊 Stats

| Metric | Count |
|--------|-------|
| Files audited | 30 |
| Critical issues | 8 |
| High severity | 19 |
| Medium severity | 30 |
| Low severity | 22 |
| **Total findings** | **79** |

---

## 🎯 Top 5 Highest-Impact Fixes (by effort-to-value ratio)

1. ~~**`gemini.ts` model name** — 1 line change, fixes ALL AI features~~ ✅
2. ~~**`page.tsx` wrap `getCityById` with `cache()`** — 1 line change, eliminates duplicate DB query per page view~~ ✅
3. ~~**`page.tsx` add `export const revalidate = 3600`** — 1 line, enables ISR caching for all city pages~~ ✅
4. ~~**`CitySphereBackground.tsx` remove `willChange` from children** — 1 line deletion, fixes mobile GPU exhaustion~~ ✅
5. ~~**`cities.ts` replace `findNearestCity` waterfall with single PostGIS RPC** — moderate effort, eliminates 5 sequential DB round trips~~ ✅

---

## Architecture Recommendations

1. ~~**Add `export const revalidate`** to all city-related pages for ISR~~ ✅
2. **Add `generateStaticParams`** for top 100 cities to pre-render at build time _(open — `/cities/[id]` still ƒ in build output)_
3. ~~**Implement request deduplication** using React `cache()` for data fetched in both `generateMetadata` and page components~~ ✅
4. ~~**Add `AbortController` timeouts** to all API routes with external API calls~~ ✅
5. ~~**Consolidate caching utilities** — `cache-config.ts`, `cache.ts`, and `intelligence.ts`'s local `isFresh()` should share one source of truth~~ ✅
6. ~~**Extract `CitySphereBackground` sphere nodes** into `React.memo` sub-components to avoid 120-node re-renders~~ ✅
7. ~~**Bound `http.ts` circuit breaker map** with `LruCache` or fixed provider set~~ ✅
8. ~~**Wire Open-Meteo PM2.5 into weather fallback** — free AQI data currently unused when OWM fails~~ ✅

---

## 🚦 Status Summary (post-Phase 5)

| Tier | Total | Shipped | Open |
|------|------:|--------:|-----:|
| Critical (C) | 8 | 8 | 0 |
| High (H) | 19 | 19 | 0 |
| Medium (M) | 30 | 29 | 1 _(M14, intentional)_ |
| Low (L) | 22 | 22 | 0 |
| **Total** | **79** | **78** | **1** |

Verification: `npm run lint` clean (0 errors), `npm run type-check` clean, `npm run build` green, `npm run test:supabase` 36/36 pass against live backend.

---

## 🔭 Incremental Optimization Opportunities (Phase 6 candidates)

Identified **after** the audit closeout. None are regressions; all are net-new wins flagged during the post-build review on 2026-05-03.

### Quick wins (low risk, high payoff)

| # | Area | Opportunity | Est. Impact |
|---|------|-------------|-------------|
| O1 | `supabase/elastic_search.sql` | Short-circuit tiers 2/3 of `search_cities_elastic` with `WHERE NOT EXISTS (SELECT 1 FROM fts)` so trigram + alias scans only run when FTS is empty | -150–250ms on common hits (`paris`, `london`) |
| O2 | `supabase/elastic_search.sql` | Mark `search_cities_elastic` as `PARALLEL SAFE` (already `STABLE`) so Postgres can parallelize trigram scan over `cities` | -10–30% on cold fuzzy queries |
| O3 | `src/lib/cities.ts`, detail page reads | Replace any lingering `select *` on `cities` with explicit columns | ~40% smaller PostgREST payloads |
| O4 | DB indexes | Run `EXPLAIN ANALYZE` on hot lookups (cities by id, `city_ai_insights` by city_id) — confirm `Index Scan` not `Seq Scan` | Diagnostic |

### Medium wins (worth a focused session)

| # | Area | Opportunity | Est. Impact |
|---|------|-------------|-------------|
| O5 | `src/app/cities/[id]/page.tsx` | Collapse `cities` + `city_ai_insights` + `city_metrics` reads into one PostgREST embed query (`cities(*, city_ai_insights(*), city_metrics(*))`) | -1 round-trip (~200ms) per page render |
| O6 | `src/app/cities/[id]/page.tsx` | Add `generateStaticParams` returning top 100 cities by population — converts hot pages to true ISR (currently `ƒ` in build) | Eliminates Supabase reads on warm CDN hits |
| O7 | `src/app/api/cities/sphere/route.ts` | Confirm `Cache-Control: s-maxage=...` is set on response — let CDN absorb hits | Reduced backend load |
| O8 | Supabase | Materialize a `cities_lite` view with only `(id, city, city_ascii, country, lat, lng, population)` for search payloads | Smaller payloads, narrower GIN target |

### Architectural (only if traffic justifies)

| # | Area | Opportunity | Notes |
|---|------|-------------|-------|
| O9 | Server-side reads | Switch from supabase-js anon REST → Supabase transaction pooler with direct `pg` client for hot server-side reads | Saves ~30–60ms per call vs PostgREST. Only worthwhile at >10k req/min. |
| O10 | `src/lib/cities.ts` | Verify the module-level top-cities cache covers detail-page reads, not just search; consider 5-min LRU for top-200 cities | Eliminates Supabase calls for the long tail of popular city traffic |

### Diagnostic next step

Wire an `EXPLAIN ANALYZE` probe behind `--explain` flag in `scripts/test-supabase-backend.ts` to attribute observed latency between client RTT and DB plan cost — informs which of O1–O4 will actually pay off.

---

*Report generated by Hermes phased audit pipeline. Updated 2026-05-03 with Phase 6 optimization candidates.*

# Best City Spots — Project Structure

A concise **directory and file map**. For architecture, data strategy, security model, cache TTLs, API surface, and conventions, see [`AGENTS.md`](AGENTS.md) (the canonical source). For setup and commands, see [`README.md`](README.md).

## Stack (one-liner)

Next.js 16 (App Router, React 19, TypeScript 5 strict) · Tailwind 4 · Supabase (Postgres + Auth + Storage + RLS, CLI-managed) · Zod · Google Gemini/Places · OpenWeather/Open-Meteo. Full detail in `AGENTS.md`.

## Directory Structure

```
.
├── src/
│   ├── app/                # App Router: routes, layouts, server actions
│   │   ├── api/            # REST: analytics, cities/sphere, cities/insight, places/{search,save-event}, health, csp-report
│   │   ├── cities/         # /cities listing + /cities/[slug] guide (city-data.ts holds its SEO/data rules)
│   │   ├── countries/      # /countries A–Z index + /countries/[slug]
│   │   ├── guides/         # /guides index of every ranking
│   │   ├── best-cities-*/  # Topical SEO hubs (air quality, nomads, monthly)
│   │   ├── compare/, search/, saved/   # Compare (URL-driven), search results, device-local saves
│   │   ├── actions.ts      # Server actions
│   │   ├── layout.tsx, page.tsx, error.tsx, global-error.tsx, not-found.tsx
│   │   └── globals.css     # "Editorial almanac" design tokens (docs/design-tokens.md)
│   ├── components/         # ui (primitives), layout, search, city, discovery, compare, saved, editorial, home, analytics, seo
│   ├── hooks/              # useStoredValue + useSavedPlaces, usePlaceNotes, useRecentCities
│   ├── platform/           # Platform layer (data-access + cache repositories)
│   └── lib/                # Service layer (business logic, mostly server-only)
├── supabase/               # CLI project: config, migrations/, generated seed.sql, tests/ (pgTAP)
├── scripts/                # Ops: db/ (seed, smoke, PGlite), admin, cache warming, analytics, verification
├── public/                 # Static assets
├── data/                   # Downloaded reference data (GeoNames; gitignored, recreated by `npm run db:seed`)
├── .github/                # CI, security audit, manual deploy workflows (docs/ci-cd.md)
├── next.config.ts          # Next config + hardened response headers
├── Dockerfile, docker-compose.yml
├── tsconfig.json, eslint.config.mjs, postcss.config.mjs, .prettierrc
└── package.json
```

## Service Layer (`src/lib/`)

All third-party calls and DB access live here. Route handlers stay thin.

| File                                                                                                                 | Role                                                                                   |
| -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `supabase.ts`                                                                                                        | Typed lazy clients: publishable + secret; **`requireServerClient()` gates all writes** |
| `supabase-admin.ts`                                                                                                  | Admin session client (`@supabase/ssr`) + `getAdminContext()`                           |
| `database.types.ts`                                                                                                  | `Database` types for supabase-js (`npm run db:types`)                                  |
| `prompt-versions.ts`                                                                                                 | AI cache invalidation versions (shared with warmers)                                   |
| `json-ld.ts`                                                                                                         | `serializeJsonLd()` — escapes `</script>` for every JSON-LD embed                      |
| `env.ts`                                                                                                             | Typed env: `publicEnv()`, `serverEnv()`, `requireServerEnv()`                          |
| `http.ts`                                                                                                            | Outbound HTTP: timeouts, retry+jitter, circuit breaker                                 |
| `providers/*`                                                                                                        | Wrappers for Gemini, Google Places, OpenWeather, Open-Meteo                            |
| `intelligence.ts`                                                                                                    | AI insights + trending (cache-first via `city_ai_insights` / `ai_trending_cache`)      |
| `places.ts`, `place-search-utils.ts`                                                                                 | Google Places fetch + search filters                                                   |
| `weather.ts`                                                                                                         | Weather/AQI with cache                                                                 |
| `metrics.ts`                                                                                                         | City metrics aggregation                                                               |
| `cities.ts`                                                                                                          | City lookup, search (RPC `search_cities`)                                              |
| `ranking.ts`                                                                                                         | Place ranking (Bayesian)                                                               |
| `cache.ts`, `cache-config.ts`                                                                                        | Cache TTLs + `schemaVersion` / `prompt_version` invalidation                           |
| `cost-guard.ts`                                                                                                      | Daily call-limit guard for paid providers                                              |
| `validation.ts`                                                                                                      | Zod schemas (inputs + AI/provider outputs)                                             |
| `place-saves.ts`                                                                                                     | Anonymous aggregate save counters (US-12)                                              |
| `analytics.ts`, `useAnalytics.ts`                                                                                    | Privacy-conscious visitor analytics                                                    |
| `countries.ts`, `topical-hubs.ts`, `sphere-categories.ts`                                                            | SEO hub helpers + curated category sets                                                |
| `logger.ts`, `health.ts`, `geo.ts`, `mapping.ts`, `format.ts`, `image-transforms.ts`, `partialJson.ts`, `storage.ts` | Utilities                                                                              |

> Architecture, read path, cache TTLs, security model, API surface, and conventions are documented in [`AGENTS.md`](AGENTS.md).

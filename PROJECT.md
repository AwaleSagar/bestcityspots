# Best City Spots — Project Structure

A concise **directory and file map**. For architecture, data strategy, security model, cache TTLs, API surface, and conventions, see [`AGENTS.md`](AGENTS.md) (the canonical source). For setup and commands, see [`README.md`](README.md).

## Stack (one-liner)

Next.js 16 (App Router, React 19, TypeScript 5 strict) · Tailwind 4 · Supabase (Postgres + Storage + RLS) · Zod · Google Gemini/Places · OpenWeather/Open-Meteo. Full detail in `AGENTS.md`.

## Directory Structure

```
.
├── src/
│   ├── app/                # App Router: routes, layouts, server actions
│   │   ├── api/            # REST: analytics, cities/sphere, cities/insight, places/{search,save-event}, health, csp-report
│   │   ├── cities/         # /cities listing + /cities/[slug] detail
│   │   ├── countries/      # /countries hub + /countries/[slug]
│   │   ├── best-cities-*/  # Topical SEO hubs (air quality, nomads, monthly)
│   │   ├── actions.ts      # Server actions
│   │   ├── layout.tsx, page.tsx
│   │   └── globals.css     # Liquid-glass design tokens
│   ├── components/         # analytics, effects, features, layout, pages, sections, seo, ui
│   ├── hooks/              # useDeviceType, useNetworkQuality, useRecentSearches
│   ├── config/             # nav.ts
│   ├── platform/           # Platform layer (data-access + cache repositories)
│   └── lib/                # Service layer (business logic, mostly server-only)
├── supabase/               # SQL: baseline files + ordered migrations/
├── scripts/                # Ops: cache warming, analytics, seeding, verification
├── public/                 # Static assets
├── data/                   # Local seed data (worldcities.csv; gitignored)
├── next.config.ts          # Next config + hardened response headers
├── Dockerfile, docker-compose.yml
├── tsconfig.json, eslint.config.mjs, postcss.config.mjs, .prettierrc
└── package.json
```

## Service Layer (`src/lib/`)

All third-party calls and DB access live here. Route handlers stay thin.

| File | Role |
| --- | --- |
| `supabase.ts` | Lazy clients: anon Proxy + service-role; **`requireServerClient()` gates all writes** |
| `json-ld.ts` | `serializeJsonLd()` — escapes `</script>` for every JSON-LD embed |
| `env.ts` | Typed env: `publicEnv()`, `serverEnv()`, `requireServerEnv()` |
| `http.ts` | Outbound HTTP: timeouts, retry+jitter, circuit breaker |
| `providers/*` | Wrappers for Gemini, Google Places, OpenWeather, Open-Meteo |
| `intelligence.ts` | AI insights + trending (cache-first via `city_ai_insights` / `ai_trending_cache`) |
| `places.ts`, `place-search-utils.ts` | Google Places fetch + search filters |
| `weather.ts` | Weather/AQI with cache |
| `metrics.ts` | City metrics aggregation |
| `cities.ts` | City lookup, search (RPC `search_cities_elastic`) |
| `ranking.ts` | Place ranking (Bayesian) |
| `cache.ts`, `cache-config.ts` | Cache TTLs + `schemaVersion` / `prompt_version` invalidation |
| `cost-guard.ts` | Daily call-limit guard for paid providers |
| `validation.ts` | Zod schemas (inputs + AI/provider outputs) |
| `place-saves.ts` | Anonymous aggregate save counters (US-12) |
| `analytics.ts`, `useAnalytics.ts` | Privacy-conscious visitor analytics |
| `countries.ts`, `topical-hubs.ts`, `sphere-categories.ts` | SEO hub helpers + curated category sets |
| `logger.ts`, `health.ts`, `geo.ts`, `mapping.ts`, `format.ts`, `image-transforms.ts`, `partialJson.ts`, `storage.ts` | Utilities |

> Architecture, read path, cache TTLs, security model, API surface, and conventions are documented in [`AGENTS.md`](AGENTS.md).

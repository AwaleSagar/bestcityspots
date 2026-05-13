# Best City Spots — Project Overview

A concise reference to the project's structure, key files, and core architecture. See [README.md](README.md) for setup and commands.

## Stack

- **Framework:** Next.js 16 (App Router) on Node 20, TypeScript 5 (strict)
- **UI:** React 19, Tailwind CSS 4, Framer Motion, liquid-glass CSS tokens
- **Data:** Supabase (Postgres + Storage + RLS), Zod validation
- **Providers:** Google Gemini, Google Places, OpenWeatherMap, Open-Meteo
- **Deploy:** `Dockerfile` (standalone Next build) + `docker-compose.yml`

## Directory Structure

```
.
├── src/
│   ├── app/                # App Router: routes, layouts, server actions
│   │   ├── api/            # REST: analytics, cities/sphere, cities/insight, places/search, health
│   │   ├── cities/         # /cities listing + /cities/[slug] detail
│   │   ├── countries/      # /countries hub + /countries/[slug]
│   │   ├── best-cities-*/  # Topical SEO hubs (air quality, nomads, monthly)
│   │   ├── actions.ts      # Server actions
│   │   ├── layout.tsx, page.tsx
│   │   └── globals.css     # Liquid-glass design tokens
│   ├── components/         # analytics, effects, features, layout, pages, sections, seo, ui
│   ├── hooks/              # useDeviceType, useNetworkQuality, useRecentSearches
│   ├── config/             # nav.ts
│   └── lib/                # Service layer (business logic, mostly server-only)
├── supabase/               # SQL: baseline files + ordered migrations/
├── scripts/                # Ops: cache warming, analytics, backfills, seeding
├── public/                 # Static assets
├── data/                   # Local seed data (gitignored CSVs + city_ai_candidates.txt)
├── graphify-out/           # Generated knowledge graph (do not edit)
├── fallbackPage/           # Static fallback page
├── next.config.ts          # Next config + hardened response headers
├── Dockerfile, docker-compose.yml
├── tsconfig.json, eslint.config.mjs, postcss.config.mjs, .prettierrc
└── package.json
```

## Service Layer (`src/lib/`)

All third-party calls and DB access live here. Route handlers stay thin.

| File                                                                                                                 | Role                                                          |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `supabase.ts`                                                                                                        | Lazy Supabase clients (anon Proxy + service-role)             |
| `env.ts`                                                                                                             | Typed env: `publicEnv()`, `serverEnv()`, `requireServerEnv()` |
| `http.ts`                                                                                                            | Outbound HTTP: timeouts, retry+jitter, circuit breaker        |
| `providers/*`                                                                                                        | Wrappers for Gemini, Google Places, OpenWeather, Open-Meteo   |
| `intelligence.ts`                                                                                                    | Gemini AI insights (cache-first via `city_ai_insights`)       |
| `places.ts`, `place-search-utils.ts`                                                                                 | Google Places fetch + search filters                          |
| `weather.ts`                                                                                                         | Weather/AQI with cache                                        |
| `metrics.ts`                                                                                                         | City metrics aggregation                                      |
| `cities.ts`                                                                                                          | City lookup, search (RPC `search_cities_elastic`)             |
| `ranking.ts`                                                                                                         | Place ranking (Bayesian)                                      |
| `cache.ts`, `cache-config.ts`                                                                                        | Cache TTLs + `schemaVersion` / `prompt_version` invalidation  |
| `cost-guard.ts`                                                                                                      | Daily call-limit guard for paid providers                     |
| `validation.ts`                                                                                                      | Zod schemas (inputs + AI/provider outputs)                    |
| `analytics.ts`, `useAnalytics.ts`                                                                                    | Privacy-conscious visitor analytics                           |
| `countries.ts`, `topical-hubs.ts`, `sphere-categories.ts`                                                            | SEO hub helpers + curated category sets                       |
| `logger.ts`, `health.ts`, `geo.ts`, `mapping.ts`, `format.ts`, `image-transforms.ts`, `partialJson.ts`, `storage.ts` | Utilities                                                     |

## Core Architecture

**Layered monolith.** Route handlers and server actions stay thin; business logic lives in `src/lib/`. No microservices, no message broker.

**Read path:**

1. Server Component / route handler / server action calls a `src/lib/*` function.
2. The function checks the Supabase cache table first (`city_ai_insights`, `city_places_cache`, `city_weather_cache`, etc.).
3. On miss/stale, it calls the external provider via `providers/*` (routed through `http.ts`), returns data, and upserts the cache (often in the background).
4. Client Components receive strictly-typed, Zod-validated props.

**Cache TTLs** (`src/lib/cache-config.ts`):

| Tier     | Fresh  | SWR    | Hard  |
| -------- | ------ | ------ | ----- |
| PLACES   | 30 d   | 7 d    | 90 d  |
| INSIGHTS | 365 d  | 30 d   | 730 d |
| WEATHER  | 60 min | 30 min | 24 h  |
| METRICS  | 60 min | 30 min | 24 h  |
| TRENDING | 24 h   | 12 h   | 7 d   |

Bump `CACHE_TIERS[*].schemaVersion` or `PROMPT_VERSIONS` to invalidate.

**Security:**

- Public-read app; writes restricted to `service_role` (server-only).
- Supabase RLS is the primary boundary — review on every table/policy change.
- All inputs and AI outputs validated with Zod.
- Hardened response headers in `next.config.ts`.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client.
- Paid-provider calls gated by `cost-guard.ts` daily limits.

**API surface** (`src/app/api/`):

- `POST /api/analytics` — batched, size-limited event ingestion
- `GET  /api/cities/sphere` — sphere visualization data
- `GET  /api/cities/insight` — SSE-streamed AI city briefing
- `GET  /api/places/search` — filtered places search
- `GET  /api/health` — dependency status

## Common Workflows

```bash
npm run dev          # Local dev
npm run lint         # ESLint + security plugin — fix all warnings
npm run type-check   # tsc --noEmit
npm run build        # Production build
npm run warm-cache   # Populate Supabase caches
npm run analytics    # Visitor analytics report
```

## Conventions

- Read env via `publicEnv()` / `serverEnv()` from `src/lib/env.ts`, never `process.env` directly.
- All outbound HTTP through `src/lib/http.ts` and `src/lib/providers/*`.
- Cache-first + stale-while-revalidate for every provider call.
- Validate all inputs and AI/provider outputs with Zod (`src/lib/validation.ts`).
- Style via Tailwind classes + liquid-glass CSS vars; no hardcoded colors.
- Prefer Server Components; mark server-only modules with `import "server-only"`.
- New schema changes land in `supabase/migrations/` as idempotent, timestamped SQL files.

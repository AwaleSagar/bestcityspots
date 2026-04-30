# Best City Spots — Project Overview

A concise reference to the project's structure, key files, and core architecture.

## Stack

- **Framework**: Next.js 16 (App Router) on Node 20, TypeScript 5 (strict)
- **UI**: React 19, Tailwind CSS 4, Framer Motion, "liquid glass" CSS tokens
- **Data**: Supabase (Postgres + Storage + RLS), Zod validation
- **AI/Providers**: Google Gemini, Google Places, OpenWeatherMap, Open-Meteo
- **Deploy**: Dockerfile (standalone Next build) + `docker-compose.yml`

## Directory Structure

```
.
├── src/
│   ├── app/                # App Router: routes, layouts, server actions
│   │   ├── api/            # REST endpoints (analytics, cities, health, places)
│   │   ├── cities/[id]/    # Dynamic city detail pages
│   │   ├── actions.ts      # Server actions
│   │   ├── layout.tsx      # Root layout
│   │   └── globals.css     # Liquid-glass design tokens
│   ├── components/         # UI: layout, sections, features, effects, ui, analytics
│   ├── hooks/              # Client React hooks
│   └── lib/                # Service layer (business logic, server-only)
├── supabase/               # SQL: schema, RLS, RPCs, migrations
├── scripts/                # Ops: cache warming, analytics, backfills, seeding
├── public/                 # Static assets
├── docs/                   # Design/reference docs
├── data/                   # Local seed data (large CSVs, gitignored)
├── graphify-out/           # Generated knowledge graph (do not edit)
├── fallbackPage/           # Static fallback assets
├── next.config.ts          # Next config + hardened response headers
├── tsconfig.json
├── eslint.config.mjs       # ESLint + eslint-plugin-security
├── Dockerfile, docker-compose.yml
└── package.json
```

## Key Files (`src/lib/`)

The service layer — all third-party calls and DB access live here.

| File                | Role                                                         |
| ------------------- | ------------------------------------------------------------ |
| `supabase.ts`       | Supabase client init (anon + server-only service role)       |
| `env.ts`            | Typed env access (`publicEnv`, `serverEnv`, `requireServerEnv`) |
| `http.ts`           | Outbound HTTP: timeouts, retry+jitter, circuit breaker       |
| `providers/*`       | Wrappers for Gemini, Google Places, OpenWeather, Open-Meteo  |
| `intelligence.ts`   | Gemini AI insights (cache-first via `city_ai_insights`)      |
| `places.ts`         | Google Places fetcher with Supabase cache                    |
| `weather.ts`        | Weather/AQI with cache                                       |
| `metrics.ts`        | City metrics aggregation                                     |
| `cities.ts`         | City lookup, search (RPC `search_cities_elastic`)            |
| `ranking.ts`        | Place ranking logic                                          |
| `cache.ts`, `cache-config.ts` | Cache TTLs + `schemaVersion` / `prompt_version` invalidation |
| `validation.ts`     | Zod schemas (inputs + AI/provider outputs)                   |
| `analytics.ts`, `useAnalytics.ts` | Privacy-conscious visitor analytics       |
| `logger.ts`, `health.ts`, `geo.ts`, `mapping.ts`, `format.ts` | Utilities |

## Core Architecture

**Layered monolith.** Route handlers and server actions stay thin; business
logic lives in `src/lib/`. No microservices, no message broker.

**Data flow (read path):**

1. Server Component / route handler calls a `src/lib/*` function.
2. The function checks the Supabase cache table first (e.g. `city_ai_insights`,
   `city_places_cache`, `city_weather_cache`).
3. On miss/stale, it calls the external provider via `providers/*` (which goes
   through `http.ts`), returns data, and upserts the cache in the background.
4. Client Components receive strictly-typed, Zod-validated props.

**Cache TTLs** (`src/lib/cache-config.ts`): places 30d (7d soft refresh),
AI insights 365d, weather 60m, metrics 60m, trending 24h. Bump
`schemaVersion` / `PROMPT_VERSIONS` to invalidate.

**Security:**

- Public-read app; writes restricted to `service_role` (server-only).
- Supabase RLS is the primary boundary — review on every table/policy change.
- All inputs and AI outputs validated with Zod.
- Hardened response headers in `next.config.ts`.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client.

**API surface** (`src/app/api/`): `POST /api/analytics`, `GET /api/cities/sphere`,
`GET /api/health`, plus place endpoints.

## Common Workflows

```bash
npm run dev          # local dev
npm run lint         # ESLint (incl. security plugin) — fix all warnings
npm run type-check   # tsc --noEmit
npm run build        # production build
npm run warm-cache   # populate Supabase caches
npm run analytics    # visitor analytics report
```

## Conventions

- Use `publicEnv()` / `serverEnv()` from `src/lib/env.ts`, never `process.env`.
- All outbound HTTP through `src/lib/http.ts` and `src/lib/providers/*`.
- Cache-first pattern for any provider call.
- Validate all inputs/outputs with Zod from `src/lib/validation.ts`.
- Style via Tailwind classes + liquid-glass CSS vars; no hardcoded colors.
- Prefer Server Components; mark server-only modules with `server-only`.

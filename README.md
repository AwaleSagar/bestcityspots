# Best City Spots

A premium urban-intelligence web app for deliberate travelers. Search, compare, and explore the world's most vibrant cities with AI-assisted briefings, live weather, air quality, curated places, and city-level metrics — wrapped in a refined "liquid glass" UI.

## Highlights

- **AI city briefings** — Google Gemini (`gemini-3-flash-preview`) generates intros, attractions, seasons, and weather guidance. Streamed over SSE on city pages; Zod-validated.
- **Curated places** — Top experiences, restaurants, and hotels from the **Google Places API (New)**, ranked with a Bayesian engine, with BlurHash placeholders and Supabase Storage image cache.
- **Live conditions** — Weather via **OpenWeatherMap**, pollution / climate signals via **Open-Meteo**, refreshed every 60 minutes.
- **City metrics** — Cost-of-living, safety, connectivity, pollution, and health-access aggregates.
- **Multi-mode search** — Postgres FTS + trigram fuzzy + alias RPC (`search_cities_elastic`), recent-search memory, and GPS-based nearest-city lookup.
- **Layered caching** — Tiered TTLs in Supabase (places 30d / soft 7d, AI insights 365d, weather 60m, metrics 60m, trending 24h) with `schemaVersion` / `prompt_version` invalidation.
- **Privacy-first analytics** — Aggregate-only daily tables, GDPR geo-consent banner, no per-user profiling.
- **Hardened HTTP** — Per-provider circuit breakers, timeouts, retry+jitter, and a daily call-limit cost guard.

## Tech Stack

| Category           | Technologies                                                      |
| ------------------ | ----------------------------------------------------------------- |
| Framework          | Next.js 16 (App Router), React 19, TypeScript 5 (strict)          |
| Styling            | Tailwind CSS 4, liquid-glass CSS custom properties, `next-themes` |
| Database / Storage | Supabase (Postgres, RLS, Storage `place_images` bucket)           |
| AI                 | Google Generative AI — Gemini (`gemini-3-flash-preview`)          |
| External APIs      | Google Places (New), OpenWeatherMap, Open-Meteo                   |
| Validation         | Zod (inputs, AI outputs, env vars)                                |
| Animation          | Framer Motion                                                     |
| Imaging            | Sharp (server), BlurHash placeholders                             |
| Build / Deploy     | Standalone Next build, Dockerfile, `docker-compose.yml`           |
| Linting            | ESLint 9, `eslint-plugin-security`, Prettier                      |

## Project Structure

```text
.
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── api/
│   │   │   ├── analytics/        # POST — batched event ingestion
│   │   │   ├── cities/sphere/    # GET  — sphere visualization data
│   │   │   ├── cities/insight/   # GET  — SSE-streamed AI city briefing
│   │   │   ├── places/search/    # GET  — filtered places search
│   │   │   └── health/           # GET  — dependency health
│   │   ├── cities/               # /cities listing + /cities/[slug] detail
│   │   ├── countries/            # /countries + /countries/[slug] hubs
│   │   ├── best-cities-by-air-quality/
│   │   ├── best-cities-for-digital-nomads/
│   │   ├── best-cities-to-visit-in/[month]/   # 12 monthly hubs
│   │   ├── about/, methodology/, press/, resources/top-cities/
│   │   ├── actions.ts            # Server actions (trending destinations)
│   │   ├── layout.tsx, page.tsx, globals.css
│   │   └── robots.ts, sitemap.ts, manifest.ts, opengraph-image.tsx
│   ├── components/
│   │   ├── analytics/            # Provider, GeoConsentBanner, PageTracker
│   │   ├── effects/              # Visual / motion effects
│   │   ├── features/city/        # Search, sphere background, vitals, etc.
│   │   ├── layout/               # Nav, footer, theme, mobile bottom nav
│   │   ├── pages/                # Page-level composition
│   │   ├── sections/             # Hero, testimonials, CTAs
│   │   ├── seo/                  # CityCard, TopicalHubLayout
│   │   └── ui/                   # Breadcrumbs, buttons, scroll, hotspots
│   ├── hooks/                    # useDeviceType, useNetworkQuality, useRecentSearches
│   ├── config/                   # Static config (nav)
│   └── lib/                      # Service layer — see below
├── supabase/                     # SQL: schema, RLS, RPCs, + migrations/
├── scripts/                      # Operational TS/shell tools
├── data/                         # Local seed data (city_ai_candidates.txt)
├── public/                       # Static assets
├── fallbackPage/                 # Static fallback page
├── graphify-out/                 # Generated knowledge graph (do not edit)
├── Dockerfile, docker-compose.yml
├── next.config.ts                # Hardened response headers
└── package.json
```

### Service layer (`src/lib/`)

All third-party calls and database access live here. Route handlers and server actions stay thin.

| File                                                                                                                 | Role                                                                |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `supabase.ts`                                                                                                        | Lazy Supabase clients (anon + service-role)                         |
| `env.ts`                                                                                                             | Typed env access: `publicEnv()`, `serverEnv()`, `requireServerEnv`  |
| `http.ts`                                                                                                            | Outbound HTTP: timeouts, retry+jitter, per-provider circuit breaker |
| `providers/{gemini,googlePlaces,openweather,openMeteo}.ts`                                                           | Provider wrappers (all go through `http.ts`)                        |
| `intelligence.ts`                                                                                                    | Gemini AI insights — cache-first via `city_ai_insights`             |
| `places.ts`, `place-search-utils.ts`                                                                                 | Google Places fetch + search filters                                |
| `weather.ts`                                                                                                         | Weather + AQI with cache                                            |
| `metrics.ts`                                                                                                         | City metrics aggregation                                            |
| `cities.ts`                                                                                                          | City lookup + search (RPC `search_cities_elastic`)                  |
| `ranking.ts`                                                                                                         | Bayesian ranking for places                                         |
| `cache.ts`, `cache-config.ts`                                                                                        | Cache TTL tiers + `schemaVersion` invalidation                      |
| `validation.ts`                                                                                                      | Zod schemas (inputs + AI/provider outputs)                          |
| `cost-guard.ts`                                                                                                      | Daily call-limit guard for paid providers                           |
| `analytics.ts`, `useAnalytics.ts`                                                                                    | Privacy-conscious visitor analytics                                 |
| `countries.ts`, `topical-hubs.ts`, `sphere-categories.ts`                                                            | SEO hub helpers + curated category sets                             |
| `logger.ts`, `health.ts`, `geo.ts`, `mapping.ts`, `format.ts`, `image-transforms.ts`, `partialJson.ts`, `storage.ts` | Utilities                                                           |

## Setup

### Prerequisites

- Node.js 20.x+ and npm 10.x+

### Install & run

```bash
npm install
npm run dev          # http://localhost:3000
```

### Environment

Create `.env.local` in the repo root. All keys are optional at build time — placeholder values are sufficient for `lint`, `type-check`, and `build`; the app degrades gracefully when backends are unreachable.

```env
# Supabase (public)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Supabase (server-only — required for cache writes / admin paths)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Providers (server-only)
GOOGLE_PLACES_API_KEY=your_google_places_key
OPENWEATHERMAP_API_KEY=your_openweathermap_key

# AI briefings — Gemini ⇄ OpenAI with automatic fallback.
# AI_PROVIDER picks the preferred engine (default gemini); the other is
# used when the preferred one is unconfigured, disabled, or over budget.
AI_PROVIDER=gemini
GOOGLE_GEMINI_API_KEY=your_gemini_key
OPENAI_API_KEY=your_openai_key

# Cost guard (server-only) — gate paid provider calls
GOOGLE_PLACES_LIVE_FETCH_ENABLED=false
GOOGLE_GEMINI_LIVE_FETCH_ENABLED=false
OPENAI_LIVE_FETCH_ENABLED=false
GOOGLE_PLACES_DAILY_CALL_LIMIT=100
GOOGLE_GEMINI_DAILY_CALL_LIMIT=25
OPENAI_DAILY_CALL_LIMIT=25

# Observability (server-only, optional)
LOG_LEVEL=info
HEALTH_CHECK_TOKEN=optional_bearer_for_detailed_health

# SEO / metadata (public, optional)
NEXT_PUBLIC_SITE_URL=https://bestcityspots.com
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=token
NEXT_PUBLIC_ORGANIZATION_SAME_AS=https://twitter.com/...,https://...
NEXT_PUBLIC_CONTACT_EMAIL=contact@example.com

# Dev-only
NEXT_PUBLIC_ANALYTICS_DEV=1
```

Read env via `publicEnv()` / `serverEnv()` from `src/lib/env.ts` — not `process.env` directly. Use `requireServerEnv(key)` when a value is mandatory at the call site.

### Database

SQL lives under `supabase/`. Baseline files are at the root of that directory; new schema changes go in `supabase/migrations/<YYYYMMDDHHMM>_<short_description>.sql` (idempotent, one concern per file — see `supabase/migrations/README.md`).

Apply migrations in order:

```bash
for f in supabase/migrations/*.sql; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done
```

Key tables:

| Table                                                                                                                             | Purpose                                                           |
| --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `cities`                                                                                                                          | City core data + alias support                                    |
| `city_ai_insights`                                                                                                                | Cached Gemini briefings (365-day fresh)                           |
| `city_places_cache`, `place_details_cache`                                                                                        | Google Places landmarks / details (30-day fresh, 7-day SWR)       |
| `city_weather_cache`                                                                                                              | Weather + AQI snapshots (60-minute fresh)                         |
| `city_metrics`                                                                                                                    | Aggregate metrics (cost, safety, connectivity, pollution, health) |
| `ai_trending_cache`                                                                                                               | AI trending destinations (24-hour fresh)                          |
| `daily_visitor_stats`, `traffic_sources_daily`, `device_stats_daily`, `geo_stats_daily`, `city_views_daily`, `user_actions_daily` | Aggregated privacy-first analytics                                |

### Commands

```bash
npm run dev                    # Dev server (port 3000)
npm run build                  # Production build (standalone)
npm run start                  # Production server

npm run lint                   # ESLint (incl. eslint-plugin-security)
npm run lint:fix
npm run format                 # Prettier write
npm run format:check
npm run type-check             # tsc --noEmit

npm run warm-cache             # Warm AI / trending / places caches
npm run warm-cache:trending    # Trending only
npm run warm-cache:dry-run     # No writes

npm run analytics              # Visitor analytics report (7d default)
npm run analytics:30d          # 30-day window
npm run analytics:json         # JSON output

npm run test:google-places     # Manual Google Places integration check
npm run test:supabase          # Supabase backend smoke tests
npm run test:supabase:json
npm run test:refactor          # Cross-cutting refactor verification
```

### Docker

```bash
docker build -t bestcityspots \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=... \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
  --build-arg GOOGLE_PLACES_API_KEY=... \
  --build-arg GOOGLE_GEMINI_API_KEY=... \
  .

docker run -p 3000:3000 --env-file .env.local bestcityspots
```

Public `NEXT_PUBLIC_*` vars are baked in at build time via `--build-arg`. Runtime-only secrets (`SUPABASE_SERVICE_ROLE_KEY`, `OPENWEATHERMAP_API_KEY`, cost-guard flags) flow through `--env-file` / `-e`.

Or with Compose (reads `.env.production`):

```bash
docker compose up --build
```

## Routes

### Pages

| Route                              | Description                                             |
| ---------------------------------- | ------------------------------------------------------- |
| `/`                                | Home — hero, search, trending, trust, testimonials      |
| `/about`, `/methodology`, `/press` | About, methodology, press                               |
| `/cities`                          | Cities index                                            |
| `/cities/[slug]`                   | City detail — AI briefing, experiences, weather, vitals |
| `/countries`, `/countries/[slug]`  | Country hubs                                            |
| `/best-cities-by-air-quality`      | Air-quality SEO hub                                     |
| `/best-cities-for-digital-nomads`  | Digital-nomads SEO hub                                  |
| `/best-cities-to-visit-in/[month]` | 12 monthly SEO hubs                                     |
| `/resources/top-cities`            | Top cities resource                                     |

### API

| Endpoint              | Method | Description                                                                   |
| --------------------- | ------ | ----------------------------------------------------------------------------- |
| `/api/analytics`      | POST   | Batched, size-limited analytics events                                        |
| `/api/cities/sphere`  | GET    | Sphere visualization data (`mode=categories\|population\|category`)           |
| `/api/cities/insight` | GET    | SSE stream of AI city briefing (cache-first; emits stale → chunks → complete) |
| `/api/places/search`  | GET    | Filtered places search (type, rating, price tier, sort, paging, geo)          |
| `/api/health`         | GET    | Lightweight dependency status (token-gated detail)                            |

## Architecture

Layered monolith. Read path:

1. Server Component / route handler / server action calls a `src/lib/*` function.
2. The function checks the relevant Supabase cache table first.
3. On miss/stale, it calls the external provider via `src/lib/providers/*` (which routes through `http.ts` with timeouts, retries, and a circuit breaker).
4. Fresh data is returned to the caller and upserted to cache (often in the background).
5. Client Components receive strictly-typed, Zod-validated props.

**Cache invalidation:** bump `CACHE_TIERS[*].schemaVersion` in `src/lib/cache-config.ts`, or `PROMPT_VERSIONS` in `src/lib/providers/gemini.ts` for AI caches. Mismatches are treated as a miss; no data migration required.

**Security:**

- Public-read app; privileged writes restricted to `service_role` (server-only).
- Supabase RLS is the primary boundary — review on every table / policy change.
- All inputs and AI outputs validated with Zod.
- Hardened response headers (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, X-DNS-Prefetch-Control) in `next.config.ts`.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client.

## License & Contributing

- License: **MIT** — see [LICENSE](LICENSE).
- Contributing: see [CONTRIBUTING.md](CONTRIBUTING.md). High-level project context: [PROJECT.md](PROJECT.md). Agent / Copilot context: [AGENTS.md](AGENTS.md).

# Best City Spots Agent Context

## Backend Architecture Context

### System Overview

Best City Spots is a single Next.js 16 application that combines the product UI with a lightweight backend layer. The backend responsibilities live in App Router route handlers, server actions, and `server-only` service modules under `src/lib`.

This project is primarily a public web application with a small REST-style surface:

- `POST /api/analytics` — batched, privacy-conscious visitor analytics ingestion
- `GET /api/cities/sphere` — cached city visualization data
- `GET /api/cities/insight` — SSE-streamed AI city briefing (cache-first)
- `GET /api/places/search?cityId=` — filtered places search (cache-only reads)
- `POST /api/places/save-event` — anonymous aggregate "saved this" counter (US-12)
- `GET /api/health` — lightweight dependency status (token-gated detail)
- `POST /api/csp-report` — CSP violation sink (logs only; no persistence)
- `GET /auth/confirm` — admin magic-link landing (`verifyOtp` / PKCE code exchange)
- `/admin`, `/admin/login` — invite-only admin area (aggregate analytics, provider budget)

There is no GraphQL layer, no separate microservice boundary, and no event-streaming platform in the repo today.

### Tech Stack

- Language: TypeScript 5 in strict mode
- Runtime/framework: Next.js 16 App Router on Node.js 22 LTS
- Database: Supabase Postgres, managed with the Supabase CLI (`supabase/`)
- Auth: Supabase Auth, admin-only (sign-up disabled; `@supabase/ssr` cookie sessions for `/admin`)
- Storage: Supabase Storage (`place_images` bucket)
- Validation: Zod for API inputs, AI responses, and internal data normalization
- External providers:
  - Google Gemini for AI city insights and trending destinations
  - Google Places API for landmarks, restaurants, hotels, and photos
  - OpenWeatherMap for weather and AQI
  - Open-Meteo for pollution and climate comfort inputs
- Infra/deployment artifacts: Dockerfile with standalone Next build, `docker-compose.yml`
- Search: `search_cities` RPC — prefix, FTS, trigram, edit distance and GeoNames aliases
- Reference data: GeoNames (cities, CC BY 4.0) and World Bank WDI (country indicators, CC BY 4.0), loaded by `scripts/db/seed.ts`

### Architecture Pattern

Use a layered monolith mindset:

- Route handlers and server actions should stay thin and focus on request parsing, validation, and response shaping.
- Business logic, cache orchestration, provider calls, and Supabase access belong in `src/lib`.
- Heavier data behaviors are intentionally pushed into Supabase SQL and RPC functions when atomicity or search performance matters.

Current backend organization:

- `src/app/api/**`: HTTP endpoints
- `src/app/actions.ts`: server actions
- `src/lib/supabase.ts`: typed clients (`createClient<Database>`, types in `src/lib/database.types.ts`); `requireServerClient()` gates all writes
- `src/lib/supabase-admin.ts` + `src/proxy.ts`: admin session client and session refresh (admin routes only)
- `src/lib/*.ts`: service layer for cities, places, weather, metrics, intelligence, ranking, validation, and JSON-LD serialization (`json-ld.ts`)
- `supabase/migrations/`: schema, policies, indexes, RPCs (CLI-managed; see `supabase/README.md`)
- `supabase/tests/database/`: pgTAP tests, run by `npm run check:db` (PGlite) and in CI on the real stack
- `scripts/*`: operational tooling — `db/` (seed, smoke test, PGlite harness), `admin.ts`, cache warming, analytics reporting

### Data Strategy

- Primary system of record is Supabase Postgres.
- The app uses cache-first and stale-while-revalidate patterns extensively to control latency and third-party API cost.
- Tables (see `supabase/README.md` for the migration map):
  - reference data: `countries`, `cities` (GeoNames id PK, unique `slug`), `city_aliases`, `country_indicators` (World Bank, country-level)
  - caches: `city_places_cache` (keyed by `city_id` + `place_type`), `city_weather_cache`, `city_live_metrics`, `city_ai_insights`, `ai_trending_cache`
  - read model: view `city_metrics` = live metrics ⟕ country indicators, with per-value provenance in `source`
  - ledgers: `provider_daily_usage` (durable cost guard), `place_saves_daily`, `cache_hit_stats`
  - analytics (aggregate only): `daily_visitor_stats` (+ view `daily_visitor_summary`), `traffic_sources_daily`, `device_stats_daily`, `geo_stats_daily`, `city_views_daily`, `user_actions_daily`
  - auth: `app_admins`
- Search is database-native through `search_cities`, backed by a generated tsvector, trigram and edit-distance matching, and `city_aliases`.
- Live metric refreshes write only `city_live_metrics`; country indicators live in their own table, so a refresh can never overwrite them.
- Supabase Storage is used for cached Google Places imagery.
- There is no dedicated Redis/memcached layer and no Kafka/RabbitMQ-style messaging system in the current codebase.
- Small in-process caches are acceptable for hot-path read reduction when they remain bounded and non-critical.

### Security Model

- Treat the product as a mostly public-read application.
- RLS is a core security boundary and should be reviewed whenever tables or policies change.
- Keys: the publishable key (`sb_publishable_…`, browser-safe) maps to `anon`; the secret key (`sb_secret_…`, server-only) maps to `service_role`. Legacy JWT keys are not used.
- Every table has RLS **and explicit GRANTs** (new projects don't auto-expose tables). Public data is readable by `anon`/`authenticated`; **all writes are hard-locked to `service_role`** — cache write paths gate on `requireServerClient()` (`src/lib/supabase.ts`), which throws if the secret key is missing rather than silently degrading to the publishable client.
- **No `SECURITY DEFINER` functions** (they bypass RLS — the 2026-09-12 audit's H-1). RPCs are `security invoker`, pin `set search_path = ''`, `revoke all … from public`, and grant EXECUTE only to the roles that call them: `search_cities` to everyone, everything else to `service_role`. Views are `security_invoker = true`. `npm run check:migrations` enforces this; `00_security_posture.test.sql` verifies it on a live database.
- Storage: `place_images` is public-read by URL (1 MiB, `image/jpeg`), with no `storage.objects` policies at all — no listing, uploads only via the secret key.
- Request paths a visitor can trigger must never be able to spend the whole provider budget. Visitor-triggered AI generation claims from a separate, smaller envelope (`AI_ON_DEMAND_DAILY_CALL_LIMIT`, `tryClaimOnDemandAiUse()`) on top of the engine budget, so the nightly warmer cannot be starved (audit M-2).
- Treat `x-vercel-ip-*` (and any other edge-set header) as attacker-controlled off Vercel: the proxy strips them (`deploy/ansible/templates/bestcityspots-proxy.conf.j2`) and the app re-validates shape and length before storing (audit M-3).
- Bound every free-text and numeric field on unauthenticated endpoints — unbounded values become unbounded rows and unbounded RPC fan-out (audit M-4).
- Never expose `SUPABASE_SECRET_KEY` to the client (no `NEXT_PUBLIC_` prefix, no Docker build arg). Keep privileged writes in server-only code.
- Validate request payloads and model outputs with Zod before trusting them.
- JSON-LD embedded via `dangerouslySetInnerHTML` must serialize through `serializeJsonLd()` (`src/lib/json-ld.ts`) to neutralize `</script>` breakout; it is applied at every JSON-LD script site.
- Preserve hardened response headers configured in `next.config.ts`.
- Analytics is designed to be privacy-conscious and aggregate-first. Geo collection should remain consent-based.

Auth/authorization:

- The public site has no end-user accounts; saves, notes and plans stay in `localStorage`.
- Supabase Auth exists only for invite-only admins: sign-up is disabled, `npm run admin -- add <email>` creates the account and the `app_admins` row, and admins sign in with a magic link (`/admin/login` → `/auth/confirm`).
- Admins read ledgers and analytics through RLS policies gated by `private.is_admin()`, using their own session — the admin UI never uses the secret key. `getClaims()` (verified JWT) is used server-side, never `getSession()`.

### Performance & Scalability

- Favor simplicity plus cost-aware caching over premature distributed complexity.
- Keep the app stateless at the Next.js layer so horizontal scaling via containers remains possible.
- Reuse the established TTL strategy from `src/lib/cache-config.ts`:
  - places: 30-day cache, 7-day soft refresh
  - AI insights: 365 days
  - weather: 60 minutes
  - metrics: 60 minutes
  - trending: 24 hours
- Prefer parallel reads where safe, background refreshes for stale cache entries, and SQL/RPC upserts for concurrent aggregate writes.
- Continue using Postgres indexes and RPCs for search and analytics aggregation instead of moving that complexity into route handlers.

### Error Handling And Logging

- Handle failures explicitly in `src/lib` and route handlers.
- Structured logging is available via `createLogger` (`src/lib/logger.ts`); prefer it for new code, while older modules still use pragmatic `console.warn`/`console.error`/`console.info`.
- For user-facing reads, prefer graceful degradation (`null`, `[]`, stale cache fallback, or provider fallback) over hard failure when upstream services are unavailable.
- For write paths, fail safely and keep logs actionable.

### Testing Expectations

- Minimum safety rails are `npm run verify` (lint, format, types, migration policy, PGlite database tests, verification scripts) plus targeted checks for anything network- or credential-dependent (`npm run db:smoke`, `npm run test:providers`).
- Database behaviour is covered by pgTAP (`supabase/tests/database/`): add a test with every table, policy or RPC change.
- When touching backend logic, add focused tests or executable verification scripts where practical, especially around ranking, validation, search behavior, cache freshness, and analytics aggregation.

### Development Principles

- Keep controllers/routes thin; put business rules in `src/lib`.
- Prefer server-only modules for secrets and privileged provider/database operations.
- Follow cache-first plus stale-while-revalidate patterns before adding new live API calls.
- Use Supabase RPCs or SQL functions when writes must be atomic or aggregation-heavy.
- Review and tighten RLS whenever adding tables, storage policies, or write paths.
- Do not bypass Zod validation for request payloads, query params, or AI/provider responses.
- Preserve privacy-first analytics: aggregate counts, consent-based geo, and no unnecessary per-user profiling.
- Prefer explicit null/empty fallbacks over throwing from read paths unless the caller truly needs hard failure semantics.

### Known Assumptions

- The repo is clearly Docker-ready, but the primary production host is not explicitly documented.
- CI runs lint, format check, type check, migration policy, the database
  tests (PGlite and the real Supabase stack), the verification scripts, the
  Next build, and a container build+boot smoke test on push/PR to main
  (`.github/workflows/ci.yml`, Node 22); production migrations run from the
  manual `db-migrate.yml` workflow; `.github/workflows/security.yml`
  fails the build on high/critical advisories in production dependencies and
  runs weekly. Deploys are manual via `.github/workflows/deploy.yml`. Locally,
  `npm run verify` is the same gate set. Full detail: `docs/ci-cd.md`.
- No formal compliance requirement beyond privacy-conscious behavior and GDPR-style geo consent is documented yet.

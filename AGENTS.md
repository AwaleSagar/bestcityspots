# Best City Spots Agent Context

## Backend Architecture Context

### System Overview

Best City Spots is a single Next.js 16 application that combines the product UI with a lightweight backend layer. The backend responsibilities live in App Router route handlers, server actions, and `server-only` service modules under `src/lib`.

This project is primarily a public web application with a small REST-style surface:

- `POST /api/analytics` — batched, privacy-conscious visitor analytics ingestion
- `GET /api/cities/sphere` — cached city visualization data
- `GET /api/cities/insight` — SSE-streamed AI city briefing (cache-first)
- `GET /api/places/search` — filtered places search with cost-guard + circuit breaker
- `POST /api/places/save-event` — anonymous aggregate "saved this" counter (US-12)
- `GET /api/health` — lightweight dependency status (token-gated detail)
- `POST /api/csp-report` — CSP violation sink (logs only; no persistence)

There is no GraphQL layer, no separate microservice boundary, and no event-streaming platform in the repo today.

### Tech Stack

- Language: TypeScript 5 in strict mode
- Runtime/framework: Next.js 16 App Router on Node.js 20
- Database: Supabase Postgres
- Storage: Supabase Storage (`place_images` bucket)
- Validation: Zod for API inputs, AI responses, and internal data normalization
- External providers:
  - Google Gemini for AI city insights and trending destinations
  - Google Places API for landmarks, restaurants, hotels, and photos
  - OpenWeatherMap for weather and AQI
  - Open-Meteo for pollution and climate comfort inputs
- Infra/deployment artifacts: Dockerfile with standalone Next build, `docker-compose.yml`
- Search: Postgres FTS + trigram fuzzy matching + alias RPC (`search_cities_elastic`)

### Architecture Pattern

Use a layered monolith mindset:

- Route handlers and server actions should stay thin and focus on request parsing, validation, and response shaping.
- Business logic, cache orchestration, provider calls, and Supabase access belong in `src/lib`.
- Heavier data behaviors are intentionally pushed into Supabase SQL and RPC functions when atomicity or search performance matters.

Current backend organization:

- `src/app/api/**`: HTTP endpoints
- `src/app/actions.ts`: server actions
- `src/lib/supabase.ts`: client initialization (`requireServerClient()` gates all writes)
- `src/lib/*.ts`: service layer for cities, places, weather, metrics, intelligence, ranking, validation, and JSON-LD serialization (`json-ld.ts`)
- `supabase/*.sql`: schema, policies, indexes, and RPC definitions
- `scripts/*`: operational tooling for cache warming, analytics reporting, and backfills

### Data Strategy

- Primary system of record is Supabase Postgres.
- The app uses cache-first and stale-while-revalidate patterns extensively to control latency and third-party API cost.
- Cache/data tables referenced in the repo include:
  - `cities`
  - `city_ai_insights`
  - `city_places_cache`
  - `place_details_cache`
  - `city_weather_cache`
  - `city_metrics`
  - `ai_trending_cache`
  - `place_saves_daily` (anonymous aggregate save counters)
  - `provider_daily_usage` (durable cost-guard spend ledger)
  - `cache_hit_stats`
  - aggregated analytics tables such as `daily_visitor_stats`
- Search is database-native through `search_cities_elastic`, backed by FTS, trigram indexes, and alias tables.
- Supabase Storage is used for cached Google Places imagery.
- There is no dedicated Redis/memcached layer and no Kafka/RabbitMQ-style messaging system in the current codebase.
- Small in-process caches are acceptable for hot-path read reduction when they remain bounded and non-critical.

### Security Model

- Treat the product as a mostly public-read application.
- RLS is a core security boundary and should be reviewed whenever tables or policies change.
- Public data is generally readable with anon/authenticated roles; **all writes are hard-locked to `service_role`** — cache write paths gate on `requireServerClient()` (`src/lib/supabase.ts`), which throws if the service-role key is missing rather than silently degrading to the anon client.
- RLS is not the only gate: a `SECURITY DEFINER` function **bypasses it**. Every such function must `revoke all ... from public, anon, authenticated`, then grant only `service_role`, and pin `set search_path = public`. PostgreSQL grants EXECUTE to `PUBLIC` by default and granting to another role does not remove it — the 2026-09-12 audit (H-1) found six analytics RPCs reachable with the browser-visible anon key for exactly this reason. Storage policies follow the same rule: `place_images` uploads are `service_role` only.
- Request paths a visitor can trigger must never be able to spend the whole provider budget. Visitor-triggered AI generation claims from a separate, smaller envelope (`AI_ON_DEMAND_DAILY_CALL_LIMIT`, `tryClaimOnDemandAiUse()`) on top of the engine budget, so the nightly warmer cannot be starved (audit M-2).
- Treat `x-vercel-ip-*` (and any other edge-set header) as attacker-controlled off Vercel: the proxy strips them (`deploy/ansible/templates/bestcityspots-proxy.conf.j2`) and the app re-validates shape and length before storing (audit M-3).
- Bound every free-text and numeric field on unauthenticated endpoints — unbounded values become unbounded rows and unbounded RPC fan-out (audit M-4).
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client. Keep privileged writes in server-only code.
- Validate request payloads and model outputs with Zod before trusting them.
- JSON-LD embedded via `dangerouslySetInnerHTML` must serialize through `serializeJsonLd()` (`src/lib/json-ld.ts`) to neutralize `</script>` breakout; it is applied at every JSON-LD script site.
- Preserve hardened response headers configured in `next.config.ts`.
- Analytics is designed to be privacy-conscious and aggregate-first. Geo collection should remain consent-based.

Auth/authorization status from the repo:

- There is no end-user auth flow implemented in application code today.
- Authorization is primarily enforced through Supabase RLS and server-only credentials.
- Marketing analytics reads are limited in SQL policies to authenticated/service contexts.

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

- Minimum safety rails are `npm run lint`, `npm run type-check`, and targeted script-based verification.
- There is not yet a full automated backend test suite in the repo.
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
- CI runs lint + type-check + build on push/PR to main via `.github/workflows/ci.yml` (Node 20).
- No formal compliance requirement beyond privacy-conscious behavior and GDPR-style geo consent is documented yet.

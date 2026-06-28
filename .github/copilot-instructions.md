# Copilot Instructions for Best City Spots

## 1. Project

- **Name:** Best City Spots — premium urban-intelligence web app for deliberate travelers.
- **Stack:** Next.js 16 (App Router, React 19, TypeScript 5 strict), Tailwind CSS 4, Supabase (Postgres + Storage + RLS), Framer Motion, Zod.
- **Canonical architecture source:** [`AGENTS.md`](../AGENTS.md) — full tech stack, data strategy, security model, and file map. This file covers Copilot-specific workflow + conventions; defer to `AGENTS.md` for anything restated here.

## 2. Architecture (quick map — see AGENTS.md for detail)

- `src/app/` — routes, layouts, server actions, `api/*` route handlers. Prefer Server Components.
- `src/lib/` — business logic, DB access, provider calls, AI generation. Route handlers stay thin. All privileged Supabase writes go through `requireServerClient()` (`src/lib/supabase.ts`); JSON-LD embeds serialize through `serializeJsonLd()` (`src/lib/json-ld.ts`).
- `src/components/` — UI (analytics, effects, features, layout, pages, sections, seo, ui).
- `supabase/` — baseline SQL at root; new schema changes in `supabase/migrations/<YYYYMMDDHHMM>_*.sql` (idempotent, one concern per file). **All cache/insights writes are `service_role`-only by RLS.**

## 3. Critical workflows

- **Dev:** `npm run dev`
- **Lint:** `npm run lint` (includes `eslint-plugin-security` — fix all warnings)
- **Type-check:** `npm run type-check`
- **Build:** `npm run build` (standalone Next output)
- **Cache warming:** `npm run warm-cache` (`:trending`, `:dry-run` variants)
- **Manual checks:** `npm run test:google-places`, `npm run test:supabase`, `npm run test:refactor`
- **Analytics report:** `npm run analytics` (`:30d`, `:json` variants)

## 4. Conventions (must follow)

- **Env:** read via `publicEnv()` / `serverEnv()` from `src/lib/env.ts`. Never use `process.env` directly in app code. Use `requireServerEnv(key)` for mandatory values.
- **HTTP:** all third-party calls go through `src/lib/http.ts` and `src/lib/providers/*`. Never `fetch()` an external API from elsewhere.
- **Validation:** every API input, query param, and AI/provider output is validated with Zod. Reuse schemas from `src/lib/validation.ts`.
- **Cache-first:** check DB → call provider → upsert cache. Invalidate by bumping `CACHE_TIERS[*].schemaVersion` (or `PROMPT_VERSIONS` for AI).
- **Server-only:** start server-only modules with `import "server-only"`. Privileged Supabase **writes** use `requireServerClient()` (throws if the service-role key is missing); public reads may use the anon client.
- **Styling:** Tailwind 4 utilities + liquid-glass CSS variables from `src/app/globals.css` (e.g. `--color-glass`, `--liquid-glow-1`, `--shadow-3xl`). No hardcoded colors. No inline `style={{}}` for static styling.
- **Components:** prefer Server Components; mark `"use client"` only when you need browser APIs, event handlers, state, or effects.
- **Errors:** handle explicitly in `src/lib`. Read paths prefer graceful degradation (`null`, `[]`, stale cache fallback) over throwing.

## 5. Common pitfalls

- **Two caches:** `src/lib/storage.ts` is client-side `localStorage`/`sessionStorage`. Supabase cache tables (`city_*_cache`, `city_ai_insights`) are server-side. Don't conflate them.
- **Secrets on client:** only `NEXT_PUBLIC_*` env vars are reachable from client components. **Never** expose `SUPABASE_SERVICE_ROLE_KEY` or any provider API key.
- **Paid providers:** Gemini and Google Places calls are gated by `cost-guard.ts` daily limits. Respect `GOOGLE_*_LIVE_FETCH_ENABLED` flags.
- **SQL:** new schema changes go in `supabase/migrations/` (idempotent, timestamped), not in the baseline files. Review RLS in `supabase/security.sql` / `supabase/harden_security.sql` when adding tables or write paths.
- **Routes:** city detail is `/cities/[slug]` (not `[id]`). SEO hubs live at `/countries`, `/countries/[slug]`, `/best-cities-by-air-quality`, `/best-cities-for-digital-nomads`, and `/best-cities-to-visit-in/[month]`.

## 6. API surface

- `POST /api/analytics` — batched, size-limited analytics events.
- `GET /api/cities/sphere` — sphere visualization data (`mode=categories|population|category`).
- `GET /api/cities/insight` — SSE-streamed AI city briefing (`stale` → `chunk` → `complete`).
- `GET /api/places/search` — filtered places search (type, rating, price tier, sort, paging, geo).
- `POST /api/places/save-event` — anonymous aggregate "saved this" counter (US-12).
- `GET /api/health` — dependency health (token-gated detail via `HEALTH_CHECK_TOKEN`).

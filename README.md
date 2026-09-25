# Best City Spots

A city-research site: search a world-cities dataset, read a briefing, check live weather and air quality, look at curated places, and compare a few candidates side by side. Everything is public — there is no sign-up and no user accounts.

The interesting part, if you are here for the code, is the read path. Visitor requests never call a paid API. They read Supabase caches; fresh data arrives out of band through a nightly warmer, and every paid call is metered by a durable daily budget that fails closed. That constraint came out of an incident where crawler traffic ran up a provider bill, and most of the architecture follows from it.

[![CI](https://github.com/AwaleSagar/bestcityspots/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/AwaleSagar/bestcityspots/actions/workflows/ci.yml)
[![Security](https://github.com/AwaleSagar/bestcityspots/actions/workflows/security.yml/badge.svg?branch=main)](https://github.com/AwaleSagar/bestcityspots/actions/workflows/security.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

<img src="docs/screenshots/home.png" alt="Best City Spots home page: a serif headline, a large city search field and a ranked list of the most-viewed city guides" width="100%" />

## What it does

- **City search** — prefix, full-text, trigram and edit-distance matching plus GeoNames alternate names (Bombay → Mumbai) behind one RPC (`search_cities`). Tolerates typos and transpositions, ranks by match quality with a population boost. There is also a nearest-city lookup from GPS coordinates.
- **City guides** — an AI-written briefing (labelled as such), attractions, seasonal notes, weather, air quality and country-level World Bank indicators (price level, homicide rate, physicians), each with its source and year shown.
- **Places** — landmarks, restaurants and stays from the Google Places API (New), ranked with a Bayesian score. Photos are copied into Supabase Storage and served with BlurHash placeholders, so nothing hotlinks Google and layout does not shift on load.
- **Compare** — up to three cities side by side. The comparison lives in the URL (`/compare?cities=lisbon-portugal,porto-portugal`), so sharing it works.
- **Topical hubs** — generated indexes for air quality, digital nomads, and month-by-month travel, plus per-country pages. These exist for search traffic and only list cities whose caches are actually warm.
- **Saved places** — shortlists, private notes and day-by-day plans stay in the browser (`localStorage`) and collect on `/saved`. A shortlist can be shared as a link; the notes are never encoded into it.
- **Search everywhere** — an inline search on the home page, a ⌘K / Ctrl+K / `/` dialog on every page, and a server-rendered `/search?q=` results page that also works without JavaScript.

Pages: `/`, `/cities`, `/cities/[slug]`, `/countries`, `/countries/[slug]`, `/guides`, `/compare`, `/search`, `/saved`, `/best-cities-by-air-quality`, `/best-cities-for-digital-nomads`, `/best-cities-to-visit-in/[month]`, `/resources/top-cities`, `/methodology`, `/about`, `/accessibility`, `/press`. `/passport` permanently redirects to `/saved`.

The interface follows the "editorial almanac" design system — warm paper and ink neutrals, one harbor-blue accent, Newsreader for display type and Geist for the interface. Tokens, component rules and motion rules live in [`docs/design-tokens.md`](docs/design-tokens.md) and [`docs/motion-policy.md`](docs/motion-policy.md).

API: `/api/cities/insight` (SSE), `/api/cities/sphere`, `/api/places/search`, `/api/places/save-event`, `/api/analytics`, `/api/health`, `/api/csp-report`.

## Stack

Next.js 16 (App Router, standalone output) on Node 22 LTS, React 19, TypeScript in strict mode, Tailwind 4. Supabase provides Postgres, Storage and RLS. Zod validates request input, environment variables and every provider response. Providers: Google Places (New), Gemini and OpenAI for briefings, OpenWeatherMap with Open-Meteo as a keyless fallback. Deployment is a Docker image behind nginx, provisioned with Ansible.

## Requirements

- Node 22 LTS or newer (`.nvmrc`), and npm
- A Supabase project (the free tier is enough) — or Docker/OrbStack to run the whole Supabase stack locally
- API keys, all optional to start: Google Places (New), Gemini and/or OpenAI, OpenWeatherMap

The app degrades rather than crashing when a key is missing — no Places key means no places, no AI key means the briefing section stays empty. Supabase is the one hard dependency.

## Getting started

```bash
git clone https://github.com/AwaleSagar/bestcityspots.git
cd bestcityspots
npm install
cp .env.example .env.local
```

**Option A — local Supabase (Docker/OrbStack):**

```bash
npm run db:start        # boots Postgres/Auth/Storage/API, applies migrations + supabase/seed.sql
```

Copy the printed API URL, Publishable key and Secret key into `.env.local`. The seed contains every country and the 300 largest cities, which is plenty for local work.

**Option B — a hosted Supabase project:** follow `docs/external-services-setup.md` §1 (create the project, keys, auth settings), then:

```bash
npx supabase login && npx supabase link --project-ref <ref>
npm run db:push         # apply supabase/migrations/
npm run db:seed         # ~34k GeoNames cities + World Bank indicators
```

Then check the wiring and start the app:

```bash
npm run db:smoke                        # Data API end-to-end: reads, refused writes, RPCs, storage
npm run admin -- add you@example.com    # optional: an admin for /admin
npm run dev
```

To let a city page fetch and cache real places on first view in development, set `GOOGLE_PLACES_API_KEY` and `GOOGLE_PLACES_LIVE_FETCH_ENABLED=true` in `.env.local`.

## Configuration

Every variable is listed and explained in `.env.example`. They are read through `src/lib/env.ts`, which validates each one with Zod and drops only the invalid value (with a one-time warning) rather than throwing, except where a caller explicitly requires a value.

### Supabase

| Variable                               | Notes                                                                                       |
| -------------------------------------- | ------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Project URL. Also used to build public Storage URLs and the image allow-list (build time).  |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…`. Ships to the browser; RLS decides what it reads. City search uses it.   |
| `SUPABASE_SECRET_KEY`                  | `sb_secret_…`. Server only, bypasses RLS. Every cache write, image upload and budget claim. |

### Providers and budgets

| Variable                                   | Default               | Notes                                                                                                                   |
| ------------------------------------------ | --------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `AI_PROVIDER`                              | `gemini`              | Preferred engine; the other one becomes the fallback.                                                                   |
| `GOOGLE_GEMINI_API_KEY` / `OPENAI_API_KEY` | —                     | At least one is needed for briefings.                                                                                   |
| `GOOGLE_PLACES_API_KEY`                    | —                     | Places API (New), not the legacy Places API.                                                                            |
| `OPENWEATHERMAP_API_KEY`                   | —                     | Without it, weather falls back to Open-Meteo, which needs no key.                                                       |
| `GOOGLE_PLACES_LIVE_FETCH_ENABLED`         | `false` in production | Kill switch. When off, reads are cache-only.                                                                            |
| `GOOGLE_GEMINI_LIVE_FETCH_ENABLED`         | `false` in production | Kill switch.                                                                                                            |
| `OPENAI_LIVE_FETCH_ENABLED`                | `false` in production | Kill switch.                                                                                                            |
| `GOOGLE_PLACES_DAILY_CALL_LIMIT`           | `100`                 | Shared by the app and the warmer.                                                                                       |
| `GOOGLE_GEMINI_DAILY_CALL_LIMIT`           | `25`                  | Shared by the app and the warmer.                                                                                       |
| `OPENAI_DAILY_CALL_LIMIT`                  | `25`                  | Shared by the app and the warmer.                                                                                       |
| `AI_ON_DEMAND_DAILY_CALL_LIMIT`            | `5`                   | Separate, smaller envelope for visitor-triggered generation, so `/api/cities/insight` cannot drain the warmer's budget. |

Outside production the kill switches default to on and the limits are much looser, so local development works without ceremony.

### Site and operations

| Variable                           | Notes                                                                                                                        |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`             | Canonical URL used for sitemaps, canonicals and OG tags.                                                                     |
| `LOG_LEVEL`                        | `debug`, `info`, `warn`, `error`. Structured JSON output in production.                                                      |
| `HEALTH_CHECK_TOKEN`               | Send it as `Authorization: Bearer …` to get the detailed `/api/health` payload; without it the endpoint only returns `{ok}`. |
| `NEXT_PUBLIC_CONTACT_EMAIL`        | Appears in structured data.                                                                                                  |
| `NEXT_PUBLIC_BOOKING_AFFILIATE_ID` | Affiliate links render only when this is set (see `docs/adr-002-affiliate-links.md`).                                        |

## How the read path works

A request is served from cache, or it is served stale, or it renders a reduced page. It does not wait on a provider.

Cache tiers live in `src/lib/cache-config.ts`:

| Data         | Fresh      | Stale-while-revalidate              |
| ------------ | ---------- | ----------------------------------- |
| Places       | 30 days    | refreshed in the background after 7 |
| AI briefings | 365 days   | 30 days                             |
| Weather      | 60 minutes | 30 minutes                          |
| Metrics      | 60 minutes | 30 minutes                          |
| Trending     | 24 hours   | 12 hours                            |

When something does need a paid call, it passes four independent gates. Any one of them can stop it:

1. nginx rate limits and bot blocks at the edge (`deploy/nginx/bestcityspots.conf`)
2. the per-provider kill switch, which is off in production by default
3. an atomic daily claim against `provider_daily_usage` via the `claim_provider_use()` RPC — shared across restarts, replicas and the warmer, and **fail-closed**: if Supabase is unreachable in production, the claim is denied rather than assumed
4. quota caps and a billing kill set in Google Cloud, which is the only layer that still works if the app is completely broken

Layer 3 is the one that matters most, and it is deliberately in the database rather than in memory: an in-process counter reset on every container restart, which is how the original incident got expensive.

Fresh data is meant to arrive through `npm run warm-cache`, run nightly. The warmed set is the top 250 cities by population, which is also what gets listed in the sitemap (city guides render per request so live conditions stay current); a city outside it, with a cold cache, renders a reduced profile rather than a page full of empty sections.

## Repository layout

```
src/
  app/              routes, layouts, server actions, API handlers
  components/       UI by domain: ui (primitives), layout, search, city, discovery,
                    compare, saved, editorial, home, analytics, seo
  hooks/            useStoredValue (shared localStorage state), useSavedPlaces,
                    usePlaceNotes, useRecentCities
  platform/         data-access repositories and cache helpers
  lib/              service layer — providers, cost guard, search, ranking, validation
supabase/           Supabase CLI project: config, migrations, generated seed, pgTAP tests
scripts/            seeding (db/), admin, warmers, analytics, verification scripts
deploy/             nginx config, Ansible playbook, deployment runbook
docs/               ADRs, design tokens, CI/CD, security audit
```

Route handlers stay thin: parse, validate, delegate. Business logic, provider calls and cache orchestration belong in `src/lib`. `PROJECT.md` has a fuller map and `AGENTS.md` documents the architecture and security model.

## Scripts

| Command                           | What it does                                                                 |
| --------------------------------- | ---------------------------------------------------------------------------- |
| `npm run dev`                     | Dev server                                                                   |
| `npm run build` / `npm start`     | Production build and serve                                                   |
| `npm run verify`                  | Lint, format, types, migration policy, PGlite DB tests, verification scripts |
| `npm run lint` / `lint:fix`       | ESLint, including `eslint-plugin-security`                                   |
| `npm run format` / `format:check` | Prettier (pinned to an exact version on purpose)                             |
| `npm run type-check`              | `tsc --noEmit`                                                               |
| `npm run check:migrations`        | Migration policy: RLS + grants, no SECURITY DEFINER, no retired key names    |
| `npm run check:db`                | Migrations + seed + pgTAP on in-process Postgres (no Docker)                 |
| `npm run test:ci`                 | Verification scripts that need no network or credentials                     |
| `npm test`                        | The above plus `test:providers`, which makes live calls                      |

Operational scripts:

| Command                               | What it does                                                               |
| ------------------------------------- | -------------------------------------------------------------------------- |
| `npm run db:start` / `db:stop`        | Local Supabase stack (Docker); `db:reset` re-applies migrations + seed     |
| `npm run db:test` / `db:lint`         | pgTAP tests / schema lint against the local stack                          |
| `npm run db:push`                     | Apply migrations to the linked hosted project                              |
| `npm run db:seed`                     | Load GeoNames + World Bank reference data (`db:seed:sql` regenerates seed) |
| `npm run db:types`                    | Regenerate `src/lib/database.types.ts` from the local stack                |
| `npm run db:smoke`                    | End-to-end Data API checks against the configured project                  |
| `npm run admin -- add <email>`        | Invite an admin (`remove`, `list`)                                         |
| `npm run warm-cache`                  | Populates caches — the intended path for paid spend                        |
| `npm run warm-cache:dry-run`          | Shows what would be fetched, spends nothing                                |
| `npm run warm-top-cities`             | Warms the top N cities by population                                       |
| `npm run analytics` / `analytics:30d` | Traffic reports from the aggregate tables                                  |

## Tests and CI

There is no unit-test framework here. Instead there are executable verification scripts under `scripts/` — ranking, Zod validation, JSON-LD escaping, the cost guard, analytics input bounds, cache-warm prioritisation, plus the pure frontend logic (share-list tokens, the AI briefing stream parser, analytics batching, search and display helpers) — and they run in CI. If you add logic to those areas, add to them.

The database has its own tests: pgTAP files in `supabase/tests/database/` cover RLS and grants on every table and function, search ranking, the budget and counter RPCs, analytics merges and admin access. `npm run check:db` runs them on in-process Postgres (PGlite) with no Docker, and CI runs them again against the real Supabase images.

`npm run verify` is the same gate set CI runs, so a green local run predicts a green pipeline. CI itself is five parallel jobs (quality incl. the PGlite database checks, the Supabase stack — pgTAP, schema lint, generated-types type-check, Data API smoke test — verification scripts, production build, container build plus a boot smoke test) behind one `CI passed` roll-up. A separate weekly workflow fails on high or critical advisories in production dependencies. Deployment is a manual workflow — see `docs/ci-cd.md` for the jobs, the required secrets and the deliberate non-goals.

## Database changes

The workflow lives in `supabase/README.md`. In short: `npx supabase migration new <name>`, enable RLS and grant explicitly in the same file, no `SECURITY DEFINER`, add a pgTAP test, update `src/lib/database.types.ts`, run `npm run verify`. `npm run check:migrations` enforces the rules. Production migrations go through the manual **Database migrate** workflow (dry run, then apply).

## Deployment

The image is a multi-stage build producing Next's standalone output, run as a non-root user. Compose binds the origin to `127.0.0.1:3000` (nginx is the only thing exposed), sets memory and CPU limits, and passes provider keys at runtime — never as build args, because build args persist in image layers.

```bash
docker compose --env-file .env.production up -d --build
```

For a full host setup there is an Ansible playbook that installs Docker and nginx, hardens the box, deploys with a health-gated rollback, closes the origin port in the firewall and schedules the warmer:

```bash
cd deploy/ansible
ansible-playbook playbook.yml --ask-vault-pass \
  -e app_version=v1.0.0 -e confirm=bestcityspots-prod --check --diff
```

It refuses unpinned refs and accidental live-fetch in production unless you override explicitly. `deploy/README.md` is the runbook, including the Google Cloud quota and billing steps that cannot be automated from here.

## Security

- Writes are locked to `service_role` everywhere — RLS and explicit grants on every table, no `SECURITY DEFINER` functions, a Storage bucket with no write or list policies, and `requireServerClient()` in `src/lib/supabase.ts`, which throws instead of quietly falling back to the publishable client.
- Auth is admin-only: sign-up is disabled, admins are invited with `npm run admin`, and `/admin` reads analytics through RLS with the admin's own session — never the secret key.
- JSON-LD is embedded with `dangerouslySetInnerHTML`, but always through `serializeJsonLd()`, which escapes the `</script>` breakout sequence.
- API input, query parameters and provider/AI responses are validated with Zod before anything trusts them.
- Response headers (HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) are set in `next.config.ts`. CSP is still `Report-Only` and reports to `/api/csp-report`; enforcing it needs a nonce rollout that has not happened yet.
- Analytics are aggregate-only: no per-visitor rows, consent-gated geography, no profiling.

`docs/security-audit-2026-09-12.md` is a full source-code audit with the findings, the fixes and what is still open. If you find something, report it privately rather than in a public issue.

## Troubleshooting

**A city page renders a short "reduced profile".** Its cache is cold and live fetching is off, which is the production default. Warm it (`npm run warm-top-cities`) or, locally, set `GOOGLE_PLACES_LIVE_FETCH_ENABLED=true` and reload the page once.

**No places or photos anywhere.** Usually the key is missing, or the project has the legacy Places API enabled instead of Places API (New), or billing is not set up. `npm run test:providers` makes live calls and prints the real status code from each provider, which is normally enough to tell which.

**`[supabase] secret-key client is unavailable`.** `SUPABASE_SECRET_KEY` is not set. Writes fail loudly on purpose — the alternative is silently falling back to the publishable client, having RLS reject the write, and re-fetching from a paid API on every subsequent miss.

**`[env] … is no longer read`.** A leftover key name from the old backend (`*_ANON_KEY` / `*_SERVICE_ROLE_KEY`). Use the publishable/secret key names from `.env.example`.

**The AI briefing returns `rate_limit`.** A budget is exhausted. Check `provider_daily_usage` for today. Note there are two envelopes: the per-engine limit, and the smaller `AI_ON_DEMAND_DAILY_CALL_LIMIT` for generation triggered by visitors. Exhausting the second one is normal in production and means the warmer still has room.

**Search returns nothing.** `cities` is probably empty — run `npm run db:seed` (hosted) or `npm run db:reset` (local). The search vector is a generated column, so there is nothing to backfill.

**`/api/health` returns 503.** A dependency check failed. Send `Authorization: Bearer $HEALTH_CHECK_TOKEN` to see which one; without the token the endpoint deliberately reveals nothing.

**`npm run format:check` fails right after `npm install`.** It should not any more — Prettier is pinned to an exact version for this reason. If it does, someone bumped it; run `npm run format` and commit the result as its own change.

**`npm run check:migrations` fails on a migration you just wrote.** Read the message, it names the rule — usually a table without `enable row level security` or an explicit `GRANT`, or a function missing `set search_path = ''` / `revoke all … from public`.

## Contributing

`CONTRIBUTING.md` covers the workflow and conventions. The short version: run `npm run verify` before pushing, keep secrets out of the repo, validate new input with Zod, put new SQL in `supabase/migrations/`, and do not weaken the cost-guard layers — they exist because of a real bill.

## License

MIT, © 2026 Sagar Awale. See [LICENSE](LICENSE).

City data from [GeoNames](https://www.geonames.org) (CC BY 4.0). Country indicators from the [World Bank World Development Indicators](https://data.worldbank.org) (CC BY 4.0; homicide data via UNODC, physician density via WHO). Map tiles from [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors via Leaflet. Weather and air quality from OpenWeatherMap and Open-Meteo; places from Google Places; briefings from Gemini or OpenAI.

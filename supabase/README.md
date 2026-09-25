# Database (Supabase)

Everything the database needs is in this folder and is applied with the
Supabase CLI (a pinned devDependency — use `npx supabase …` or the `npm run
db:*` scripts). There is no other setup path: no SQL-editor pastes, no
hand-run scripts.

```
supabase/
├── config.toml            local stack + auth settings (sign-up off, magic links)
├── migrations/            the schema, in order (one concern per file)
├── seed.sql               GENERATED dev fixture: all countries + top 300 cities
├── templates/             auth email templates (magic link → /auth/confirm)
└── tests/database/        pgTAP tests (RLS, grants, search, RPCs, admin access)
```

## Schema at a glance

| Migration                     | What it creates                                                                                                                           |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `…120000_foundation`          | `private` schema, `pg_trgm`/`unaccent`/`fuzzystrmatch` in `extensions`, helpers, explicit-grant default privileges                        |
| `…120100_reference_data`      | `countries`, `cities` (GeoNames ids, unique slugs, generated search vector), `city_aliases`, `country_indicators` (World Bank)            |
| `…120200_search`              | `search_cities(query, result_limit)`: prefix + full-text + trigram + edit distance + aliases                                              |
| `…120300_caches`              | `city_places_cache` (by city id), `city_weather_cache`, `city_live_metrics`, `city_ai_insights`, `ai_trending_cache`, view `city_metrics` |
| `…120400_budget_and_counters` | `provider_daily_usage` + `claim_provider_use`, `place_saves_daily` + save RPCs, `cache_hit_stats` + `record_cache_event`                  |
| `…120500_analytics`           | six aggregate daily tables + `upsert_*` RPCs, view `daily_visitor_summary`, `get_cities_by_traffic`                                       |
| `…120600_admin_auth`          | `app_admins`, `private.is_admin()`, admin read policies on the ledgers                                                                    |
| `…120700_storage`             | public `place_images` bucket (1 MiB, `image/jpeg` only, no listing)                                                                       |

### Security model

- **RLS on every table, explicit `GRANT`s everywhere.** Reference data and
  caches: `anon`/`authenticated` may `SELECT`; only `service_role` writes.
  Ledgers (budget, saves, analytics, cache stats): `service_role` only, plus
  admin `SELECT` via RLS.
- **No `SECURITY DEFINER`.** Every RPC is `security invoker` with
  `search_path = ''`, `REVOKE ALL … FROM PUBLIC`, and `EXECUTE` granted only
  to the roles that call it (`search_cities` → everyone; everything else →
  `service_role`). A mistakenly granted EXECUTE still can't bypass RLS.
- **Views are `security_invoker`**, so the caller's RLS applies.
- **Keys**: the publishable key (`sb_publishable_…`) maps to `anon`; the
  secret key (`sb_secret_…`) maps to `service_role`. The legacy
  `anon`/`service_role` JWT keys are not used anywhere.
- **Auth**: admin-only. Sign-up is disabled; `npm run admin -- add <email>`
  creates the account and the `app_admins` row. Admins sign in with a magic
  link and read data with their own session.

`npm run check:migrations` enforces these rules statically;
`supabase/tests/database/00_security_posture.test.sql` checks them against a
live database.

## Local development

**With Docker/OrbStack (full stack):**

```bash
npm run db:start      # boots Postgres, Auth, Storage, API; applies migrations + seed.sql
                      # prints API URL, Publishable key, Secret key → copy into .env.local
npm run db:test       # pgTAP
npm run dev
```

Magic-link emails land in the local mail catcher (the URL is printed by
`db:start`). Make yourself an admin with `npm run admin -- add you@example.com`.

**Without Docker:** `npm run check:db` applies every migration and the seed
to in-process Postgres (PGlite) and runs the same pgTAP files. It's part of
`npm run verify`. For a running backend, point `.env.local` at a hosted
development project (see below).

## Hosted projects

One-time setup per project (see `docs/external-services-setup.md` for the
dashboard steps):

```bash
npx supabase login
npx supabase link --project-ref <ref>
npm run db:push               # apply migrations
npm run db:seed               # GeoNames + World Bank reference data
npm run admin -- add you@example.com
npm run db:smoke              # read-only end-to-end check
```

Production migrations run from GitHub Actions: **Database migrate** workflow
(`.github/workflows/db-migrate.yml`), dry run first, then apply.

## Changing the schema

1. `npx supabase migration new <short_description>`, then write the SQL.
   Follow the rules above; `npm run check:migrations` tells you what's missing.
2. Add or extend a pgTAP file in `tests/database/`.
3. Update `src/lib/database.types.ts`: `npm run db:types` with the local
   stack running, or edit by hand in the same format. CI type-checks the app
   against freshly generated types.
4. `npm run verify`, then `npm run db:reset && npm run db:test` if you have Docker.
5. Never edit a migration that has been applied anywhere. Write a new one.

## Reference data

`scripts/db/seed.ts` downloads GeoNames (`cities15000`, `countryInfo`,
`admin1CodesASCII`) into the gitignored `data/geonames/`, calls the World
Bank API, and upserts countries, cities, aliases and indicators. It is
idempotent; re-run it to refresh. `npm run db:seed:sql` regenerates
`seed.sql` (top 300 cities) for the local stack.

City slugs keep the production URL rule: `city-country`, then `-iso2`, then
`-id` on collision.

## History

This schema replaced a backend whose Supabase project was deleted on
2026-09-25. Nothing here depends on it: the loose `supabase/*.sql` files,
`setup_all_blank_project.sql`, `search_cities_elastic`, the Python applier
and the JWT-era key names were removed on purpose.

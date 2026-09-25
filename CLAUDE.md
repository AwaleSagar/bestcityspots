# Best City Spots — working notes for Claude

Next.js 16 (App Router, React 19, TypeScript strict) on a Supabase backend
(Postgres + Auth + Storage), managed entirely with the Supabase CLI.
`AGENTS.md` is the architecture reference; `supabase/README.md` covers the
database workflow; `.env.example` lists every environment variable.

## Commands

```bash
npm run dev              # app on http://localhost:3000
npm run verify           # lint, format, types, migration policy, PGlite DB tests, unit tests — run before finishing
npm run check:db         # migrations + seed + pgTAP on in-process Postgres (no Docker)
npm run db:start         # local Supabase stack (needs Docker/OrbStack); prints URL + keys
npm run db:reset         # re-apply migrations + supabase/seed.sql locally
npm run db:test          # pgTAP against the local stack
npm run db:types         # regenerate src/lib/database.types.ts from the local stack
npm run db:seed          # load GeoNames + World Bank data into the configured project
npm run db:smoke         # end-to-end Data API checks against the configured project
npm run admin -- add <email>   # invite an admin (secret key)
```

## Backend rules

- **Schema changes are migrations only**: `npx supabase migration new <name>`
  in `supabase/migrations/`. Never edit an applied migration and never apply
  SQL by hand in the dashboard. Update `src/lib/database.types.ts` and add
  pgTAP coverage in `supabase/tests/database/` in the same change.
- **Every table**: RLS enabled and explicit `GRANT`s in the same migration.
  New projects do not auto-expose tables to the Data API.
- **No `SECURITY DEFINER`.** Write RPCs are `security invoker`, pin
  `set search_path = ''`, revoke PUBLIC, and grant EXECUTE to `service_role`
  only. Views use `security_invoker = true`. `npm run check:migrations`
  enforces all of this.
- **Keys**: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (browser-safe, RLS applies)
  and `SUPABASE_SECRET_KEY` (server-only, bypasses RLS). Writes go through
  `requireServerClient()` in `src/lib/supabase.ts`. The admin UI uses the
  signed-in admin's session (`src/lib/supabase-admin.ts`), never the secret key.
- **Auth is admin-only**: sign-up is disabled; admins are added with
  `npm run admin`. The public site has no accounts. Saves and notes stay in
  localStorage.
- Validate every request payload and provider/AI response with Zod. Read
  paths degrade to `null`/`[]`/stale cache instead of throwing.

## Data rules

- Reference data comes only from authentic, openly licensed sources: GeoNames
  (cities, CC BY 4.0) and World Bank WDI (country indicators, CC BY 4.0).
  Don't hand-write or invent data. Keep attribution on /methodology and in the
  footer (`docs/adr-003-reference-data-sources.md`).
- World Bank figures are **country-level**. Label them that way wherever
  they're shown.
- `supabase/seed.sql` is generated (`npm run db:seed:sql`). Don't edit it by hand.

## Don't

- Reintroduce the retired key names (`*_ANON_KEY`, `*_SERVICE_ROLE_KEY`) or
  any reference to the deleted project.
- Put secrets in `NEXT_PUBLIC_*`, Docker build args, or committed files.
- Add knowledge-graph or other tooling rules to this file. The old graphify
  setup was removed on purpose.

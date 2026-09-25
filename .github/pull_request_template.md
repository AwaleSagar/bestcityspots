# What and why

<!-- What changes, and what problem it solves. Link an issue if there is one. -->

## How it was verified

<!-- `npm run verify` output, a manual check, a screenshot — whatever makes the
     reviewer confident. CI runs the same gates; say what CI cannot see. -->

- [ ] `npm run verify` passes locally

## Checklist

- [ ] No new `process.env` references — env goes through `src/lib/env.ts`
- [ ] No direct `fetch` to third parties — goes through `http.ts` / `providers/*`
- [ ] New inputs and AI/provider outputs validated with Zod
- [ ] Schema changes are a new `supabase/migrations/` file (`npx supabase migration new`)
      with RLS + explicit GRANTs, no `security definer`, a pgTAP test, and
      updated `src/lib/database.types.ts` (`npm run check:migrations` / `check:db` enforce this)
- [ ] No secrets committed; `SUPABASE_SECRET_KEY` unreachable from client code
- [ ] Cost-guard layers unchanged, or the change is called out explicitly below
- [ ] Docs updated when behavior, routes, env vars, or scripts change

## Deploy notes

<!-- Delete if none. Call out: migrations to apply first (Actions → Database migrate), new
     env vars the host needs, anything that must happen in a particular order.
     Deploys are manual — Actions → Deploy (see docs/ci-cd.md). -->

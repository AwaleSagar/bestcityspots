# Cache pre-warming strategy (photos + landmark metadata)

> Added 2026-07-06. Goal: users hit city pages whose places, photos, and
> landmark metadata are already in cache — production serves cache-only, so
> anything not pre-warmed renders without images until the next warm run.

## How cities are chosen (`src/lib/warm-priority.ts`)

The photo warmer (`scripts/warm-top-cities.ts`) builds its city list at run
time from three ranked sources, deduped to `--limit`:

1. **Demand — Supabase insights.** Cities ranked by `get_cities_by_traffic()` (`city_views_daily` views)
   over the last 30 days, queried live at warm time. What real visitors open
   most gets warmed first, and the ranking self-updates every night as
   traffic shifts.
2. **Predicted — researched popularity.** A curated set of 20 globally
   popular destinations (Euromonitor Top City Destinations 2025 arrivals via
   Wikipedia's "List of cities by international visitors"; attraction hints
   cross-checked against TripAdvisor Travelers' Choice and U.S. News famous
   landmarks; researched 2026-07-06). Covers demand the site _will_ get from
   search even before analytics show it.
3. **Reach — population fallback.** The previous behavior, filling the list
   to the limit so the warmer never underuses its budget.

`--population-only` restores the legacy ordering.

## Landmark/POI anchoring (zero extra spend)

For curated cities, the landmark warm query names the icons — e.g. Paris
warms with "Top landmarks and attractions in Paris including Eiffel Tower,
Louvre Museum, Notre-Dame Cathedral" — so the Places response, the cached
metadata, and the photos uploaded to Supabase Storage (with BlurHash
placeholders) anchor on the POIs users actually search. Same request count
as before; this changes relevance, not cost.

## Operations

- Nightly cron 1 (02:30): `warm-cache.ts --traffic --top-cities=250` — data
  layers (places/weather/insights), no photos. Unchanged.
- Nightly cron 2 (03:40, added): `warm-top-cities.ts --limit=60 --no-ai` —
  places + photo bytes for the priority list. Runs after the data warmer;
  both claim from the same durable `claim_provider_use` budget, so combined
  spend can never exceed the daily envelope. Deployed via the Ansible
  playbook (`deploy/ansible/playbook.yml`, tag `cron`), or add the crontab
  line manually on the VPS.
- Dry-run first: `npm run warm-top-cities:dry-run` prints the priority mix
  ("N analytics-demand + M curated-popular + population fallback") and the
  planned work with zero spend.
- Photo re-warm is idempotent: already-uploaded images are reused (the
  warmer checks Storage before fetching bytes), so the nightly photo run
  mostly costs only for newly prioritized cities.

## Verification

`npm run test:warm-priority` covers the merge order, dedupe, limit handling,
landmark-query construction, and dataset sanity. It is part of `npm test`.

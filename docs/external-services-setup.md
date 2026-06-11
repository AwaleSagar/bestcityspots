# External Services Setup & Production Deployment Reference

Fast, actionable reference for configuring every external integration and
bringing up the app on a fresh production machine. Companion docs:
`deploy/README.md` (cost-protection runbook), `deploy/nginx/bestcityspots.conf`.

---

## 1. Supabase

**Create project**

1. supabase.com → New project (region close to your VM). Note the project ref.
2. Copy from Settings → API: `Project URL`, `anon` key, `service_role` key.

**Schema setup — automated (recommended)**

- `pip install "psycopg[binary]"` then `python scripts/setup_supabase.py`
  — bootstraps a blank project end-to-end (extensions, base tables, all SQL
  below in correct order, RLS, city seed, verification). Idempotent; exits
  non-zero on the first failure. Needs `SUPABASE_DB_URL` (or
  `SUPABASE_DB_PASSWORD`) + `SUPABASE_SERVICE_ROLE_KEY` in env/`.env.local`.

**Schema setup — manual (SQL editor or `supabase db push`, in this order)**

1. Core: `supabase/security.sql`, `supabase/performance.sql`
2. Cache tables: `supabase/city_ai_insights.sql`, `supabase/city_metrics.sql`,
   `supabase/cache_optimization.sql`, `supabase/place_images_bucket.sql`
3. Search: `supabase/elastic_search.sql`, `supabase/20260412_places_search_filters.sql`
4. Analytics: `supabase/visitor_analytics.sql`, `supabase/analytics_functions.sql`
5. Hardening: `supabase/harden_security.sql`, then
   `supabase/fix_city_ai_insights_rls.sql` (this order — fix re-creates
   policies harden defines), then `supabase/20260311_places_cache_cost_optimization.sql`
6. Migrations: everything in `supabase/migrations/` by timestamp —
   **`202606111000_provider_budget_and_cache_idempotency.sql` is mandatory**
   (the production cost guard fails closed without it).

**Seed data**

- `npx tsx scripts/seed-cities.ts data/worldcities.csv`

**RLS policy invariants (verify, don't assume)**

- Cache tables (`city_places_cache`, `place_details_cache`, `city_ai_insights`,
  `city_weather_cache`, `city_metrics`): public `SELECT`, writes `service_role` only.
- `provider_daily_usage`: `service_role` only (read and write).
- Analytics tables: writes via RPCs with `service_role`; no anon writes.
- Quick check: `select tablename, policyname, roles from pg_policies where schemaname='public';`

**Connection**

- App connects via URL + keys only (no direct Postgres string needed):
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`. The service-role key is server-only — never in
  client code, never in Docker build args.

## 2. Google Places API

1. Dedicated GCP project → enable **Places API (New)** only.
2. Credentials → Create API key:
   - API restriction: Places API (New).
   - Application restriction: **IP addresses** → the VM's egress IP
     (server-side key; referrer restrictions are for browser keys — not used here).
3. Quotas: cap _requests/day_ at ~2× legitimate volume (default envelope:
   100 app + 300 warmer ⇒ cap ≈ 800/day).
4. Billing: budget with 50/90/100% alerts + Pub/Sub → Cloud Function that
   disables the service at 100% (alerts alone are too slow — see incident runbook).
5. Set `GOOGLE_PLACES_API_KEY` in `.env.production`. Keep
   `GOOGLE_PLACES_LIVE_FETCH_ENABLED=false` (warmer is the only spend path).

## 3. Gemini AI

1. Same dedicated GCP project (never a primary billing account).
2. Create key in Google AI Studio / Cloud console; restrict to the
   Generative Language API. Set project-level **and** account-level spend caps.
3. Model: **`gemini-3-flash-preview`** (set in `src/lib/providers/gemini.ts`) —
   Flash tier only; do not switch to Pro models without re-costing.
4. App limits: `GOOGLE_GEMINI_DAILY_CALL_LIMIT=25`,
   `WARM_CACHE_GEMINI_BUDGET=100`, `GOOGLE_GEMINI_LIVE_FETCH_ENABLED=false`.
5. Set `GOOGLE_GEMINI_API_KEY` in `.env.production`.

## 4. Weather & other APIs

- **OpenWeatherMap** (current weather + AQI): free key at openweathermap.org →
  `OPENWEATHERMAP_API_KEY`. Free tier 60 calls/min — fine; no billing risk.
- **Open-Meteo** (weather/AQI fallback + metrics): no key, no setup.
- All outbound HTTP goes through `src/lib/http.ts` (circuit breakers,
  timeouts, retries) — no per-service client config needed.

## 5. Environment file

Create `.env.production` next to `docker-compose.yml` (template: README §Environment):

- Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`
- Providers: `GOOGLE_PLACES_API_KEY`, `GOOGLE_GEMINI_API_KEY`, `OPENWEATHERMAP_API_KEY`
- Cost guard (keep these values): `GOOGLE_PLACES_LIVE_FETCH_ENABLED=false`,
  `GOOGLE_GEMINI_LIVE_FETCH_ENABLED=false`, `GOOGLE_PLACES_DAILY_CALL_LIMIT=100`,
  `GOOGLE_GEMINI_DAILY_CALL_LIMIT=25`
- Optional: `LOG_LEVEL=info`, `HEALTH_CHECK_TOKEN=<random>`, SEO vars

---

## 6. Pre-deployment checklist (new machine)

- [ ] Supabase schema + migrations applied (§1) and seeded; spot-check:
      `select count(*) from cities;` returns > 40k.
- [ ] `select * from get_provider_usage(current_date);` runs (proves the
      budget RPC exists).
- [ ] Both Google keys are **fresh**, restricted (IP + API), and quota-capped (§2–3).
- [ ] `.env.production` present; validate before building:
      `npx tsx -e "import('./src/lib/env').then(m=>console.log(m.serverEnv()))"`
      — no `[env]` warnings for required keys.
- [ ] Docker ≥ 24 + compose plugin installed; `docker compose config` renders
      without warnings.
- [ ] Confirm compose has `127.0.0.1:3000:3000` port binding and `mem_limit` —
      do not "fix" these to `0.0.0.0`.
- [ ] Host firewall: allow 80/443 only; deny 3000/tcp inbound.
- [ ] nginx installed; `deploy/nginx/bestcityspots.conf` + proxy snippet in
      place; TLS via certbot; `nginx -t` passes.
- [ ] DNS A/AAAA records point at the machine; `NEXT_PUBLIC_SITE_URL` matches.

**Bring-up**

```bash
docker compose build            # keys are NOT needed at build time (by design)
docker compose up -d
systemctl reload nginx
```

## 7. Post-deployment verification

- [ ] Container healthy: `docker compose ps` shows `running`; logs clean:
      `docker compose logs --tail 50 web` (no `[env]` or `[cost-guard]` errors).
- [ ] Origin sealed: `curl -m3 http://<server-ip>:3000/` from outside → connection refused.
- [ ] Site up via nginx: `curl -sI https://bestcityspots.com/` → `200`, HTML.
- [ ] Health: `curl -s https://bestcityspots.com/api/health` → `"ok"` status;
      with `Authorization: Bearer $HEALTH_CHECK_TOKEN` for detail.
- [ ] Supabase live: `curl -s https://bestcityspots.com/api/cities/sphere | head -c 200`
      returns city JSON (proves anon read path).
- [ ] City page SSR: `curl -s https://bestcityspots.com/cities/london | grep -c "<h1"` ≥ 1.
- [ ] Rate limit active: 40 rapid requests to `/cities/london` from one IP →
      mix of `200`/`429` (see `deploy/README.md` for the loop).
- [ ] Bot block active: `curl -A "GPTBot" -so /dev/null -w "%{http_code}" https://bestcityspots.com/` → `403`.
- [ ] Cost guard durable: `select * from get_provider_usage(current_date);` —
      rows appear only after a warmer run; SSR traffic must not move counters
      while live-fetch flags are `false`.
- [ ] Warmer dry run: `npm run warm-cache:dry-run` lists work without spend;
      then schedule the nightly cron (deploy/README.md §Cache warming).
- [ ] 404 path cheap: request `/cities/not-a-real-slug` twice; second response
      fast (negative cache) and no DB/provider noise in logs.

**Rollback:** `docker compose down && docker image ls` → run the previous tag;
nginx and Supabase are stateless w.r.t. the app version.

# External Services Setup & Production Deployment Reference

Fast, actionable reference for configuring every external integration and
bringing up the app on a fresh production machine. Companion docs:
`deploy/README.md` (cost-protection runbook), `deploy/nginx/bestcityspots.conf`.

---

## 1. Supabase

Everything schema-related is in `supabase/` and applied with the Supabase CLI
(pinned devDependency). Details: `supabase/README.md`.

**Create the project**

1. supabase.com → **New project**, in a region close to the VM. Keep the Data
   API enabled with the default `public` schema. If the dashboard offers
   **"Automatically expose new tables"**, leave it **off**: every migration
   grants access explicitly.
2. **Project Settings → API Keys → "Publishable and secret API keys"**: create
   (or copy) one publishable key (`sb_publishable_…`) and one secret key
   (`sb_secret_…`). The legacy `anon`/`service_role` JWT keys are not used,
   and you can disable them.
3. Note the **project ref** (Settings → General) and the **database
   password** (only needed by the CLI to push migrations).

**Auth (admin-only — do this before the first deploy)**

4. **Authentication → Sign In / Providers**: turn **off** "Allow new users to
   sign up", keep **Email** enabled, and disable every other provider.
5. **Authentication → URL Configuration**: Site URL = `https://bestcityspots.co`;
   Redirect URLs = `https://bestcityspots.co/auth/confirm`.
6. **Authentication → Emails → Magic Link**: paste the body of
   `supabase/templates/magic_link.html` (subject: "Your Best City Spots admin
   sign-in link"). The link must go to `{{ .SiteURL }}/auth/confirm?token_hash=…`.
7. **Custom SMTP** (Authentication → Emails → SMTP): recommended. Supabase's
   built-in sender is heavily rate-limited and meant for testing.

**Schema, data and first admin**

```bash
npx supabase login
npx supabase link --project-ref <ref>        # prompts for the DB password
npm run db:push                              # apply supabase/migrations/
# put NEXT_PUBLIC_SUPABASE_URL / _PUBLISHABLE_KEY / SUPABASE_SECRET_KEY in .env.local
npm run db:seed                              # GeoNames cities + World Bank indicators (~2 min)
npm run admin -- add you@example.com         # invite-only admin
npm run db:smoke                             # read-only end-to-end check
```

For later production schema changes, use the **Database migrate** GitHub
workflow (dry run first) instead of pushing from a laptop.

**Security invariants (tested by `npm run check:db` / `db:test`, verify on prod with `db:smoke`)**

- Reference data and caches: public `SELECT`; writes `service_role` only.
- Ledgers (`provider_daily_usage`, `place_saves_daily`, `cache_hit_stats`,
  analytics): `service_role` only, plus admin `SELECT` through RLS.
- No `SECURITY DEFINER` functions. Service RPCs are invoker functions
  executable only by `service_role`; `search_cities` is the only anon RPC.
- `place_images` bucket: public read by URL, 1 MiB `image/jpeg` only, no
  listing, uploads via the secret key only.

**Connection**

- The app connects with URL + keys only (no Postgres connection string):
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
  `SUPABASE_SECRET_KEY`. The secret key is server-only: never in client code,
  never a Docker build arg.
- `NEXT_PUBLIC_*` values are baked in at build time, so switching projects
  needs a rebuild.

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

Create `.env.production` next to `docker-compose.yml` (template: `.env.example`;
on Ansible-managed hosts it is rendered from the vault):

- Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
  `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_SITE_URL`
- Providers: `GOOGLE_PLACES_API_KEY`, `GOOGLE_GEMINI_API_KEY`, `OPENWEATHERMAP_API_KEY`
- Cost guard (keep these values): `GOOGLE_PLACES_LIVE_FETCH_ENABLED=false`,
  `GOOGLE_GEMINI_LIVE_FETCH_ENABLED=false`, `GOOGLE_PLACES_DAILY_CALL_LIMIT=100`,
  `GOOGLE_GEMINI_DAILY_CALL_LIMIT=25`
- Optional: `LOG_LEVEL=info`, `HEALTH_CHECK_TOKEN=<random>`, SEO vars

---

## 6. Pre-deployment checklist (new machine)

- [ ] Supabase migrations applied (§1, `npx supabase migration list` shows
      no pending) and seeded; `npm run db:smoke` passes against the project
      (≈34k cities, indicators loaded, bucket present, anon writes refused).
- [ ] At least one admin exists (`npm run admin -- list`) and Auth sign-up is off.
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
- [ ] Site up via nginx: `curl -sI https://bestcityspots.co/` → `200`, HTML.
- [ ] Health: `curl -s https://bestcityspots.co/api/health` → `"ok"` status;
      with `Authorization: Bearer $HEALTH_CHECK_TOKEN` for detail.
- [ ] Supabase live: `curl -s 'https://bestcityspots.co/api/cities/sphere?mode=population' | head -c 200`
      returns city JSON (proves the publishable-key read path).
- [ ] City page SSR: `curl -s https://bestcityspots.co/cities/london-united-kingdom | grep -c "<h1"` ≥ 1.
- [ ] Admin: magic-link sign-in at `/admin/login` works; `/admin` shows numbers.
- [ ] Rate limit active: 40 rapid requests to `/cities/london` from one IP →
      mix of `200`/`429` (see `deploy/README.md` for the loop).
- [ ] Bot block active: `curl -A "GPTBot" -so /dev/null -w "%{http_code}" https://bestcityspots.co/` → `403`.
- [ ] Cost guard durable: `/admin` → "Paid provider calls today" (or
      `select * from provider_daily_usage where day = current_date;`) shows
      rows only after a warmer run; SSR traffic must not move counters while
      live-fetch flags are `false`.
- [ ] Warmer dry run: `npm run warm-cache:dry-run` lists work without spend;
      then schedule the nightly cron (deploy/README.md §Cache warming).
- [ ] 404 path cheap: request `/cities/not-a-real-slug` twice; second response
      fast (negative cache) and no DB/provider noise in logs.

**Rollback:** `docker compose down && docker image ls` → run the previous tag;
nginx and Supabase are stateless w.r.t. the app version.

# Deployment & Cost-Protection Runbook

Companion to the incident remediation (crawler-driven API billing spike).
The defense is layered — **every layer must hold on its own**:

| Layer              | Mechanism                                                 | Where                                  |
| ------------------ | --------------------------------------------------------- | -------------------------------------- |
| 1. Edge            | nginx rate limits + bot blocks                            | `deploy/nginx/bestcityspots.conf`      |
| 2. App kill switch | `GOOGLE_*_LIVE_FETCH_ENABLED` (default **false** in prod) | compose / env                          |
| 3. Durable budget  | `claim_provider_use()` atomic daily counter, fail-closed  | Supabase + `src/lib/cost-guard.ts`     |
| 4. Platform caps   | GCP quota caps + key restrictions + budget kill           | Google Cloud Console (checklist below) |

Layers 1–3 live in this repo. Layer 4 is console-only — do it once, verify quarterly.

## One-time Google Cloud checklist (Layer 4 — cannot be automated from here)

- [ ] **Rotate both API keys** (old ones passed through Docker build args and
      must be treated as exposed). Update `.env.production`, redeploy, then
      **delete** the old keys.
- [ ] Places key → _API restrictions_: Places API (New) only. _Application
      restriction_: server IP allowlist (the VM's egress IP).
- [ ] Gemini key → dedicated GCP project (never a primary billing account);
      set project-level **and** account-level spend caps below Tier 1.
- [ ] **Quota caps**: APIs & Services → Quotas → cap _requests/day_ for Places
      and Gemini at ~2× legitimate daily volume. This is the backstop that
      works even if all application code fails.
- [ ] **Budget + programmatic kill**: Cloud Billing budget (~₹500/day
      equivalent) with 50/90/100% alerts, plus Pub/Sub notification → Cloud
      Function that disables the API service at 100%. Alert-only is too slow —
      that is how the incident bill accrued.

## nginx (Layer 1)

See `deploy/nginx/bestcityspots.conf`. After installing:

```bash
nginx -t && systemctl reload nginx
# verify: a burst of >30 requests/min from one IP to /cities/* returns 429
for i in $(seq 1 40); do curl -so /dev/null -w "%{http_code}\n" https://bestcityspots.com/cities/london; done | sort | uniq -c
```

Also confirm the origin is unreachable directly:

```bash
curl -m 3 http://<server-ip>:3000/ && echo "EXPOSED — fix firewall" || echo "ok: origin closed"
```

(`docker-compose.yml` binds `127.0.0.1:3000`; the host firewall should still
deny 3000/tcp inbound as defense in depth.)

## Daily budgets (Layer 3)

- Source of truth: `public.provider_daily_usage` (one row per provider/day),
  claimed atomically by `claim_provider_use()` — shared by the web app and
  `scripts/warm-cache.ts`, survives restarts, fails **closed** in production.
- Web app envelopes: `GOOGLE_PLACES_DAILY_CALL_LIMIT` (default 100),
  `GOOGLE_GEMINI_DAILY_CALL_LIMIT` (default 25).
- Warmer envelopes: `WARM_CACHE_PLACES_BUDGET` (default 300),
  `WARM_CACHE_GEMINI_BUDGET` (default 100).
- Inspect today's spend: `/admin` → "Paid provider calls today", or `select * from provider_daily_usage where day = current_date;`

## Cache warming (the only intended spend path)

Production SSR should run permanently cache-only
(`GOOGLE_*_LIVE_FETCH_ENABLED=false`). Fresh data enters via the warmer:

```bash
# nightly cron on the host (02:30, low-traffic window), e.g.:
# 30 2 * * * cd /opt/bestcityspots && npm run warm-cache -- --traffic --top-cities=250 >> /var/log/bcs-warm.log 2>&1
npm run warm-cache:dry-run   # always available for a no-spend preview
```

The warmer claims from the same durable budget, so a misconfigured cron
cannot exceed the daily envelope either.

## Database before deploy

The durable budget (`provider_daily_usage` + `claim_provider_use()`) comes
from `supabase/migrations/20260925120400_budget_and_counters.sql`. Apply all
pending migrations with the **Database migrate** workflow (dry run, then
apply) **before** deploying code that needs them; without the budget table the
production cost guard fails closed (cache-only — safe, but no live refresh).
A fresh project also needs `npm run db:seed` and one admin
(`npm run admin -- add …`) — see `docs/external-services-setup.md` §1.

## Weekly checks

- `/admin` → "Paid provider calls today" (or
  `select * from provider_daily_usage where day = current_date;`) vs. expectations.
- nginx: `grep ' 429 ' /var/log/nginx/access.log | wc -l` — sustained spikes
  mean someone is probing; consider tightening zones or fronting with
  Cloudflare (bot fight mode + origin concealment).
- Cache hit rate from `cache_hit_stats` — a falling hit rate on `/cities/*`
  is the early signature of this incident class.

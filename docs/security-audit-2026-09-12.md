# Security Audit — Best City Spots (source-code review)

**Date:** 2026-09-12
**Scope:** Source code only — `src/`, `supabase/`, `deploy/`, `scripts/`, build and CI config.
No live testing, no requests against production, no Supabase project inspection.
Every finding below is derived from code in this repository at commit `133e6a8`.

**Method:** manual review of the full request surface (5 route handlers + server actions),
the service layer (`src/lib`), the data-access layer (`src/platform`), all SQL (RLS
policies, RPC functions, grants), deployment config (nginx/ansible/Docker), CI, and a
dependency advisory check (`npm audit`).

**Result:** 1 high, 4 medium, 4 low. No SQL injection, no XSS sink, no committed secret,
and no missing-authentication issue was found in application code — the weaknesses are
concentrated in the **database function grants** and in **abuse/DoS resistance of
unauthenticated endpoints**.

## Remediation status

**All nine findings are fixed** in the same branch as this report. Each finding
section below is unchanged (it documents the vulnerability as found); this table
says where the fix landed.

| ID  | Status | Fix                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H-1 | Fixed  | `supabase/migrations/202609121200_harden_function_grants_and_storage.sql` revokes the default `PUBLIC` EXECUTE from all six analytics RPCs and re-grants `service_role` only. Baseline `supabase/analytics_functions.sql` and `supabase/setup_all_blank_project.sql` updated so fresh projects are not born vulnerable. **Requires applying the migration to the live database — the code change alone does not close it.** |
| M-1 | Fixed  | Same migration + `supabase/place_images_bucket.sql`: the `place_images` INSERT policy is now `service_role` only. Also requires applying.                                                                                                                                                                                                                                                                                   |
| M-2 | Fixed  | New on-demand budget: `tryClaimOnDemandAiUse()` (`src/lib/cost-guard.ts`), claimed by `/api/cities/insight` before any generation, configured by `AI_ON_DEMAND_DAILY_CALL_LIMIT` (prod default 5, wired through `docker-compose.yml` and the ansible env template). Visitor-triggered generation can no longer drain the engine budget or starve the warmer.                                                                |
| M-3 | Fixed  | `deploy/ansible/templates/bestcityspots-proxy.conf.j2` (and the reference nginx config) clear all `X-Vercel-IP-*` headers; `sanitizeCountryCode()` / `sanitizeGeoCity()` (`src/lib/analytics.ts`) shape-check and bound whatever still arrives, and the city is dropped entirely without a valid country code.                                                                                                              |
| M-4 | Fixed  | `AnalyticsEventSchema` bounds every string and number; referral `source_name` must be a valid, lowercased, ≤128-char hostname or it collapses into one `unknown` bucket; per-request city-view fan-out capped at 10 distinct ids.                                                                                                                                                                                           |
| L-1 | Fixed  | `next` `^16.2.9` → `^16.3.5`, `sharp` `^0.34.5` → `^0.35.4`, `eslint-config-next` to match, plus `npm audit fix` for transitives. `npm audit` now reports **0 vulnerabilities** (was 14 total / 5 production).                                                                                                                                                                                                              |
| L-2 | Fixed  | `set search_path = public` pinned on all six `SECURITY DEFINER` analytics functions (migration + baseline).                                                                                                                                                                                                                                                                                                                 |
| L-3 | Fixed  | New `POST /api/csp-report` sink (logs only, no persistence, 16 KB cap); `next.config.ts` adds `report-uri` + `report-to` and a `Reporting-Endpoints` header, and drops `'unsafe-eval'` from `script-src` outside development. The policy stays Report-Only — enforcing it still needs the nonce rollout described below.                                                                                                    |
| L-4 | Fixed  | `search_cities_elastic` truncates the normalized query to 100 characters (migration). Also requires applying.                                                                                                                                                                                                                                                                                                               |

Two cosmetic notes from the end of this report are fixed too: `/api/analytics` and
`/api/places/search` no longer echo Zod issues in their 400 bodies.

### Verification

`npm run lint`, `npm run type-check` and `npm run build` all pass on the upgraded
dependencies. The verification scripts pass, including a new
`npm run test:analytics-hardening` (32 assertions over the M-3/M-4 helpers).
`npm run test:providers` fails in the review sandbox only because outbound
Open-Meteo hosts are not on the sandbox's network allowlist — unrelated to these
changes.

### Residual risk / follow-ups

- **The three SQL fixes are inert until the migration is applied** to the
  Supabase project. Until then H-1, M-1 and L-4 remain open in production.
- **Supabase sign-ups**: M-1's fix removes the `authenticated` grant, but the
  product has no user accounts at all. Disabling sign-ups in the Supabase
  dashboard removes the `authenticated` role as an attack surface entirely.
- **CSP is still Report-Only.** Collecting violations is now possible; moving to
  an enforced, nonce-based `script-src` remains its own piece of work.
- **M-4 bounds row growth but does not eliminate it**: a determined attacker can
  still mint one `traffic_sources_daily` row per distinct valid hostname, through
  nginx's rate limit. If growth is ever observed, bucket rare hostnames (e.g.
  keep the top-N per day, fold the rest into `other`).
- **Next.js view transitions**: the security upgrade to Next 16.3.5 required
  removing `experimental.viewTransition` from `next.config.ts` — the flag no
  longer exists upstream. The `::view-transition-*` CSS is untouched; if the
  city→city hero morph needs explicit re-enabling, it is now done with React's
  `<ViewTransition>` component. Worth a visual check on a city→city navigation.

---

| ID          | Severity | Title                                                                                |
| ----------- | -------- | ------------------------------------------------------------------------------------ |
| [H-1](#h-1) | High     | Analytics `SECURITY DEFINER` RPCs are executable by the public anon key (RLS bypass) |
| [M-1](#m-1) | Medium   | `place_images` storage bucket accepts uploads from any `authenticated` user          |
| [M-2](#m-2) | Medium   | Unauthenticated requests can drain the whole daily AI budget (`/api/cities/insight`) |
| [M-3](#m-3) | Medium   | Spoofable `x-vercel-ip-*` headers trusted as visitor geography                       |
| [M-4](#m-4) | Medium   | Unbounded analytics strings → unlimited distinct rows + write amplification          |
| [L-1](#l-1) | Low      | Known CVEs in direct production dependencies (`next`, `sharp`)                       |
| [L-2](#l-2) | Low      | `SECURITY DEFINER` functions without `set search_path`                               |
| [L-3](#l-3) | Low      | CSP is Report-Only with no reporting endpoint — collects nothing, enforces nothing   |
| [L-4](#l-4) | Low      | `search_cities_elastic` reachable by anon with an uncapped query string              |

---

## Threat model used

The app has **no end-user authentication**. Two trust boundaries matter:

1. **The anon Supabase key is public by design.** `useCitySearchController.ts:77`,
   `CommandPalette.tsx:142` and `ComparePicker.tsx:38` call `searchCities()` from the
   browser, so `NEXT_PUBLIC_SUPABASE_ANON_KEY` and the project URL are in every bundle.
   Anything the `anon` role can do at the PostgREST layer, the internet can do —
   **bypassing nginx rate limits, the Next.js app, and every application-layer check.**
   This is the correct model _provided_ RLS and function grants are airtight.
2. **The Next.js origin** is fronted by nginx with per-IP rate limits
   (`deploy/nginx/bestcityspots.conf`), which slows but does not stop a distributed
   attacker.

Findings are ranked by what an unauthenticated internet attacker can actually achieve.

---

<a id="h-1"></a>

## H-1 (High) — Analytics `SECURITY DEFINER` RPCs are executable by the public anon key

**Files:** `supabase/analytics_functions.sql:1-215` (grants at `:210-215`),
mirrored in `supabase/setup_all_blank_project.sql:863-1071`

### Issue

The six analytics upsert functions are declared `SECURITY DEFINER`:

```sql
create or replace function public.upsert_daily_visitor_stats(...)
returns void language plpgsql
security definer            -- runs as the function OWNER, bypassing RLS
as $$ ... $$;
```

and are then granted with:

```sql
grant execute on function public.upsert_daily_visitor_stats to service_role;
-- ...five more, all the same shape
```

**PostgreSQL grants `EXECUTE` on every newly created function to `PUBLIC` by default.**
Granting to `service_role` adds a privilege; it does not remove the default one. There is
no `revoke ... from public` anywhere in `analytics_functions.sql`,
`visitor_analytics.sql`, or `setup_all_blank_project.sql` for these six functions.

Because they live in the `public` schema, PostgREST exposes them at
`/rest/v1/rpc/<name>`, and `anon` inherits the `PUBLIC` grant. Because they are
`SECURITY DEFINER`, they execute as the owner and **the `service_role`-only INSERT/UPDATE
policies on the analytics tables do not apply** (`setup_all_blank_project.sql:788-835`).

The project already knows the correct pattern — every function added later uses it:

```sql
revoke all on function public.claim_provider_use(text, date, integer) from public;
grant execute on function public.claim_provider_use(text, date, integer) to service_role;
```

(`supabase/migrations/202606111000_provider_budget_and_cache_idempotency.sql:69-70`;
same for `record_place_save` / `get_place_save_totals` in `202606120900`.)
The six analytics functions were simply never brought in line.

### Proof of concept (not executed — do not run against production)

```bash
curl -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/rpc/upsert_city_views" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"p_date":"2026-09-12","p_city_id":1}'
```

Repeat with `upsert_daily_visitor_stats`, `upsert_traffic_source`, `upsert_device_stats`,
`upsert_geo_stats`, `upsert_user_action`. Both key and URL are readable in the client
bundle.

### Impact

- **Direct RLS bypass.** The documented posture ("all writes are hard-locked to
  `service_role`", `AGENTS.md` → Security Model) does not hold for six write paths.
- **Attacker-controlled product surface.** `city_views_daily` feeds
  `queryMostViewedCities()` → `fetchLivingIndexCities()` and `fetchTrendingCityIds()`
  (`src/app/actions.ts:55-137`), which render the homepage **Living Index** and the
  "trending with readers" chips on hub pages. Inflating one city's counter promotes that
  city onto the front door. The 24 h `unstable_cache` delays but does not prevent it.
- **Business-data corruption.** Every visitor, traffic-source, device, geo and action
  metric can be written to arbitrary values by anyone, silently. Analytics reporting
  (`scripts/analytics-report.ts`) becomes untrustworthy with no audit trail.
- **Storage growth.** `upsert_traffic_source` takes free-text `p_source_type` /
  `p_source_name`, which are part of the unique key — unlimited distinct rows.

### Remediation

Add a migration (and fix the baseline file so fresh projects are not born vulnerable):

```sql
-- Default PUBLIC EXECUTE must be revoked explicitly; granting to service_role
-- does not remove it. Also pin search_path (see L-2).
do $$
declare fn text;
begin
  foreach fn in array array[
    'upsert_daily_visitor_stats(date,integer,integer,integer,integer,integer,integer,integer)',
    'upsert_traffic_source(date,text,text,integer,integer)',
    'upsert_device_stats(date,text,text,text)',
    'upsert_geo_stats(date,text,text,text)',
    'upsert_city_views(date,integer)',
    'upsert_user_action(date,text)'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', fn);
    execute format('grant execute on function public.%s to service_role', fn);
    execute format('alter function public.%s set search_path = public', fn);
  end loop;
end $$;
```

Then audit the whole surface once:

```sql
select p.proname, p.prosecdef, p.proconfig, array_agg(a.privilege_type || ':' || a.grantee)
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
left join information_schema.role_routine_grants a on a.routine_name = p.proname
where n.nspname = 'public'
group by 1,2,3;
```

Nothing in the app breaks: all six are called only through
`src/platform/data-access/analytics-repository.ts`, which uses the service-role client.

---

<a id="m-1"></a>

## M-1 (Medium) — `place_images` bucket accepts uploads from any `authenticated` user

**Files:** `supabase/place_images_bucket.sql:16-19`,
`supabase/setup_all_blank_project.sql:333-337`

```sql
create policy "place_images_upload"
on storage.objects for insert
to authenticated, service_role          -- ← `authenticated` should not be here
with check (bucket_id = 'place_images');
```

The bucket is public-read and holds cached Google Places photos. Only
`src/lib/places.ts:594-600` writes to it, and it uses the service-role client
(`getPlacesWriteClient()`), so `authenticated` is unused by the application.

**Impact.** If Supabase Auth sign-ups are enabled on the project (the default), anyone can
self-register with the public anon key, obtain an `authenticated` JWT, and write arbitrary
objects — arbitrary size, arbitrary `Content-Type` — into a publicly readable bucket on
the project's own domain. That yields free file hosting under your Supabase host, storage
cost inflation, and a credible phishing/abuse-report vector (content served from the same
domain your product's images come from, which `next.config.ts:22-36` explicitly trusts as
an image source). It also contradicts the stated "all writes are `service_role`" model.
There is no matching UPDATE policy, so existing objects cannot be overwritten — the issue
is new-object creation.

**Fix:**

```sql
drop policy if exists "place_images_upload" on storage.objects;
create policy "place_images_upload"
on storage.objects for insert
to service_role
with check (bucket_id = 'place_images');
```

Also confirm no `update`/`delete` policy grants `authenticated`, and consider disabling
sign-ups entirely in the Supabase dashboard — the product has no user accounts, so an
`authenticated` role should not be obtainable at all.

---

<a id="m-2"></a>

## M-2 (Medium) — Unauthenticated requests can drain the entire daily AI budget

**Files:** `src/app/api/cities/insight/route.ts:38-97`, `src/lib/cost-guard.ts:50-62`

`GET /api/cities/insight?cityId=N` is public, unauthenticated, and:

1. rejects nothing but a malformed `cityId` and a non-existent city;
2. returns cached content only when the row is **fresh** (`:57-72`);
3. otherwise calls `generateTextStream()`, which claims **one unit of the daily paid-AI
   budget** before streaming (`src/lib/providers/gemini.ts:86-88`).

The production default is `GOOGLE_GEMINI_DAILY_CALL_LIMIT = 25`
(`cost-guard.ts:53`, `deploy/ansible/group_vars/all.yml:20`). So **25 requests naming 25
different cities with cold or expired insight rows exhaust the day's entire AI budget**,
after which every legitimate visitor and the nightly warmer get `rate_limit` for the rest
of the day. The city list is public (`/sitemap.xml`, `/api/cities/sphere`), so picking
cold cities is trivial.

The cost guard is doing its job — spend stays capped, which is why this is Medium and not
High. The gap is that **an attacker, not the product, decides how the capped budget is
spent**: a cheap, low-noise availability attack on the site's headline feature. nginx
allows 30 req/min per IP to `/api/` — an order of magnitude more than needed, and a
handful of IPs bypasses the per-IP zone entirely.

The same shape exists for Places on SSR city pages (`ExperiencesWrapper` passes
`allowProviderFetch: true`, `src/app/cities/[slug]/page.tsx:248`), but only when
`GOOGLE_PLACES_LIVE_FETCH_ENABLED=true`, which is `false` in production defaults.

**Fix options** (any one substantially closes it):

- Serve the insight endpoint **cache-only** and let `scripts/warm-cache.ts` own all
  generation — matching the Places posture, which is already cache-only in production.
- Allow on-demand generation only for cities in the warmed set (`isCityWarm`, already
  implemented and used on the same page).
- Give on-demand generation its own small sub-budget (e.g. 5/day) so a drain cannot starve
  the warmer, which is the path that produces value for every future visitor.
- At minimum, tighten the `/api/cities/insight` nginx zone well below the generic
  `/api/` rate.

---

<a id="m-3"></a>

## M-3 (Medium) — Spoofable `x-vercel-ip-*` headers trusted as visitor geography

**Files:** `src/app/api/analytics/route.ts:76-83`,
`deploy/ansible/templates/bestcityspots-proxy.conf.j2`, `deploy/nginx/bestcityspots.conf`

```ts
const countryCode = request.headers.get("x-vercel-ip-country") || null;
const metadata = {
  ...countryCode,
  countryName: countryCode,
  city: request.headers.get("x-vercel-ip-city") || null,
};
```

These headers are only trustworthy when the app runs **behind Vercel's edge**, which
overwrites them. This deployment is nginx → Node on a self-hosted host, and the proxy
snippet sets only `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto` — **all other
client headers are forwarded verbatim.** Any client can therefore send
`X-Vercel-IP-Country: ZZ` / `X-Vercel-IP-City: <anything>` and have it written to
`geo_stats_daily` (`analytics.ts:320-329`), unvalidated and length-unbounded.

The consent gate (`hasGeoConsent`) is itself part of the client-controlled payload, so it
adds no protection here.

**Impact.** Geo analytics are attacker-writable (worsened by H-1, which lets an attacker
skip the header route entirely); arbitrary strings land in a table the privacy model
(`/methodology`, `AGENTS.md`) claims holds only consent-based, aggregate geography.

**Fix:**

```nginx
# in bestcityspots-proxy.conf.j2 — never let a client forge edge geo headers
proxy_set_header X-Vercel-IP-Country "";
proxy_set_header X-Vercel-IP-City "";
```

and validate server-side regardless of origin: `countryCode` against `/^[A-Z]{2}$/`,
`city` trimmed to a sane cap (e.g. 80 chars) or dropped. If geography should keep working
off-Vercel, derive it from a GeoIP module at the proxy into a header you set yourself.

---

<a id="m-4"></a>

## M-4 (Medium) — Unbounded analytics strings → unlimited rows and write amplification

**Files:** `src/lib/analytics.ts:43-59`, `:102-141`, `:293-343`,
`src/app/api/analytics/route.ts:44-91`

```ts
export const AnalyticsEventSchema = z.object({
  type: z.enum(["pageview", "action", "session_end"]),
  sessionId: z.string().min(1),      // no .max()
  path: z.string().optional(),       // no .max()
  referrer: z.string().optional(),   // no .max()
  sessionDuration: z.number().optional(),  // unbounded, negatives allowed
  pageCount: z.number().optional(),        // unbounded, negatives allowed
  ...
});
```

Two consequences:

1. **Unlimited distinct rows.** An unmatched `referrer` falls through to
   `new URL(referrer).hostname` (`analytics.ts:135-140`), which becomes
   `traffic_sources_daily.source_name` — part of that table's unique key. A loop over
   `https://<random>.example/` mints a new row per request, with a 64 KB payload carrying
   50 events per request. Unbounded table growth, no cleanup path in the repo.
2. **Write amplification.** One unauthenticated request fans out to up to ~61 database
   RPCs (3 fixed + geo + up to 50 distinct `cityId`s + up to 11 distinct actions,
   `analytics.ts:314-341`), executed in `after()` so the HTTP response returns
   immediately and gives the caller no backpressure. At the nginx budget of 30 req/min/IP
   that is ~1,800 DB round-trips per minute per IP.

Unbounded `sessionDuration` / `pageCount` also skew `avg_session_duration_sec` and
`bounce_rate_pct` arbitrarily (they are weighted averages in
`analytics_functions.sql:44-64`).

**Fix:** add caps and sanity ranges in the schema — `sessionId: z.string().min(1).max(64)`,
`path: z.string().max(512)`, `referrer: z.string().max(2048)`,
`sessionDuration: z.number().int().min(0).max(86_400)`,
`pageCount: z.number().int().min(0).max(1_000)` — restrict `source_name` to the known
allowlist plus a single `"other"` bucket (or cap hostname length and distinct rows/day),
and cap the number of distinct `cityId`s processed per batch.

---

<a id="l-1"></a>

## L-1 (Low) — Known CVEs in direct production dependencies

`npm audit --omit=dev` reports 5 production vulnerabilities (1 critical, 3 high,
1 moderate). The two that are **direct** dependencies:

| Package | Installed | Advisories                                                                                                                                                                                              |
| ------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `next`  | `^16.2.9` | **Critical** — middleware/proxy bypass in App Router (Turbopack, single locale); SSRF in Server Actions on custom servers; DoS in App Router Server Actions. Range affected: `9.3.4-canary.0 – 16.3.2`. |
| `sharp` | `^0.34.5` | **High** — inherited libvips CVE-2026-33327/33328/35590/35591 and libheif GHSA-g89c-p67h-r497 / GHSA-2jg2-4ch7-h545. Fixed in `0.35.4`.                                                                 |

Transitives: `postcss` (high), `nanoid` (high), `baseline-browser-mapping` (moderate).

`sharp` is worth calling out beyond the version bump: `src/lib/places.ts:458-480`
(`generateBlurhash`) decodes **remotely fetched image bytes** through libvips on the
server. The bytes come from Google's Places photo endpoint, so this is not
attacker-controlled today — but it is exactly the code path those CVEs describe, and the
same function also re-decodes bytes pulled back from the public storage bucket
(`:564-575`), which M-1 makes writable by any `authenticated` user.

**Fix:** bump `next` past `16.3.2` and `sharp` to `0.35.4` (major, needs a build check),
run `npm audit fix` for the transitives, and add a scheduled `npm audit --omit=dev` step
to `.github/workflows/ci.yml` so this is caught continuously.

---

<a id="l-2"></a>

## L-2 (Low) — `SECURITY DEFINER` functions without `set search_path`

**Files:** `supabase/analytics_functions.sql` (all six functions),
`supabase/migrations/202607071200_fix_daily_visitor_stats_bounce_duration_weighting.sql:35`

These run as the owner but resolve unqualified names through the caller's `search_path`.
The later functions in the repo all pin it (`set search_path = public` in
`202606111000`, `202606120900`); the analytics ones do not. It is the standard hardening
Supabase's own linter flags as `function_search_path_mutable`, and it is defence in depth
against any future role that can create objects in a schema earlier on the path.

Roll into the H-1 migration (`alter function ... set search_path = public`).

---

<a id="l-3"></a>

## L-3 (Low) — CSP is Report-Only, has no reporting endpoint, and would be weak enforced

**File:** `next.config.ts:76-97`

The header is `Content-Security-Policy-Report-Only`, and the comment notes `report-uri` is
deliberately omitted until an endpoint exists. Net effect today: the policy **blocks
nothing and reports nothing** — it is inert bytes on every response. The policy also
carries `script-src 'unsafe-inline' 'unsafe-eval'`, so even once enforced it would not stop
script injection.

This is documented as intentional and there is no known XSS sink today (JSON-LD is
correctly escaped — see "Verified sound" below), so it is Low. But the app has no XSS
backstop at all, which is worth knowing when weighing the other findings.

**Fix (incremental):** add `Reporting-Endpoints` + `report-to` so the Report-Only header
starts earning its keep; then move Next.js to a nonce-based `script-src` via middleware
and drop `unsafe-eval` in production before promoting to enforced.

---

<a id="l-4"></a>

## L-4 (Low) — `search_cities_elastic` is anon-executable with an uncapped query string

**File:** `supabase/elastic_search.sql:97-229` (grant at `:226`)

```sql
GRANT EXECUTE ON FUNCTION public.search_cities_elastic(text, int) TO anon, authenticated;
```

This grant is intentional — the browser calls it directly (`src/lib/cities.ts:147`). The
function is correctly parameterized (no injection) and clamps `result_limit` to 50. But
`query` has no length or complexity bound, and each call runs a GIN full-text scan plus
**three trigram similarity computations per row** over `cities` (tiers 2 and 3).

Because the call goes browser → PostgREST directly, it is not behind the nginx `/api/`
rate limit. A loop of long, high-entropy queries is a cheap way to load the database with
nothing in front of it.

**Fix:** truncate inside the function (`clean_query := left(clean_query, 100);` right after
the existing `lower(trim(...))`) and return early on queries below ~2 characters; consider
`statement_timeout` on the `anon` role and Supabase's built-in API rate limits.

---

## Verified sound (reviewed, no finding)

Recorded so future reviews do not re-tread the same ground:

- **No SQL injection.** Every Supabase call uses the query builder or parameterized RPCs.
  The only dynamic SQL is in a maintenance `do $$` block over a hard-coded table array
  (`202606111000`), and it uses `format(... %I ...)`.
- **No XSS sink.** All 26 `dangerouslySetInnerHTML` sites go through `serializeJsonLd()`
  (`src/lib/json-ld.ts`), which escapes `&`, `<`, `>`, U+2028/U+2029 — correct for
  `</script>` breakout. No `eval`, `new Function`, or `child_process` in application code
  (one `spawn` in the offline `scripts/design-scrape` tool). External links carry
  `rel="noopener noreferrer"`, affiliate links add `sponsored nofollow`.
- **Share tokens are safe.** `decodeSharedList()` (`src/app/cities/[slug]/share-list.ts`)
  bounds token length, regex-validates every id before using it as an object key, caps the
  list at 50, and — importantly — resolves ids only against data already rendered on the
  page, so a crafted link cannot inject content.
- **Write paths are service-role gated.** `requireServerClient()` throws rather than
  degrading to anon (`src/lib/supabase.ts:74-82`); insight/weather/metrics repositories
  use it; `supabaseServer` resolves to `null` in client bundles.
- **Table RLS is correct** for `cities`, `city_metrics`, `city_ai_insights`,
  `city_places_cache`, `place_details_cache`, `city_weather_cache`, `cache_hit_stats`,
  `place_saves_daily`, `provider_daily_usage`, `city_search_aliases` and the six analytics
  tables: public/anon SELECT where appropriate, writes restricted to `service_role`. The
  `city_ai_insights` stored-content-injection issue (C1) is properly fixed and documented
  in `202606281400`.
- **Cost guard is sound.** Atomic claim via `claim_provider_use`, durable across restarts,
  **fails closed in production** when Supabase is unreachable (`cost-guard.ts:135-158`);
  both AI engines claim from their own budget so provider fallback cannot bypass spend
  control.
- **Input validation is consistent.** Every route handler Zod-validates before use; both
  POST endpoints enforce byte caps by streaming the body rather than buffering it first.
- **Secrets hygiene.** No secrets committed (`AIza…`/`eyJ…`/`sk-…` scans clean); CI uses
  dummy values and is `pull_request`-triggered, not `pull_request_target`; the Dockerfile
  deliberately keeps paid-provider keys out of build args/layers and runs as a non-root
  user; the ansible env template is 0600 and vault-sourced.
- **`/api/health`** returns only `{ok}` unless a `Bearer HEALTH_CHECK_TOKEN` is presented,
  and does not cache 503s.

Two cosmetic notes not counted as findings: `/api/places/search` and `/api/analytics`
return `zod` `error.issues` in 400 bodies, which leaks internal field names and schema
shape (`places/search/route.ts:33-37`, `analytics/route.ts:69-74`); and the `sphere`
ETag uses SHA-1, which is correctly documented as a non-security fingerprint.

---

## Suggested order of work

1. **H-1** — one migration, zero application changes, closes an unauthenticated RLS bypass.
2. **M-1** — one-line policy change.
3. **M-4** — schema caps in `src/lib/analytics.ts`; small, self-contained.
4. **M-3** — two `proxy_set_header` lines plus server-side validation.
5. **M-2** — needs a product decision (cache-only vs. sub-budget vs. warmed-set gate).
6. **L-1** — dependency bumps behind a build/verify pass.
7. **L-2 / L-4** — fold into the SQL migration from step 1.
8. **L-3** — CSP reporting first, nonce rollout as its own piece of work.

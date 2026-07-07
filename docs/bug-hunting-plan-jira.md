# Bug Discovery Plan & Backlog (JIRA Format)

This plan establishes a systematic process to identify, categorize, and remediate technical and visual bugs in the repository. Based on our audits, we have populated a JIRA-ready backlog covering Backend Cost Hardening, Visual Palette Deviations, and Data Idempotency issues.

---

## Part 1: Verification & Discovery Strategy

To ensure bugs are continuously isolated early, developers and CI environments should run of the following automated routines:
1. **Automated Static & Type Safety Checks**: Run `npm run lint` and `npm run type-check` before any commit to prevent standard syntax bugs, unhandled exceptions, or security warnings from arriving into production. 
2. **Local Schema & RLS Auditing**: Execute [scripts/test-supabase-backend.ts](scripts/test-supabase-backend.ts) under `npm run test:supabase` to verify active security policies on tables.
3. **Endpoint Validation Harnesses**: Run `npm run test` regularly to execute the newly created mocks and routers integration scripts, verifying Zod schemas and NextRequest parsing interfaces.

---

## Part 2: JIRA Bug Backlog

Below are structured, JIRA-formatted tickets ready for transcription or direct import (CSV format columns: Summary, Issue Type, Component, Severity, Description, Remediation Action).

### JIRA Epic: BCS-001 - Backend Security & Cost Hardening

#### [BCS-101] Unbounded SSR paid API requests on crawler cache misses
* **Issue Type**: Bug
* **Component**: Backend Route Renderers
* **Priority / Severity**: Critical (Blocker)
* **Status**: Open
* **Affected File**: [src/app/cities/[slug]/page.tsx](src/app/cities/%5Bslug%5D/page.tsx)
* **Summary**: Crawlers crawling the long-tail of server-side rendered pages trigger downstream calls to Gemini synthesized insights and Google Places APIs, incurring high financial costs.
* **Context / Description**:
  The page rendering pipeline currently maps `/cities/[slug]` dynamically with `dynamicParams = true`. If a crawler hits an uncached long-tail city, it triggers sequential requests to the Gemini API and Google Places APIs, multiplying billing spikes (recorded ₹49,251 in 24 hours).
* **Steps to Reproduce**:
  1. Boot the server with provider credentials enabled.
  2. Simulate crawler page enumeration targeting non-existent or long-tail city names in quick succession.
  3. Observe live API requests and associated billing spikes.
* **Expected vs Actual**:
  * **Expected**: Page misses should gracefully cascade to cached fallbacks or cache-only renders for general crawlers.
  * **Actual**: Misses make sequential blocking requests to paid API endpoints inside server components.
* **Remediation Action**: Change `dynamicParams = false` to limit renders to statically warmed paths, or implement strict cached-only pages on crawler visits.

---

#### [BCS-102] Ephemeral in-memory Cost Guard counter resets on process restarts
* **Issue Type**: Bug
* **Component**: Safety & Security
* **Priority / Severity**: Critical
* **Status**: Open
* **Affected File**: [src/lib/cost-guard.ts](src/lib/cost-guard.ts#L10-L15)
* **Summary**: The daily API spend tracker is stored in an ephemeral, per-process in-memory Map, allowing container cycles and scaling replicas to bypass our safety thresholds.
* **Context / Description**:
  The spend ledger lives in `providerState = new Map()`. Under crawler storms, container memory exhaustion (OOM) triggers container restarts, which resets this Map back to zero, giving the crawler an unbounded runway to exhaust API budgets.
* **Steps to Reproduce**:
  1. Make 10 expensive calls matching the daily limit in local VMs.
  2. Kill the node process, restarting the app server container.
  3. Attempt additional query inputs; observe that the limit counter has cleared, permitting further paid API queries.
* **Expected vs Actual**:
  * **Expected**: Limit counters must persist on a durable layer across VMs and process cycles.
  * **Actual**: Counters reset instantly on every container recycle.
* **Remediation Action**: Port daily spend counters to a Postgres table in Supabase, claiming allocations through an atomic database procedure.

---

#### [BCS-103] Secret API Keys exposed in Docker image history via Build Args
* **Issue Type**: Bug (Security Vulnerability)
* **Component**: Site Infrastructure / Ops
* **Priority / Severity**: High
* **Status**: Open
* **Affected File**: [Dockerfile](Dockerfile)
* **Summary**: API secret key parameters are supplied to the container build context using docker build arguments, preserving them inside plain-text readable image layers.
* **Context / Description**:
  Secret credentials such as `GOOGLE_PLACES_API_KEY` are baked into structural layers, allowing malicious actors with image access to extract them via standard inspection tools.
* **Steps to Reproduce**:
  1. Execute a Docker image build using standard build arguments.
  2. Run `docker history <image-id>` to view layer histories.
  3. Notice secrets are printed in plain text inside the build metadata.
* **Expected vs Actual**:
  * **Expected**: Credentials are read dynamically from VM runtime environments.
  * **Actual**: Secret values are permanently cached inside the distributable layer.
* **Remediation Action**: Migrate secrets to runtime-only reading configurations.

---

#### [BCS-104] Non-idempotent Cache Key generation causing redundant DB writes
* **Issue Type**: Bug
* **Component**: Cache Orchestration
* **Priority / Severity**: Medium
* **Status**: Open
* **Affected File**: [src/lib/places.ts](src/lib/places.ts)
* **Summary**: Places request keys generate disparate variations for identical locations, leading to duplicated database writing and cache miss duplication.
* **Context / Description**:
  `buildPlacesRequestKey()` lacks sorted normalization, allowing parameter sorting anomalies to bypass cache constraints, compounding paid API requests.
* **Steps to Reproduce**:
  1. Invoke landmark queries with varied parameter formatting sequences.
  2. Inspect database caches; note multiple distinct listings written for the same single metric.
* **Expected vs Actual**:
  * **Expected**: Parameters are normalized and alphabetically sorted to generate consistent cache-keys.
  * **Actual**: Varied string lists produce duplicate queries.
* **Remediation Action**: Enforce sorted parameter checks and append a database UNIQUE constraint on `(city_id, kind, prompt_version)`.

---

#### [BCS-105] Missing negative-caching protection for non-existent city pages
* **Issue Type**: Bug
* **Component**: Cache Orchestration
* **Priority / Severity**: High
* **Status**: Open
* **Affected File**: [src/app/cities/[slug]/page.tsx](src/app/cities/%5Bslug%5D/page.tsx)
* **Summary**: Request misses on non-existent or invalid city names are not cached, forcing repeated scanning and downstream fallbacks.
* **Context / Description**:
  Crawlers fuzzing arbitrary paths trigger constant database lookup operations and fallback generations, leading to excessive utilization of DB indexing pools.
* **Steps to Reproduce**:
  1. Direct mock crawler scripts to pull 1,000 distinct fake city URLs.
  2. Watch database transaction logs; see database searching cycles re-run query scans for every hit on the same invalid location name.
* **Expected vs Actual**:
  * **Expected**: Misses are temporarily cached for 24h to block fuzzed crawler runs.
  * **Actual**: Queries to fictitious cities trigger full lookup cycles.
* **Remediation Action**: Cache 404 responses for fuzzed strings locally inside standard temporary memory stores.

---

### JIRA Epic: BCS-002 - Visual Hierarchy & Design Correction

#### [BCS-201] Out-of-gamut OKLCH accent specs clipped to harsh red-danger error colors
* **Issue Type**: Bug (Design)
* **Component**: UI Theme / Style
* **Priority / Severity**: High
* **Status**: Open
* **Affected File**: [src/app/globals.css](src/app/globals.css)
* **Summary**: Core brand accent tokens lie outside of the standard sRGB gamut range, forcing browser-dependent clipping that leaves accents looking like visual error conditions.
* **Context / Description**:
  Accent tokens `oklch(0.55 0.18 38)` clip arbitrarily into harsh primary reds (`#C33C00`), confusing standard interactive calls and hover states with warnings or error layouts.
* **Steps to Reproduce**:
  1. Boot the web app in standard web browsers.
  2. Hover on main action triggers and CTA links.
  3. Identify that clipped hover responses resemble warning pages.
* **Expected vs Actual**:
  * **Expected**: Accents display consistent, warm, and in-gamut earth-like terracotta tones.
  * **Actual**: Browser clipping forces harsh, inconsistent reds.
* **Remediation Action**: Translate definitions to safe, fully enclosed sRGB values using gamut mapping techniques.

---

#### [BCS-202] WCAG AA contrast failure on gold branding accents
* **Issue Type**: Bug (WCAG Accessibility compliance)
* **Component**: UI Theme / Style
* **Priority / Severity**: High
* **Status**: Open
* **Affected File**: [src/app/globals.css](src/app/globals.css)
* **Summary**: Secondary gold accent markers yield poor contrast ratios against our light paper background, failing accessibility specifications.
* **Context / Description**:
  `--color-brand-accent` (`#AE955D`) calculates to a contrast ratio of only **2.65:1** against our light beige paper background (`#F8F5EF`), violating WCAG requirements.
* **Steps to Reproduce**:
  1. Run Lighthouse or axe-core accessibility checks on the homepage.
  2. Identify low contrast flags on icon groups and territory highlight cards.
* **Expected vs Actual**:
  * **Expected**: Meaningful graphic assets pass the minimum 3.0:1 contrast threshold.
  * **Actual**: Ratios sit at 2.65:1, impacting readability.
* **Remediation Action**: Darken the gold token to `#B07F2E` (or equivalent) to secure ratios above 3.0:1.

---

#### [BCS-203] Monochrome muddy palette lacking color contrast and harmony
* **Issue Type**: Bug (Design)
* **Component**: UI Theme / Style
* **Priority / Severity**: Medium
* **Status**: Open
* **Affected File**: [src/app/globals.css](src/app/globals.css)
* **Summary**: Visually muddy layout characterized by a single high-chroma element over a low-contrast, entirely warm earth field.
* **Context / Description**:
  Our travel landing layouts lacks secondary, sky-like cool counter-weight points, reducing visual balance and engagement.
* **Steps to Reproduce**:
  1. Render any city category guide or primary listings dashboard.
  2. Notice the oppressive warm brown/mustard canvas and lack of fresh blue/teal accents.
* **Expected vs Actual**:
  * **Expected**: Balanced, engaging Travel UI combining soft warm backdrops with distinct blue accents.
  * **Actual**: Dull, sepia-toned canvas with harsh visual hot spots.
* **Remediation Action**: Map semantic variables to modern, well-ventilated hues. For example, implement our Azure Atlas combination: Coral Spark paired with Deep Azure and Sea Glass.

# Product Audit — Is "useless" justified? (June 2026)

Evidence-based assessment from a full codebase scan cross-referenced against
2026 category benchmarks (Wanderlog, Stippl, TripIt, TripAdvisor for trip
planning; Numbeo, Nomads.com for city data products).

## Verdict: **partially justified**

The criticism is overstated for the warmed top ~250 cities — those pages
deliver real, differentiated value (live weather + AQI, labeled AI briefings,
curated places with price filtering, no sign-up, fast and accessible). It is
**substantially justified for everything beyond discovery**: the long tail of
~47k city pages renders mostly fallbacks, several advertised metrics are
structurally null, there is no map anywhere in a maps-first category, and the
product's own copy promises planning and comparison capabilities that do not
exist. The site is a well-built *city discovery brochure*; the category in
2026 expects a *tool*.

---

## What is working well (keep and lean on)

- **Search is genuinely strong.** Multi-mode (FTS + trigram fuzzy + alias +
  geolocation "near me"), fast, with recent-search memory. Better than most
  small competitors.
- **Live signals are real.** Weather, AQI, and air-quality labels come from
  real providers with caching and fallback (OpenWeather → Open-Meteo). Few
  content sites have live data at all.
- **AI briefings are honestly framed** — streamed, explicitly labeled as
  AI-assisted, with visible sourcing. This matches 2026 trust expectations
  better than competitors that pass AI text off as editorial.
- **No-login saved places + per-place notes** (localStorage) — low-friction
  and respectful; the privacy-first analytics stack is a real differentiator
  on paper.
- **Engineering quality is above category norm**: accessibility (WCAG 2.2
  work), Core-Web-Vitals-conscious architecture, cost-guarded provider layer,
  SEO infrastructure (hubs, structured data, sitemaps).

## What is genuinely missing or underdeveloped (vs. 2026 benchmarks)

1. **No map.** Not on city pages, not for places, not for search. Every
   credible 2026 competitor (Wanderlog, TripAdvisor, Stippl, even
   spreadsheet-tier tools) is map-centric. Places render as cards with an
   outbound `googleMapsUri` link — the product hands its core moment to
   Google. *This is the single biggest credibility gap.*
2. **Data depth is thin and partly hollow.** `CityMetrics.cost_index` is
   **never populated by the live fetch path** (hardcoded `null` in
   `fetchFreshMetrics`) — cost of living renders as an em-dash on most pages.
   Benchmark: Numbeo holds ~9.8M crowd-sourced prices across 12.7k cities;
   Nomads.com ranks on cost/internet/safety. Showing a "Core metrics" panel
   with placeholders is worse than not showing it.
3. **The long tail is a liability.** ~47k city pages are in the sitemap, but
   only ~250 are warmed and production renders cache-only. A visitor landing
   on city #5,000 gets: no briefing ("ai_disabled" fallback), no places, null
   metrics, no map. This is almost certainly where "useless" comes from —
   it is the statistically most likely first impression.
4. **Copy promises tools that don't exist.** The hero promises "discovery,
   comparison, planning, arrival"; `CityPlanningPanel` says "build a personal
   itinerary." There is **no comparison view and no itinerary** — saved
   places are a flat list that dies with the browser. 2026 table stakes for
   "planning": day-by-day itinerary, collaboration/share, budget tracking.
5. **No persistence or sharing.** localStorage-only saves can't sync across
   devices, can't be shared, can't be recovered. Competitors treat shareable
   trip links as the core growth loop.
6. **No social proof or community signal.** Google ratings power sorting
   internally but review counts/ratings are barely surfaced; there is no UGC,
   no "12 travelers saved this," no real testimonials (the section that was
   named Testimonials contained design principles — since renamed).
7. **No booking/affiliate path.** Not required for credibility, but every
   benchmarked competitor closes the loop (hotels/flights/eSIM); the site
   currently ends every journey with an outbound Google link.

## Highest-impact improvements (priority order)

| # | Improvement | Why it closes the gap | Effort |
|---|---|---|---|
| 1 | **Embed a map** on city pages + experiences (Leaflet + OSM/free tiles; coordinates already exist for cities and places) | Removes the #1 category-credibility gap at zero API cost | M |
| 2 | **Stop rendering hollow metrics**: hide null fields; license or curate cost-of-living for the top 500 cities (Numbeo API or a static curated dataset refreshed quarterly) | "Hollow data" is what makes a data product feel useless | S–M |
| 3 | **Long-tail quality floor**: trim the sitemap to warmed + population-threshold cities, or give un-warmed pages an honest reduced template (geo facts, climate normals, nearest covered city) instead of empty sections | Fixes the most common bad first impression | S |
| 4 | **City comparison view** (2–3 cities side-by-side: weather, AQI, population, metrics) — the data layer already supports it; the hero already promises it | Converts existing data into a tool; unique vs. brochure sites | M |
| 5 | **Shareable saved-places**: serialize the saved list into a share URL, then optional Supabase-auth sync later | Cheapest path to persistence + an organic growth loop | S–M |
| 6 | **Itinerary-lite**: let saved places be grouped into days and exported to Google Maps / printed | Makes the "plan your trip" copy true at minimal scope | M |
| 7 | Surface **rating counts + "data freshness" stamps** on place cards and vitals | Social proof + trust, using data already fetched | S |
| 8 | Align copy with capability (until 4–6 ship, stop claiming itinerary/comparison) | Overpromising is what converts "thin" into "useless" in users' mouths | XS |

## Suggested sequencing

Week 1: items 3 + 8 + 2(hide-nulls half) — stop the bad first impressions.
Weeks 2–3: items 1 + 7 — map + trust signals (biggest visible upgrade).
Weeks 4–6: items 4 + 5 — comparison + shareable saves (tool, not brochure).
Then: 6, and the cost-data licensing decision in 2.

## Bottom line

The foundation (search, live data, AI framing, engineering) is better than the
criticism implies; the product surface (maps, data completeness, planning
tools, long-tail quality) is thinner than the category demands in 2026.
"Useless" is wrong for the top-250 discovery experience and roughly right for
everything else the site currently claims to be.

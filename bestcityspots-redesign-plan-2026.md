# bestcityspots — Evidence-Led Redesign Plan (2026 H2)

> Authored 2026-07-07. Synthesizes every dataset gathered this cycle:
> the 98-site competitor design dataset (`docs/competitor-design-catalog.md`,
> `docs/competitor-design-signals.md`, `docs/component-patterns.json`),
> the 2026 trend research and shipped feature work
> (`bestcityspots-ui-innovation-2026.md`), the WCAG-audited token system
> (`docs/design-tokens.md`, `bestcityspots-color-audit.md`), and live
> Supabase analytics (city_views_daily, feeding the warm-priority pipeline).
>
> **Positioning note.** The competitor-data plan correctly warned that the
> dataset is "not a redesign brief" — Azure Atlas is mature and audited. This
> plan honors that: it is a redesign in the sense of *sharpening every surface
> around a now-measurable identity*, not replacing it. Where the data says we
> are distinct, we amplify. Where it exposes weak spots, we fix. Nothing here
> converges toward the industry average.

---

## 1. The design thesis, now with numbers

Every claim below is checkable against the committed signals docs.

**We own a color position.** 41 of 98 travel competitors use blue primaries;
only 11 sit anywhere in the orange/coral family, and most of those are muted
ochres (Atlas Obscura `#a16a3a`) rather than a saturated coral. Coral Spark
`#E8543F` on a warm Paper field is close to unique in the category.
→ *Thesis: coral is the brand. Spend it like a scarce resource.*

**We own a geometry position.** 59 of 98 sites ship 0–4px radius (26 fully
sharp). Only 18 sites live at 9px+. Our 8–40px organic scale is measurably the
softest tier of the field.
→ *Thesis: softness is a signature, not a styling default — codify it.*

**We own a typography position.** The field's body type is commodity: Roboto
(11), Inter (7), Helvetica Neue (6), Arial (5). Serif display headings appear
almost exclusively in the luxury/magazine segments (Georgia 4, Playfair 3) —
the segments users associate with quality editorial. Instrument Sans +
Cormorant Garamond places us visually beside AFAR and Monocle, not beside
Booking and Kayak.
→ *Thesis: the serif is doing brand work — give it more stage at display
sizes, never at UI sizes (per the June review, items 6–7, already enforced).*

**We own a tone position.** 89 of 98 sites read "professional" (57) or
"modern" (32). Playful is a 7-site niche; nobody else reads *editorial-calm*.
→ *Thesis: interface copy, motion pacing, and empty states are part of the
design system. Calm is a feature.*

**And we now have living surfaces nobody in the field has.** This cycle
shipped the Living Atlas (weather-reactive city skies), City Fingerprints
(generative per-city glyphs), the Priorities Mixer, command palette,
Seasonality Dial, briefing chips, and Atlas Passport. The redesign's job is to
make these feel like one coherent system rather than eight good features.

---

## 2. Redesign pillars

### Pillar A — Identity amplification (color, type, geometry)

**A1. Coral discipline pass.** Audit every current use of `--color-accent`.
Rule: coral appears in exactly three roles — primary action, active/current
state, and one hero moment per viewport. Everything else steps down to Clay
Press, Dune Gold, or the cool counterweights. Evidence: brand-colored fills
are already the field's majority CTA treatment (43/67 sites), so coral's
distinction comes from *scarcity + hue*, not from mere presence.
*Effort: 1 day audit + fixes. Files: component sweep against globals.css.*

**A2. Display-serif stage expansion.** Cormorant at `page-title` sizes is the
single cheapest luxury signal we have (only 7 sites in the field pair a true
display serif with a modern sans). Extend it to: hub-page heroes, the passport
title, compare-page verdicts, and the 404/empty states. Keep h3-and-below
sans, per the existing rule.
*Effort: 0.5 day.*

**A3. Radius codification from evidence.** `component-patterns.json` shows the
field's primary buttons cluster at 17px+ pill (25/67) or sharp (11/67) — the
middle is mushy. Adopt a three-step component-radius law: pill (999px) for
actions and chips, `--radius-xl` for cards/panels, `--radius-md` for inputs
and inline controls. Kill remaining intermediate one-offs (finishes June
review item 10). Every step cites peers in design-tokens.md: pill CTAs —
agoda, citymapper; sharp editorial cards — afar, monocle-travel (we
deliberately do the opposite).
*Effort: 1 day, mostly mechanical.*

### Pillar B — Surface-by-surface redesign

**B1. Homepage: from sections to one story.** Current homepage is hero →
trust → showcase → principles → CTA — competent but modular. Restructure as a
single editorial scroll: (1) hero with the time-aware coastal loop (shipped)
and the search bar as the only coral moment; (2) a "living index" band — six
featured cities as Fingerprint + live-tinted mini-atmosphere cards (replaces
the icon-card monotony flagged in the June review, using data-driven visuals
instead of stock imagery); (3) one merged trust/principles section (halves the
redundancy, June item 12); (4) the Global 50 + Mixer entry point. Evidence:
magazine-segment competitors (9 sites) hold attention with fewer, denser
sections; marketplaces (17) fragment. We are a magazine that plans.
*Effort: 3–4 days. Depends on A1–A3.*

**B2. City page: scrollytelling order.** Reorder the main column to match the
question sequence a traveler actually has: arrival feel (Living Atlas hero +
weather strip) → when to go (Seasonality Dial, moved up from mid-page) →
briefing + chips → vitals/metrics → experiences → planning. The dial sitting
below Travel Essentials today buries the second-most-common question. Add
`text-wrap: balance` and the kinetic title treatment site-wide (June item 7
remnant + innovation Tier 3).
*Effort: 1–2 days, mostly moves within page.tsx.*

**B3. Compare: the balance-scale identity.** Compare is functionally strong
but visually generic. Apply the mixer's slider language, fingerprints as
column identities, and the balance metaphor from `mixer-balance.svg` for its
empty state (asset shipped, unused there). Verdict lines get the display
serif (A2).
*Effort: 1–2 days.*

**B4. Hubs: mixer everywhere.** The Priorities Mixer currently lives only on
the Global 50. Hub pages (air quality, nomads, months) get a one-line
"re-rank by your priorities" affordance reusing stored weights — the fastest
path to making rankings feel personal. Zero new backend.
*Effort: 1 day.*

**B5. Navigation coherence.** SiteNav gains the passport link once stamps
exist (localStorage check, client-only, no layout shift); mobile bottom nav
stays three items (evidence: every transit-segment competitor with 4+ tabs
reads cluttered at 375px). The ⌘K trigger stays — command palettes appear in
zero of the 98 competitor sites; it is a genuine differentiator worth
keeping visible.
*Effort: 0.5 day.*

### Pillar C — Component system 2.0 (peer-evidenced)

Rebuild the four workhorse components against `component-patterns.json`, each
with a cited rationale in design-tokens.md:

- **Primary button:** coral pill, flat (field: 58/67 flat — shadows on CTAs
  read dated), Clay Press pressed state. Peers cited: brand-colored cluster.
- **Secondary button:** light-ghost with line border — the field's dominant
  secondary pattern (32/56) and already ours; formalize hover as border-tint
  not fill-swap.
- **Input:** the field is sharp here (36/70 at 0px) — we deliberately stay
  soft (`--radius-md`+) as part of the geometry signature; document the
  divergence explicitly so nobody "fixes" it toward peers.
- **Card:** glass-2.0 treatment (1px inner light edge, small lift, no new
  blur layers — INP budget from the June work is a hard constraint).

*Effort: 2 days including documentation. This completes plan-B of the
competitor-data doc as living practice, not just a JSON file.*

### Pillar D — Motion, transitions, dark mode

**D1. View Transitions (the deferred flagship).** Enable Next's experimental
`viewTransition` behind a branch, verify `next build` locally (the blocker
that deferred it), and ship the search-row → city-hero morph: fingerprint
glyph and city name morph continuously, Living Atlas cross-fades beneath.
Reduced-motion gets instant navigation. This single transition unifies the
whole system (glyph = identity, atmosphere = place).
*Effort: 2–3 days including build verification + fallback testing.*

**D2. Night Atlas dark pass.** Dark mode exists and is token-complete; the
redesign gives it its own personality moment — the night sky plate set
(1 remaining Higgsfield generation, ~15 credits) and aurora-tinted panel
glows, plus dark-theme variants of the two baked-background SVGs (mixer,
stamps).
*Effort: 1 day + assets.*

**D3. Calm-motion policy doc.** One page in docs/: entrance fades ≤ 400ms,
one ambient layer per viewport, no scroll-jacking, reduced-motion parity
mandatory. Codifies what's already practiced so the next feature doesn't
drift.
*Effort: 0.5 day.*

---

## 3. What the analytics add

The warm-priority pipeline already ranks cities by real demand
(city_views_daily). The redesign consumes the same signal on the front end:

- Homepage "living index" features the *actually most-viewed* cities of the
  last 30 days (server-side, cached daily) rather than a hardcoded six —
  the site's front door quietly mirrors its own audience.
- Hub pages surface a "trending with readers" chip on cities in the
  analytics top decile (aggregate-only, consistent with the privacy-first
  analytics posture).
- Passport + mixer adoption become the redesign's success metrics (see §5).

*Effort: 1 day (one cached query + two presentational touches).*

---

## 4. Sequencing (four sprints)

| Sprint | Contents | Gate |
| --- | --- | --- |
| S1 (now) | A1 coral pass, A3 radius law, C components, D3 motion doc | tsc/eslint/test green; visual QA light+dark |
| S2 | B1 homepage, B2 city-page reorder, §3 analytics surfaces | CWV field data stable (LCP/INP/CLS budgets from June hold) |
| S3 | D1 View Transitions (build-verified), B3 compare, B4 hub mixer | `next build` verified locally + on VPS staging tag |
| S4 | D2 Night Atlas, B5 nav, A2 serif expansion, polish backlog (OG fingerprints, metrics-driven rings v2) | Full a11y re-audit (WCAG 2.2 AA) |

Each sprint is independently shippable; nothing in S2–S4 blocks on user
research, but §5's metrics should be read between sprints.

## 5. Success metrics

- **Distinctiveness (leading):** re-run `design:scrape` after S4; we should
  remain outside the blue/neutral color cluster and the 0–4px geometry
  cluster (regression = drift).
- **Performance (guardrail):** template-level CWV at p75 — LCP < 2.5s,
  INP < 200ms, CLS < 0.1 on home + city templates (June baselines).
- **Engagement (lagging):** mixer interaction rate on Global 50, palette
  opens per session, passport return visits, city-page scroll depth past the
  Seasonality Dial — all measurable with the existing aggregate analytics,
  no new tracking.
- **Accessibility (gate):** zero AA regressions; the S4 re-audit repeats the
  June contrast/focus/touch-target checks.

## 6. Risks and mitigations

- **View Transitions instability** (experimental flag): isolated to S3,
  branch-gated, verified builds before merge; CSS-fallback already designed.
- **Ambient layers vs INP on mid-range Android:** hard budget of one ambient
  layer per viewport (D3 policy); Living Atlas already ships the pattern
  proven safe (pre-blurred plates, transform-only drift).
- **Identity dilution by enthusiasm:** the coral-discipline rule (A1) is the
  antidote; PR review requires peer citation for token/component changes
  (already wired into design-tokens.md).
- **Scope creep toward a rebrand:** §7 below is binding.

## 7. What this redesign will NOT do

Unchanged from the competitor-data plan, restated as binding constraints: no
palette replacement (Azure Atlas stays), no chasing the industry average, no
competitor names on the public site, no arbitrary Tailwind values, no
account-gated personalization (mixer/passport stay on-device), no per-visitor
AI spend (warmer-only cost model stands).

---

## Appendix — evidence quick-reference

| Signal | Field (n=98) | Ours | Plan response |
| --- | --- | --- | --- |
| Primary color family | blue 41, coral/orange 11 | Coral Spark #E8543F | A1 scarcity discipline |
| Border radius | 0–4px: 59 sites | 8–40px scale | A3 three-step law |
| Body font | Roboto/Inter/Helvetica/Arial: 29 | Instrument Sans | keep; A2 serif stage |
| Tone | professional 57 + modern 32 | editorial calm | D3 policy, B1 narrative |
| Primary CTA fill (n=67) | brand-colored 43, flat 58 | coral pill flat | C spec + citations |
| Secondary button (n=56) | light-ghost 32 | light-ghost | C formalize hover |
| Input radius (n=70) | 0px: 36 | soft | C documented divergence |
| Command palette | 0 sites | shipped | B5 keep visible |
| Live data-reactive surfaces | 0 sites | Living Atlas et al. | B1/B2/D1 unification |

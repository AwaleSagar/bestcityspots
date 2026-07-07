# bestcityspots — Competitor Design Data: Board Plan (2026)

> Strategic plan for leveraging the travel-competitor design-system dataset
> collected 2026-07-07. Generated from Firecrawl branding extraction across 98
> sites (101 targeted, 3 anti-bot failures logged).
>
> Companion to `bestcityspots-ui-innovation-2026.md` and `docs/design-tokens.md`.
> This document is **not** a redesign brief — the existing Azure Atlas system is
> mature and WCAG-audited. It is a plan for converting the collected dataset into
> measurable product, brand, and velocity gains.

## Build status (2026-07-07)

**Initiative A — shipped.** Catalog committed at
`docs/competitor-design-catalog.md`; aggregate signals generated to
`docs/competitor-design-signals.md` via new `scripts/design-scrape/signals.ts`;
peer-evidence pointer added to `docs/design-tokens.md`; npm aliases wired
(`design:scrape`, `design:aggregate`, `design:signals`, `design:components`).

**Initiative B — shipped (ahead of schedule).** `scripts/design-scrape/
components.ts` emits `docs/component-patterns.json`: radius/fill/shadow
distributions for buttonPrimary, buttonSecondary, and input across 98 sites
(67 with button data), with 3–4 named references per archetype (dark
high-contrast, light/ghost, brand-colored, soft-radius, sharp, shadowed).
Headline finding: primary CTAs in the field are mostly brand-colored (43/67)
and flat (58/67), with 17px+ pill radius the largest single band (25) —
our pill-soft accent buttons sit with the modern cluster while the coral fill
stays rare.

**Initiative C — held** (per plan: build when a concrete external audience
exists). **Initiative D — tabled** (trigger conditions unchanged).

## Executive summary

We collected structured design tokens (colors, typography, fonts, spacing, UI
component styles, perceived tone) from **98 travel competitor websites** —
Airbnb, Booking.com, Lonely Planet, TripAdvisor, GetYourGuide, AFAR, and 92
others across 9 segments. The dataset lives in `.firecrawl/design/` and is
re-runnable via `scripts/design-scrape/`.

Three findings make this strategically valuable:

1. **Our differentiation is measurable, not subjective.** Of 98 competitors, 17
   use blue primaries and ~64 use neutral/dark; only a handful use warm tones.
   Our Coral Spark `#E8543F` is in the top decile of distinction. On geometry,
   26 competitors ship `0px` radius and 18 ship `4px`; our 8–40px scale is
   softer than ~90% of the field. On tone, 57/98 read "professional" and 32
   "modern" — our editorial "calm atlas" voice sits outside both clusters.
2. **The dataset is a reusable lookup table**, not a one-time report. Any
   future component decision (button radius, search-bar treatment, card chrome)
   can consult 3–4 named peer references instead of opinion.
3. **It is cheap to maintain.** A full re-scrape costs ~120 Firecrawl credits
   and 6 minutes; the pipeline is idempotent and gitignored.

The plan below proposes **four initiatives in three tiers** — one quick win
ship-now, two strategic builds, and one tabled option.

---

## The asset (what we have)

| Artifact              | Path                                                      | Purpose                                            |
| --------------------- | --------------------------------------------------------- | -------------------------------------------------- |
| Pipeline (4 TS files) | `scripts/design-scrape/{sources,schema,run,aggregate}.ts` | Re-runnable, idempotent, Zod-validated             |
| Raw per-site scrapes  | `.firecrawl/design/sites/*.json` (98 files, 5.4 MB)       | Full branding + markdown + metadata per site       |
| Normalized tokens     | `.firecrawl/design/tokens.json` (98 records)              | The primary reuse artifact — typed via `schema.ts` |
| Human catalog         | `.firecrawl/design/index.md`                              | Segment-grouped tables with color swatches         |
| Failure log           | `.firecrawl/design/failed.txt`                            | 3 persistent anti-bot failures documented          |

**Coverage by segment:** marketplace 17, experiences 21, city-guide 13,
discovery 10, magazine 9, luxury 9, transit 8, digital-nomad 7, rankings 4.

**Cost to date:** 121 Firecrawl credits (~1.2 per site). Runtime ~6 min.

---

## What the data says (the headline signals)

- **Color**: warm/coral accents are rare in travel (ours is differentiated).
- **Typography**: commodity fonts dominate — Roboto (11), Inter (7),
  Helvetica Neue (6) as body fonts. Our Instrument Sans + Cormorant Garamond
  reads above the field, closer to the magazine/luxury segments we admire.
- **Geometry**: industry skews sharp (0px / 4px radius). We are deliberately
  soft — a quantifiable signature.
- **Tone**: 58% "professional", 33% "modern". Our editorial register is
  outside both clusters — supporting the "calm atlas" positioning in
  `bestcityspots-ui-innovation-2026.md`.
- **Segment splits**: luxury skews serif/display headings; marketplaces skew
  sans + high-contrast CTAs; magazines skew editorial body type. Useful when
  we position specific surfaces (e.g., the stays category vs the editorial
  /about pages).

---

## Tier 1 — Quick win (ship this sprint)

### Initiative A: Design-decision references, formalized

**Problem.** Today, component decisions are made from memory or ad-hoc
inspiration. There is no shared "what do peers do" lookup.

**Action.** Promote `.firecrawl/design/index.md` from a scratch output into a
curated internal reference linked from `docs/design-tokens.md`. Specifically:

- Move the catalog under `docs/competitor-design-catalog.md` (commit the
  generated markdown; it is static and small at 24 KB — safe to version).
- Keep `tokens.json` out of git (5.4 MB raw stays in `.firecrawl/`), but
  generate a slim `docs/competitor-design-signals.md` with the aggregate
  numbers (top fonts, color distribution, radius histogram, tone split) so
  the headline signals are reviewable in a PR.
- Add a one-line pointer in `docs/design-tokens.md` to the catalog so any
  future token change is reviewed against peer evidence.

**Effort:** ~2 hours (move + regenerate slim doc + link).
**Impact:** Every future design conversation starts from evidence.
**Risk:** None. Pure documentation gain.

---

## Tier 2 — Strategic builds (next 1–2 quarters)

### Initiative B: Component pattern library for the design system

**Problem.** When we redesign a button, card, search bar, or listing chrome,
we have no structured peer reference — only the tokens we already chose.

**Action.** Build a small, browsable pattern reference derived from the
`branding.components` field (buttonPrimary, buttonSecondary: background,
textColor, borderColor, borderRadius, shadow) across the 98 sites. The data
is already in `sites/*.json`; we only need an aggregator.

- Extend `scripts/design-scrape/aggregate.ts` (or add `components.ts`) to emit
  `docs/component-patterns.json`: for each component type, the distribution of
  radius, fill style, contrast, and shadow across peers, with named examples.
- Surface 3–4 named references per component (e.g., "for high-contrast primary
  CTA, see airbnb / booking / getyourguide").
- Wire into the existing token review process: a component change must cite
  at least one peer reference.

**Effort:** ~1 day.
**Impact:** Removes subjectivity from component-level decisions; accelerates
design review.
**Dependency:** None — data is already collected.

### Initiative C: Differentiation dashboard (internal)

**Problem.** The headline signals (color, geometry, tone, typography) are
currently buried in a markdown table. For a board/marketing audience they
should be visual and shareable.

**Action.** Add a single read-only internal page (e.g., `/internal/dna` or a
static `docs/dna.html`) that renders `tokens.json` as:

- A color-position plot: each competitor plotted by hue/chroma, with
  bestcityspots highlighted, visually proving our coral sits apart from the
  blue/neutral cluster.
- A radius histogram with our range highlighted.
- A typography scatter: heading vs body font, with our pair marked.

This is the asset that turns "we feel different" into "here is the chart" for
press, investor, or partner conversations.

**Effort:** ~2 days (read-only render of existing JSON; no new data).
**Impact:** High for external-facing conversations; supports brand and
fundraising narrative.
**Note:** Keep it internal-only — do not expose on the public site (would
advertise competitor names). Gate behind the existing health-check token
pattern if server-rendered.

---

## Tier 3 — Tabled (revisit if a trigger fires)

### Initiative D: Live competitive monitoring

**Concept.** Re-run the pipeline on a schedule (monthly) and diff against the
prior snapshot to detect when majors rebrand — e.g., Airbnb shifts palette,
Booking changes button radius. This would surface competitor design moves
without manual effort.

**Why tabled.** The `firecrawl_monitor_*` tooling exists to do exactly this
diffing, but travel majors rebrand rarely (every 2–4 years). The ongoing
credit cost (~120/month) is not justified today.

**Trigger to revive:** if we enter a competitive positioning war, or if a
specific competitor (e.g., Wanderlog, Nomad List) starts shipping fast design
iterations, set up a targeted monitor on just those 3–5 domains.

---

## What we will NOT do with this data

To prevent scope creep and protect the product identity:

- **Not auto-apply competitor tokens.** The dataset informs decisions; it does
  not generate them. Azure Atlas stays hand-curated and WCAG-audited.
- **Not publish competitor names on the public site.** The catalog is
  internal reference only.
- **Not chase the industry average.** The data confirms we are intentionally
  outside the cluster — the plan is to _use_ that distance, not close it.
- **Not bypass the existing token review rules** in `docs/design-tokens.md`
  (no arbitrary Tailwind values, contrast checks required).

---

## Recommendation

Approve **Initiative A this sprint** (near-zero cost, immediate documentation
gain) and **schedule Initiative B in the next quarter** (highest leverage for
ongoing design velocity). Hold **Initiative C** for when there is a concrete
external audience (press push, partner pitch, or fundraising). Table
**Initiative D** until a competitive trigger fires.

The dataset's core value is decision-making velocity and brand confidence —
not a redesign. The single most defensible line for any external
conversation: _"Our design is measurably distinct from 98 peers on color,
geometry, and tone — and we have the data to show it."_

---

## Appendix: re-running the pipeline

```bash
# Add a site, then re-scrape (idempotent — skips existing)
# edit scripts/design-scrape/sources.ts
npx tsx scripts/design-scrape/run.ts

# Re-scrape a single segment
npx tsx scripts/design-scrape/run.ts --segment magazine

# Force full re-scrape (~120 credits, 6 min)
npx tsx scripts/design-scrape/run.ts --force

# Rebuild catalog only (no network)
npx tsx scripts/design-scrape/aggregate.ts
```

Optional: wire the above into `package.json` as `design:scrape` and
`design:aggregate` to match the convention of other script aliases.

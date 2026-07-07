# Design Tokens

Single source of truth for the visual system. All values live in
`src/app/globals.css`. **Do not introduce arbitrary Tailwind values**
(`rounded-[1.3rem]`, `text-[11px]`, inline `clamp()` type sizes) — extend the
scales here instead.

**Peer evidence:** before changing a token or component style, check the
competitor dataset — `docs/competitor-design-catalog.md` (per-site),
`docs/competitor-design-signals.md` (aggregates), and
`docs/component-patterns.json` (button/input archetypes with named
references). A component change should cite at least one peer reference.

## Color

**Azure Atlas palette (refreshed 2026-06-13).** Identity accent is Coral
Spark `#E8543F`; links/buttons use Clay Press `#C2402E` with the new
`--color-accent-deep` (Kiln) as the pressed step; the cool half of the wheel
is Deep Azure `#15608A` (`brand-secondary`/`water`) and Sea Glass `#2E8C77`
(`leaf`/dining). Dark mode sits on a cool-neutral charcoal (hue 250). All
tokens are verified inside the sRGB gamut — do not raise chroma without
re-checking gamut and contrast.

Defined in `oklch` with a parallel `.dark` palette. Semantic roles, not raw hues:

| Token                                                                                       | Role                                                                                                   |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `--background` / `--foreground`                                                             | Page canvas and primary text                                                                           |
| `--color-surface`, `--color-surface-strong`, `--color-elevated`                             | Card/panel layers                                                                                      |
| `--color-muted`, `--color-muted-strong`                                                     | Secondary text. `--color-muted` (Mist) holds 5.2:1 on `--background` (WCAG 2.2 AA) — do not lighten it |
| `--color-accent`, `--color-accent-strong`, `--color-accent-soft`, `--color-accent-contrast` | Brand action color; `accent-contrast` is the only approved text color on accent fills                  |
| `--color-earth` / `--color-leaf` / `--color-water` (+ `-soft`)                              | Organic/biophilic tints for decorative surfaces                                                        |
| `--color-cat-*`, `--color-season-*`                                                         | Category and season encodings                                                                          |
| `--color-glass*`                                                                            | Glass surfaces (backdrop-blur disabled on mobile)                                                      |

Contrast rules: body and secondary text ≥ 4.5:1; large display text ≥ 3:1.
Verify with a checker whenever a text/background token changes.

## Typography

- `--font-sans` (Instrument Sans): all UI text, `h3`–`h6`.
- `--font-display` (Cormorant Garamond): `h1`/`h2` and large display sizes **only** —
  it reads thin below ~1.5rem.
- `--font-mono`: system mono stack (no webfont — kept off the LCP critical path).

Fluid scale: `--text-fluid-xs` … `--text-fluid-hero` (clamp-based).
Utility classes: `.page-title` (hero), `.section-title` (section h2s — never
inline the clamp), `.lede`, `.eyebrow` / `.editorial-kicker` / `.labelled-rule`
(micro-labels).

**Floor: `--text-micro` (0.75rem / 12px).** Nothing renders smaller, including
uppercase tracked labels. Use `text-xs` as the smallest Tailwind size.

Headings: `h1`/`h2` use `line-height: 1.1`, `h3`–`h6` use `1.2`; all headings
get `text-wrap: balance`. Only `.page-title` may go tighter (0.95).

## Spacing & rhythm

- `--space-fluid-section`: padding inside major sections.
- `--space-fluid-gap` (= section/2): gap **between** sections — apply via
  `.section-stack`, do not hand-roll `space-y-*` breakpoint ladders.
- `--space-fluid-panel`: internal panel padding.
- Touch targets: `--touch-target-min` (44px) via `.touch-target`.

## Radius

The Tailwind radius utilities are remapped in the `@theme` block, so
`rounded-*` classes **are** the token scale:

| Class          | Value                         |
| -------------- | ----------------------------- |
| `rounded-sm`   | 0.5rem                        |
| `rounded-md`   | 0.75rem                       |
| `rounded-lg`   | 1rem                          |
| `rounded-xl`   | 1.25rem                       |
| `rounded-2xl`  | 1.5rem                        |
| `rounded-3xl`  | 2rem                          |
| `rounded-4xl`  | 2.5rem (large organic panels) |
| `rounded-full` | pill                          |

### Three-step component-radius law (redesign 2026 H2, A3)

Every component radius is one of three steps. No intermediate one-offs
(`rounded-lg`, `rounded-2xl`) on actions or cards — kill them on touch.
Evidence: `docs/component-patterns.json` (n=181 component samples, 98 peers);
the field clusters sharp (96/181 at 0–4px) — our soft scale is the
**documented divergence** (see `docs/competitor-design-signals.md`).

| Step | Token / class          | Use for                                                                                                       |
| ---- | ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| pill | `rounded-full`         | Actions (`.btn-primary`, `.btn-secondary`) + chips (`.source-chip`, `.badge-featured`)                        |
| xl   | `rounded-xl` (1.25rem) | Cards, panels (`.atlas-frame`, `.atlas-panel`, `.atlas-panel-strong`, `.intent-card`), stamps, briefing chips |
| md   | `rounded-md` (0.75rem) | Inputs + inline controls (`.nav-pill`)                                                                        |

> **Inputs stay soft on purpose.** 50/70 peers ship sharp inputs (0px); we
> deliberately diverge — softness is the geometry signature. Do not "fix"
> input radius toward peers.

Organic shapes: `.organic-blob` / `.organic-blob-inverse` (`--radius-organic*`).

## Motion

See `docs/motion-policy.md` for the full calm-motion policy (durations,
easing, ambient-layer limit, reduced-motion contract). Headline rules:

- Easings: `--transition-fluid`, `--transition-organic`, `--transition-instant`.
- Entrance fades ≤ 400ms; component transitions ≤ 250ms.
- At most one ambient layer per viewport (INP budget on mid-range Android).
- Above-the-fold entrances: CSS only (`.animate-fade-up`); no framer-motion in
  the first viewport.
- All animation/transition is globally disabled under
  `prefers-reduced-motion: reduce`.
- Avoid `filter: blur()` on decorative layers — use soft gradient stops
  (GPU blur layers cause scroll jank on mid-range devices).

## Shadows

`--shadow-sm` … `--shadow-3xl`, plus `--shadow-glow` for accent emphasis.
Dark mode redefines all of them — never hard-code rgba shadows in components.

## Components (2.0 — redesign 2026 H2, Pillar C)

The four workhorse components, specified against `docs/component-patterns.json`.
Each cites the field pattern and our deliberate divergence where applicable.
Implemented in `globals.css`.

- **Primary button** (`.btn-primary`): coral pill, **flat** (no shadow on
  hover — 58/67 peers are flat; shadowed CTAs read dated). Fill is Clay Press
  `--color-accent-strong` (4.9:1, never raw Coral Spark — audit fix #8).
  Hover → `--color-accent-deep` + 1px lift; `:active` → scale(0.98) pressed.
  Peers: brand-colored CTA cluster (Booking, GetYourGuide, Klook).
- **Secondary button** (`.btn-secondary`): light-ghost with line border (the
  field's dominant secondary pattern, 32/56). Hover is **border-tint only**
  (35% accent), never a surface fill-swap — the tint communicates state
  without the dated background swap.
- **Input**: soft at `--radius-md`+ — **deliberate divergence** (50/70 peers
  are sharp at 0px). Documented so nobody "fixes" it toward peers. No
  dedicated input class; apply `rounded-md` and `--color-line` borders inline.
- **Card** (`.atlas-panel`): glass-2.0 — 1px inner light edge
  (`inset 0 1px 0` elevated tint) + small lift, **no new blur layer**
  (backdrop-filter stays disabled on mobile per the INP budget; the inner edge
  reads as depth without the GPU cost).

## Coral usage (A1 audit log)

Coral appears in exactly three roles (binding rule, `globals.css:--color-accent`):

1. **Primary action fills** — via `--color-accent-strong` (Clay Press), e.g.
   `.btn-primary`, `.bcs-marker--active`.
2. **Active / current / focus states** — `.badge-featured`, `:focus-visible`
   outline + ring, `.intent-card:hover`, `.interactive-card:hover`,
   `.briefing-chip[open]`, `.btn-secondary:hover` border tint.
3. **One hero moment per viewport** — `.search-shell-glow` (6% radial),
   `.mixer-slider` thumb (the priority knob is the interactive focal point).

Everything else steps down to a low-opacity `color-mix` tint (10–24%), Dune
Gold (`--color-brand-accent`), or the cool counterweights. The decorative
kicker line (`.editorial-kicker::before`, 40% opacity) is the one tolerated
micro-accent — it gives the kicker its identity without competing for
attention.

Evidence: 21/98 peers ship a saturated warm primary (most are muted ochres);
coral's distinction comes from **scarcity + hue**. PR review requires a peer
citation for any new `--color-accent` use.

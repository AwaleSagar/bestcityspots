# Design Tokens

Single source of truth for the visual system. All values live in
`src/app/globals.css`. **Do not introduce arbitrary Tailwind values**
(`rounded-[1.3rem]`, `text-[11px]`, inline `clamp()` type sizes) — extend the
scales here instead.

## Color

Defined in `oklch` with a parallel `.dark` palette. Semantic roles, not raw hues:

| Token                                                                                       | Role                                                                                                         |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `--background` / `--foreground`                                                             | Page canvas and primary text                                                                                 |
| `--color-surface`, `--color-surface-strong`, `--color-elevated`                             | Card/panel layers                                                                                            |
| `--color-muted`, `--color-muted-strong`                                                     | Secondary text. `--color-muted` is tuned to stay ≥ 4.5:1 on `--background` (WCAG 2.2 AA) — do not lighten it |
| `--color-accent`, `--color-accent-strong`, `--color-accent-soft`, `--color-accent-contrast` | Brand action color; `accent-contrast` is the only approved text color on accent fills                        |
| `--color-earth` / `--color-leaf` / `--color-water` (+ `-soft`)                              | Organic/biophilic tints for decorative surfaces                                                              |
| `--color-cat-*`, `--color-season-*`                                                         | Category and season encodings                                                                                |
| `--color-glass*`                                                                            | Glass surfaces (backdrop-blur disabled on mobile)                                                            |

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

Organic shapes: `.organic-blob` / `.organic-blob-inverse` (`--radius-organic*`).

## Motion

- Easings: `--transition-fluid`, `--transition-organic`, `--transition-instant`.
- Above-the-fold entrances: CSS only — `.animate-fade-up` with
  `--fade-up-delay` for stagger. Do not ship framer-motion in the first
  viewport (INP budget); reserve it for genuinely interactive components.
- All animation/transition is globally disabled under
  `prefers-reduced-motion: reduce`.
- Avoid `filter: blur()` on decorative layers — use soft gradient stops
  (GPU blur layers cause scroll jank on mid-range devices).

## Shadows

`--shadow-sm` … `--shadow-3xl`, plus `--shadow-glow` for accent emphasis.
Dark mode redefines all of them — never hard-code rgba shadows in components.

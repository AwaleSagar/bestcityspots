# Design Tokens — "Editorial almanac"

The single source of truth for the visual system. Every value lives in
`src/app/globals.css`, and every token is exposed as a Tailwind utility
through `@theme inline` (`bg-paper`, `text-ink-muted`, `border-rule`, …).
Dark mode is a variable swap: the same names are redefined under `.dark`
(set by `next-themes`), so components almost never need `dark:` variants.

**Direction.** A calm, well-typeset city almanac: warm paper and ink
neutrals, one deep harbor-blue signature color, and a marigold highlight
used sparingly. Hairline rules and spacing define structure; there is no
glass, blur or decorative gradient. The layout is led by type and data,
because city records carry no photography.

**Do not introduce arbitrary values** (`text-[13px]`, `rounded-[1.3rem]`,
raw hex colors). Extend the scales here instead. A handful of layout-only
arbitrary values (grid track sizes, aspect ratios) are acceptable where no
scale exists.

**Peer evidence:** the competitor research in
`docs/competitor-design-catalog.md`, `docs/competitor-design-signals.md` and
`docs/component-patterns.json` is still the reference for component
archetypes (buttons, inputs, cards).

## Color

Defined in OKLCH, grouped by role. Contrast figures were measured against
the rendered sRGB values (see "Verifying contrast").

| Utility                              | Light     | Dark      | Role                                                      |
| ------------------------------------ | --------- | --------- | --------------------------------------------------------- |
| `bg-paper`                           | `#F8F5F1` | `#121417` | Page canvas                                               |
| `bg-surface`                         | `#FDFCFA` | `#1A1C20` | Raised content: cards, inputs, overlays                   |
| `bg-sunken`                          | `#F0EDE7` | `#0D0E12` | Wells, skeletons, footer, hover fills                     |
| `text-ink`                           | `#191C22` | `#EDEBE7` | Primary text (15.8:1 / 15.5:1 on paper)                   |
| `text-ink-muted`                     | —         | —         | Secondary text — ≥ 6:1 light, ≥ 7.4:1 dark, on any canvas |
| `text-ink-subtle`                    | —         | —         | Icons, rank numerals, large text only (≥ 3.8:1)           |
| `border-rule` / `border-rule-strong` | —         | —         | Hairlines / control borders                               |
| `bg-accent` / `text-accent`          | `#195F91` | `#7ABDEB` | Harbor blue: links, primary actions, current state        |
| `text-on-accent`                     | —         | —         | Only approved text color on accent fills (6.6:1 / 9.2:1)  |
| `bg-accent-soft`                     | —         | —         | Selected/active tint (active option, shared-list notice)  |
| `bg-highlight`                       | `#EDAE3B` | `#EDB345` | Marigold marks: rating star, "live" dot, saved map pins   |
| `text-highlight-ink`                 | —         | —         | Marigold as text ("Now", "Trending") — 5.7:1 light        |
| `text-danger` / `bg-danger-soft`     | —         | —         | Destructive hover, warning notices                        |

**Data scales.** Always paired with a text label — color is never the only
signal.

| Utilities                                 | Meaning                                                |
| ----------------------------------------- | ------------------------------------------------------ |
| `bg-aqi-1` … `bg-aqi-5`                   | OpenWeather AQI: Good, Fair, Moderate, Poor, Very poor |
| `bg-season-{winter,spring,summer,autumn}` | Meteorological seasons (hemisphere-aware in the UI)    |
| `bg-sights`, `bg-food`, `bg-stays`        | Place categories (reserved for small marks)            |

**Rules**

- Accent is for interaction and "you are here" — links, primary buttons,
  the active tab/nav underline, focus rings. Don't use it for decoration.
- Marigold never carries body text. Use `text-highlight-ink` for short
  labels; `text-on-highlight` if something must sit on a marigold fill.
- Cards are bordered (`border-rule`) surfaces, not shadows.

### Verifying contrast

Token pairs were checked with a script that converts the OKLCH values to
sRGB and computes WCAG ratios; every text pair passes AA in both themes.
Re-check whenever a text or background token changes. `prefers-contrast:
more` collapses `ink-muted`/`ink-subtle` to `ink` and strengthens rules.

## Typography

| Family                   | Utility        | Use                                                 |
| ------------------------ | -------------- | --------------------------------------------------- |
| Newsreader (self-hosted) | `font-display` | `h1`/`h2`, the city overview lede, large numerals   |
| Geist (self-hosted)      | `font-sans`    | Everything else; `tabular-nums` for any column data |

| Size utility          | Value                                | Use                       |
| --------------------- | ------------------------------------ | ------------------------- |
| `text-display`        | `clamp(2.5rem, …, 4.5rem)` / 1.02    | Home and city titles      |
| `text-h1`             | `clamp(2.125rem, …, 3.25rem)` / 1.06 | Page titles               |
| `text-h2`             | `clamp(1.625rem, …, 2.25rem)` / 1.12 | Section titles            |
| `text-h3`             | `1.25rem` / 1.3                      | Sub-sections, card titles |
| `text-lede`           | `clamp(1.125rem, …, 1.3125rem)`      | Page intros               |
| `text-base`/`sm`/`xs` | Tailwind defaults                    | Body, UI, metadata        |

`text-xs` (0.75rem) is the legibility floor. Labels are sentence case; avoid
tracked uppercase. Headings use `text-wrap: balance`, paragraphs `pretty`.

## Layout & spacing

- Spacing: Tailwind's 4px scale.
- `max-w-page` (76rem) for page containers via `<Container>` (gutters 16 /
  24 / 32px at base / `sm` / `lg`); `max-w-prose` (42rem) for long-form
  copy (`.prose-almanac`).
- Section rhythm: `space-y-16`–`space-y-20` between `<Section>`s; each
  section is a serif `h2` over a hairline rule.
- Breakpoints: Tailwind defaults, designed mobile-first. Content never
  scrolls sideways; horizontal scrollers use `.scroll-x`, which also sets
  `position: relative` so visually-hidden children can't widen the page.

## Shape & depth

| Utility          | Value    | Use                                                             |
| ---------------- | -------- | --------------------------------------------------------------- |
| `rounded-sm`     | 0.25rem  | Keyboard hints, tiny marks                                      |
| `rounded-md`     | 0.5rem   | Controls, cards, panels                                         |
| `rounded-lg`     | 0.875rem | Dialogs, popovers, the consent card                             |
| `rounded-full`   | —        | Chips, badges, pills                                            |
| `shadow-overlay` | —        | Only for things that float: dialogs, the search listbox, toasts |

## Controls

- Minimum target: 44px (`h-11`) for primary controls. Dense controls
  (`size="sm"`, 36px) grow to 44px on touch screens via `pointer-coarse:`.
- Focus: a 2px accent outline with 2px offset on `:focus-visible`;
  text fields show it on their wrapper (`data-focus-within-ring`).
- Primitives live in `src/components/ui`: `Button` / `buttonClasses`,
  `IconButton`, `Badge`, `Container`, `Section`, `PageHeader`,
  `Breadcrumbs`, `SpecList`, `Skeleton` / `LoadingRegion`, `EmptyState`,
  `Notice`, `Disclosure`, `Tabs`, `SegmentedControl`, `Dialog`, `Toast`,
  `RelativeTime`. Reach for these before writing new markup patterns.

## States

Every data-backed block has three designed states:

- **Loading** — `LoadingRegion` + `Skeleton` shapes that match the final
  layout, announced politely to assistive tech.
- **Empty** — `EmptyState` with a next step for primary content;
  supplemental modules (e.g. "Browse by country") are omitted instead.
- **Unavailable** — `Notice` explaining what's missing and what still works.
  CI builds with placeholder credentials, so empty/unavailable states are
  the ones every build actually renders — keep them presentable.

# Competitor Design Signals

> Slim headline-signals doc. Computed from the 98-site dataset
> (`.firecrawl/design/tokens.json`) by `scripts/design-scrape/signals.ts`.
> Full per-site detail in
> `competitor-design-catalog.md`; component-level stats in
> `component-patterns.json`.

Generated: 2026-07-07 · n = 98

## Primary color family

| Family           | Sites | Examples                                                         |
| ---------------- | ----- | ---------------------------------------------------------------- |
| blue             | 45    | Culture Trip, Jetsetter, Lonely Planet, On the Grid              |
| coral/orange/red | 23    | Atlas Obscura, Fathom, Fodor's, Frommer's                        |
| green            | 9     | NerdWallet Travel, Spotted by Locals, Nomad List, Selina         |
| purple           | 8     | Like a Local Guide, Devour Barcelona, Devour Tours, G Adventures |
| neutral/dark     | 8     | Sun and Co, Wanderlog, City Discovery, andBeyond                 |
| yellow/gold      | 5     | Outsite, Musement, Guardian Travel, Monocle Travel               |

> **Our position:** Coral Spark `#E8543F` is in the coral/orange/red family —
> a small cluster vs the blue and neutral/dark majority. Scarcity = distinction.

## Border radius (components, n=181)

| Bucket            | Count | Share |
| ----------------- | ----- | ----- |
| sharp (0–4px)     | 96    | 53%   |
| soft (5–12px)     | 46    | 25%   |
| rounded (13–24px) | 14    | 8%    |
| pill (25px+)      | 25    | 14%   |

> **Our position:** 8–40px organic scale. The field is sharp-dominant;
> we are deliberately the softest tier. Inputs especially — field skews
> sharp, we stay soft as a documented divergence (see component-patterns.json).

## Top body fonts

| Font             | Sites |
| ---------------- | ----- |
| `Roboto`         | 11    |
| `Inter`          | 7     |
| `Helvetica Neue` | 6     |
| `Arial`          | 5     |
| `Segoe UI`       | 4     |
| `Raleway`        | 3     |
| `Centra No2`     | 3     |
| `Nunito`         | 2     |

> **Our position:** Instrument Sans (not in the top 8) + Cormorant Garamond
> display. Reads beside AFAR/Monocle, not beside Booking/Kayak.

## Perceived tone

| Tone         | Sites |
| ------------ | ----- |
| professional | 57    |
| modern       | 32    |
| playful      | 7     |
| minimalist   | 1     |
| bold         | 1     |

> **Our position:** editorial-calm — outside both the professional and modern
> clusters. Calm is a feature, codified in the motion policy doc.

## Component patterns

See `docs/component-patterns.json` for buttonPrimary (n=67), buttonSecondary
(n=56), and input (n=70) radius/fill/shadow distributions with named peer
citations.

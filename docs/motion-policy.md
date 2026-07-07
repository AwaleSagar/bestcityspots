# Motion Policy (Calm Atlas)

> Redesign 2026 H2 — Pillar D3. Codifies what is already practiced so the next
> feature does not drift. Binding for all new and modified surfaces.
>
> Companion: `docs/design-tokens.md` (transition tokens), `globals.css`
> (`--transition-*`, `prefers-reduced-motion` block).

## Principles

1. **Calm is a feature.** 89/98 competitors read "professional" or "modern";
   none read editorial-calm. Motion pacing is part of that voice — slow,
   patient, never demanding. (Evidence: `docs/competitor-design-signals.md`.)
2. **Motion is narrative, not decoration.** It either communicates a state
   change or renders place (the Living Atlas). It never draws attention to
   itself.
3. **Reduced-motion parity is mandatory, not optional.** Every animation must
   degrade gracefully — see the global kill switch in `globals.css` and the
   per-feature guards below.

## Duration budget

| Class                    | Max         | Token / value                            | Example                  |
| ------------------------ | ----------- | ---------------------------------------- | ------------------------ |
| Instant (state feedback) | 150ms       | `--transition-instant` (0.12s)           | hover tint, focus ring   |
| Component transition     | 250ms       | `0.2s–0.22s var(--transition-organic)`   | card lift, button press  |
| Entrance fade            | **400ms**   | `var(--transition-fluid)`                | section reveal on scroll |
| Ambient layer            | 60–90s loop | `atlas-drift` (80s), `pulse-glow` (5s\*) |

> **Entrance fade cap is 400ms.** `.animate-fade-up` currently runs 0.5s —
> tighten to 0.4s on next touch (S1 leaves it; the 100ms excess is tolerable
> but should not grow). Do not introduce entrances > 400ms.
>
> \*`pulse-glow` (5s) is a decorative exception for a single identity moment,
> not a precedent. Do not add more 5s loops.

## Easing

Only two curves, both already in the token system:

- `--transition-fluid` `cubic-bezier(0.16, 1, 0.3, 1)` — entrances, reveals.
- `--transition-organic` `cubic-bezier(0.22, 1, 0.36, 1)` — interactive component
  transitions (cards, buttons).

No `ease-in-out`, no `linear` for organic motion, no custom curves. Instant
state feedback may use plain `ease`.

## Ambient layers — one per viewport

A viewport may run **at most one ambient layer** (an infinite or
long-duration animation that is not a state transition). Examples:

- City page hero: the Living Atlas drift (80s) — counts as the one.
- Homepage hero: the time-aware coastal loop — counts as the one.
- Search bar: the `search-shell-glow` pulse — decorative, not counted as
  ambient (it is tied to focus/interaction).

If a surface already has an ambient layer, do not add another. The INP budget
on mid-range Android (a hard constraint from the June CWV work) is the reason
— pre-blurred transform-only plates are proven safe; stacked ambient layers
are not.

## Prohibited patterns

- **No scroll-jacking.** `scroll-behavior: smooth` is allowed only on the
  document (already gated behind `prefers-reduced-motion: no-preference`); do
  not intercept wheel/touch to "enhance" scrolling.
- **No motion on data that hasn't changed.** Skeletons shimmer, real content
  does not.
- **No infinite entrances.** Reveal animations run once (`both` fill), never
  loop.
- **No parallax without reduced-motion parity.** If you ship parallax, the
  reduced-motion path must show the same content static.
- **No animation-library JS above the fold.** The hero stays CSS-only for INP
  (precedent: `.animate-fade-up` replaced framer-motion in the hero).

## Reduced-motion contract

The global block in `globals.css` already neutralizes every animation and
transition when `prefers-reduced-motion: reduce`. New features must:

1. Not override that block with `!important` on motion properties.
2. Add a feature-specific guard where the static fallback needs to look right
   (e.g., `.atlas-atmosphere-img` sets a static scale when reduced — see
   `globals.css`). The default kill is enough for entrances; ambient layers
   that affect layout need an explicit static position.

## Review checklist (for every PR that touches motion)

- [ ] Longest entrance ≤ 400ms?
- [ ] At most one ambient layer in any viewport it appears in?
- [ ] Uses only `--transition-fluid` / `--transition-organic` (or `ease` for
      instant feedback)?
- [ ] Reduced-motion path shows the same content, static?
- [ ] No new animation-library JS above the fold?
- [ ] No scroll-jacking?

# CLAUDE.md — Best City Spots

## Design Context

### Users

Best City Spots serves a broad spectrum of urban explorers — from curious research-driven travelers who enjoy deep-diving into a city's character before committing, to digital nomads comparing livability signals (cost, safety, connectivity), to aspirational travelers seeking editorial-quality recommendations, and budget-conscious explorers scanning for value. The common thread: **they want intelligent, trustworthy city data presented with editorial clarity, not a noisy booking funnel.**

Their context is pre-trip research or relocation comparison. They arrive with a city in mind (or open to discovery), need live signals fast, and want to drill into neighborhood texture without losing their thread.

### Brand Personality

**Bold, expressive, adventurous** — but channeled through sophisticated restraint. The interface should feel like a premium travel publication that also happens to be technically precise. Confidence without arrogance; warmth without informality.

### Emotional Goals

1. **Sophisticated calm** — browsing should feel like leafing through a beautifully-edited magazine, never hurried or cluttered.
2. **Curiosity & discovery** — every interaction should pull the user deeper with a sense of "I want to explore this more."

### Aesthetic Direction

- **Visual tone**: Liquid Glass — frosted translucency, fine borders, deep layered shadows, atmospheric depth through backdrop blur and OKLCH color-mixing. Warm parchment light mode; deep amber-black dark mode.
- **Typography**: Architectural and editorial. Cormorant Garamond display headings at massive fluid scales (0.9 line-height, -0.04em tracking), Instrument Sans body, IBM Plex Mono for data accents. Bold hierarchy using size contrast, not decoration.
- **Motion**: Fluid and atmospheric — spring-physics parallax orbs, staggered fade-up reveals, constellation particle effects. Never bouncy or playful; always gravitational and smooth. `prefers-reduced-motion` fully respected.
- **Color**: OKLCH warm palette. Terracotta/burnt-orange accent, teal brand-secondary, golden brand-accent. Category-specific semantic colors (dining green, stays blue, seasonal palette). Never use raw hex — all color through CSS custom properties and Tailwind tokens.
- **Reference**: Stripe.com — clear information hierarchy, elegant technical presentation, generous whitespace, confident typography.
- **Anti-reference**: Overly playful or gamified travel apps. No cartoon icons, no achievement badges, no artificial urgency or conversion pressure. Also avoid cluttered ad-heavy platforms (TripAdvisor) and cold utilitarian dashboards.

### Design Principles

1. **Editorial rhythm over decoration** — Every screen should read like a well-paced article. Use whitespace, hierarchy, and typographic scale to create rhythm. Don't add ornamentation that doesn't serve comprehension.

2. **Signal-first data** — Climate, scale, sourcing, and freshness should stay visible as users compare. Never hide the provenance of information. If it's AI-generated, label it. If it's cached, show the age.

3. **Glass, not chrome** — The Liquid Glass system (frosted backgrounds, transparent borders, layered blur) creates depth through material, not through heavy borders or drop shadows. Lean into translucency and atmospheric color-mixing.

4. **Warmth through color science** — The OKLCH palette creates perceptually-uniform warmth across both themes. Accent colors feel like warm terracotta light; in dark mode they glow like amber lanterns. Maintain this emotional temperature in every new component.

5. **Motion with purpose** — Animation serves orientation (stagger reveals show load order), delight (parallax orbs create atmosphere), and feedback (hover lifts confirm interactivity). Never animate for spectacle alone. Spring physics over linear easing.

### Design System Reference

- **CSS tokens**: All defined in `src/app/globals.css` — surfaces, glass layers, shadows, fluid type scale, border radii, transition curves.
- **Component patterns**: `.glass`, `.liquid-glass`, `.atlas-panel`, `.atlas-frame` for container styles. `.editorial-kicker`, `.labelled-rule`, `.eyebrow` for typographic accents. `.btn-primary`, `.btn-secondary`, `.nav-pill` for interactive elements.
- **Spacing**: Fluid and generous. Use Tailwind spacing utilities. Large sections use `space-y-16 md:space-y-24`. Cards use `p-5 md:p-6`. Rounded corners are large: `rounded-[2rem]` for panels, `rounded-full` for pills and badges.
- **Accessibility**: Target WCAG 2.1 AA. 48px minimum touch targets (`--touch-target-min`). Focus-visible outlines with accent-colored glow rings. Safe-area insets for notched devices. `prefers-reduced-motion` media query disables all animation.

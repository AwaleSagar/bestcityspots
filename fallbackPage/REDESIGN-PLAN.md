# Fallback Page — Redesign Plan

**Goal:** evolve `fallbackPage/index.html` (the scheduled-maintenance / offline page) into a
sleek, minimal, premium experience — modern typography, balanced spacing, quiet
hierarchy, instant load, fully responsive and accessible — without adding clutter
or decoration for its own sake.

> **North star:** _One calm message, beautifully set, that loads instantly and
> says "this team has taste and has things under control."_

---

## 1 · Current state review

The existing page is already solid — self-contained HTML, inline CSS, no external
requests, Azure-Atlas palette, dark/light via `prefers-color-scheme`, `role="status"`
live region, `prefers-reduced-motion` handling, and `noindex`. The redesign refines
rather than rebuilds.

**What's working (keep):**

- Zero external requests → genuinely fast. Single ~6.6 KB file, inline `<style>`, inline SVG.
- Dark/light support, `theme-color` per scheme, `min-height: 100svh`, fluid `clamp()` paddings.
- Reduced-motion guard, `:focus-visible` ring, `lang="en"`, `noindex,nofollow`, descriptive `<title>`.
- **Contrast already passes WCAG AA** across every pair (measured):

  | Pair | Ratio | AA body (4.5) | AA large (3.0) |
  | --- | --- | --- | --- |
  | Dark text on bg | 15.71 | ✅ | ✅ |
  | Dark muted on bg | 7.06 | ✅ | ✅ |
  | Dark accent on bg | 4.89 | ✅ | ✅ |
  | Light text on bg | 15.17 | ✅ | ✅ |
  | Light muted on bg | 5.45 | ✅ | ✅ |
  | Light accent on bg | 4.84 | ✅ | ✅ |

**Issues to fix:**

1. **Typography is aspirational, not real.** The CSS names `Instrument Sans` and
   `Cormorant Garamond`, but **neither font is loaded** (no `@font-face`/link), so the
   page silently renders in system fonts. The "modern typography" promise isn't kept.
2. **Decorative redundancy.** Three competing accent moments — the `mark` tile, the
   `h1::after` underline bar, and the pill + blinking dot — compete for the eye. Minimal
   design wants _one_ focal accent, not three.
3. **Heavy card treatment.** `border-radius: 24px` + `0 24px 60px` shadow reads a touch
   "app modal." A premium-minimal page leans flatter and airier.
4. **A stray script** sets the footer year — a tiny but unnecessary JS dependency on an
   otherwise static page (can be zero-JS).
5. **Vertical rhythm is ad-hoc.** Margins are hand-picked (28/14/20/30/32/22 px) rather
   than from one consistent scale, so spacing feels _almost_ balanced rather than intentional.

---

## 2 · Research-grounded principles

Sources reviewed via Firecrawl (WCAG 1.4.12 Text Spacing; IxDF Readability 2026; 2026
web-design guidance). The directives that shape this plan:

- **Readability first** — large default body size, high contrast, comfortable measure
  (~45–75 characters per line).
- **WCAG 1.4.12 text-spacing** must survive user overrides without clipping/overlap.
  Target/allow at least: **line-height ≥ 1.5×**, **paragraph spacing ≥ 2×**,
  **letter-spacing ≥ 0.12×**, **word-spacing ≥ 0.16×** of font size. Design with room to spare.
- **Minimal = intentional negative space**, hairline dividers, restrained palette, and a
  single accent — not "empty," but _composed_.
- **Performance is UX** — for a fallback page especially (it shows when things are already
  degraded), the page must paint instantly with no render-blocking resource and zero CLS.

---

## 3 · Redesign direction

Keep the brand DNA (Azure-Atlas warmth, the location-pin mark, serif-display + sans-body
pairing) but **deliver it for real and quiet it down**: one typographic system that
actually loads, one accent moment, a flatter and airier composition, and a spacing scale
that makes the calm feel deliberate. Net effect: lighter, more confident, more premium.

---

## 4 · The plan, by dimension

### Typography

- **Decide the font strategy (pick one):**
  - **A — System-first (recommended for fastest load):** drop the unused webfonts.
    Use a crisp modern system sans for everything (`ui-sans-serif, system-ui,
    -apple-system, "Segoe UI", Roboto, …`). The display heading uses the same stack at a
    larger optical size + tighter tracking. **Zero font bytes, zero FOUT, instant paint.**
  - **B — One self-hosted display face (recommended if the serif identity matters):**
    self-host a **subset** of the display serif (e.g. Cormorant Garamond, only the glyphs
    used) as a single `woff2` (~10–25 KB) loaded with `font-display: swap` and
    `<link rel="preload">`. Body stays system sans. This is the _only_ allowable network
    request; never pull from a third-party font CDN on a fallback page.
- **Either way, stop naming fonts that aren't loaded.** Match the CSS to what actually ships.
- **Set a real type scale** (fluid, `clamp()`-based): eyebrow `0.75rem`, body/lede
  `1.0625rem`, H1 `clamp(2rem, 6vw, 2.75rem)`. Body line-height **1.6**, headline **1.1**.
- **Tracking:** eyebrow `+0.16em`; H1 slightly tight (`-0.01em`); body neutral. Keep the
  lede measure to **≤ 36rem** (≈ 60–70 chars) for a comfortable read.

### Spacing & layout

- **Adopt one spacing scale** (4px base: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64) and use only
  these steps. Vertical rhythm becomes a deliberate `mark → 32 → eyebrow → 12 → H1 → 20 →
  lede → 32 → status → 40 → footer` cadence instead of bespoke margins.
- **Constrain measure:** content column `max-width: 30rem`, centered, generous outer
  padding via `clamp(24px, 6vw, 48px)`.
- **Flatten the container:** drop the deep shadow; let the content sit on the gradient
  wash with either no card or a barely-there hairline surface (`1px` border, no/!subtle
  shadow, radius `≤ 20px`). More air, less "modal."

### Visual hierarchy & decoration

- **One accent moment, not three.** Recommended: keep the **mark** as the single brand
  focal point; **remove the `h1::after` underline bar**; soften the status into a quiet
  inline label (small dot + muted text) rather than a bordered pill. Result: eye lands on
  mark → headline → status, cleanly.
- Use a **hairline divider** above the footer (already present) as the only structural rule.

### Color & contrast

- Palette is good and already AA-compliant — **keep it.** When softening the status pill,
  re-verify the new combination stays ≥ 4.5:1 for its text (it will, on current tokens).
- Add **`@media (prefers-contrast: more)`** to bump borders/muted text for high-contrast users.

### Motion

- Keep the single **`rise`** entrance (it's tasteful) but make it gentler (`translateY 12px`,
  ~0.6 s). **Replace the blinking dot** with a slow, low-amplitude pulse (opacity 0.6 → 1)
  or a static dot — blinking reads "alert," which fights the calm tone. All motion remains
  behind the existing `prefers-reduced-motion` guard.

### Performance (fast loading)

- **Stay single-file, inline-CSS, no external requests** (font strategy A keeps it at
  literally zero network dependencies). Target **< 8 KB** gzipped, first paint immediately.
- **Go zero-JS:** drop the year script — render the year server-side at deploy, or simply
  omit it (a maintenance page rarely needs a live year). One fewer execution, no script at all.
- Guarantee **zero layout shift**: no late-loading font (strategy A) or `font-display: swap`
  + `size-adjust` (strategy B); fixed SVG dimensions.

### Responsiveness

- Already strong. Keep `100svh`, fluid type, fluid padding. **Ensure tap targets ≥ 44×44px**
  for the "Contact support" link (add padding), and confirm no horizontal scroll at 320px.

### Accessibility

- Maintain: `lang`, `role="status"` + `aria-live="polite"`, `:focus-visible`, reduced-motion,
  `aria-hidden` on decorative SVG.
- **Add:** `prefers-contrast` support; verify the page survives the WCAG **text-spacing
  override** (line-height 1.5 / para 2× / letter 0.12em / word 0.16em) with no clipping —
  the single-column, `max-width`, `text-wrap: balance/pretty` layout makes this safe.
- Keep copy short and plain-language to **reduce cognitive load**.

### Content & copy

Tighten to the essentials — what, reassurance, how to reach a human:

- **Eyebrow:** `Best City Spots`
- **H1:** `We'll be right back`
- **Lede (one sentence):** _"We're making a few quick improvements. The site will be back online shortly — thanks for your patience."_
- **Status:** `Scheduled maintenance in progress`
- **Footer:** `© 2026 Best City Spots · Contact support`

---

## 5 · Concrete spec

### Design tokens (unchanged palette; consolidated)

| Token | Dark | Light |
| --- | --- | --- |
| `--bg` | `#14181f` | `#fbf7f2` |
| `--text` | `#eef1f5` | `#1c2128` |
| `--text-muted` | `#9aa4b2` | `#5c6675` |
| `--accent` | `#e8543f` (Coral Spark) | `#c2402e` (Clay Press) |
| `--azure` (focus) | `#4a9fcf` | `#15608a` |
| `--border` | `rgba(255,255,255,.09)` | `rgba(20,24,31,.08)` |

### Type scale

| Role | Size | Line-height | Tracking |
| --- | --- | --- | --- |
| Eyebrow | `0.75rem` | 1.4 | `+0.16em` upper |
| H1 (display) | `clamp(2rem, 6vw, 2.75rem)` | 1.1 | `-0.01em` |
| Lede / body | `1.0625rem` | 1.6 | normal, ≤ 36rem measure |
| Status / footer | `0.8125rem` | 1.5 | normal |

### Spacing scale

`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64` (px). Container padding `clamp(24, 6vw, 48)`.

### Proposed DOM (lean, semantic, zero-JS)

```html
<main>
  <div class="mark" aria-hidden="true"><!-- pin SVG --></div>
  <p class="eyebrow">Best City Spots</p>
  <h1>We'll be right back</h1>
  <p class="lede">We're making a few quick improvements. The site will be back online shortly — thanks for your patience.</p>
  <p class="status" role="status" aria-live="polite"><span class="dot" aria-hidden="true"></span> Scheduled maintenance in progress</p>
  <footer>© 2026 Best City Spots · <a href="mailto:support@bestcityspots.com">Contact support</a></footer>
</main>
```

---

## 6 · Before → After

| Aspect | Before | After |
| --- | --- | --- |
| Fonts | Named but **not loaded** → system fallback | Honest: system-first (A) _or_ one self-hosted display subset (B) |
| Accent moments | 3 (mark + underline + pill) | **1** (mark), quiet status label |
| Container | 24px radius + deep shadow | Flat / hairline surface, more negative space |
| Spacing | Hand-picked margins | One 4px-based scale |
| Motion | Entrance + **blinking** dot | Entrance + gentle pulse (or static) |
| JS | Year script | **Zero JS** |
| Weight / requests | ~6.6 KB, 0 external (good) | ≤ 8 KB, **0 external** (A) |

---

## 7 · Implementation checklist

**Performance**

- [ ] Single self-contained `.html`, inline `<style>`, inline SVG, no third-party requests
- [ ] Zero render-blocking resources; first paint immediate
- [ ] Zero CLS (no late font in A; `swap` + `size-adjust` in B)
- [ ] No JS (or one tiny inline line if a live year is truly required)

**Accessibility (WCAG 2.2 AA)**

- [ ] Contrast ≥ 4.5:1 body / 3:1 large (already passing — re-verify after restyle)
- [ ] Survives text-spacing override (1.5 / 2× / 0.12em / 0.16em) with no clip/overlap
- [ ] `prefers-reduced-motion` and `prefers-contrast` honored
- [ ] `:focus-visible`, `role="status"`+`aria-live`, decorative SVG `aria-hidden`
- [ ] Tap target ≥ 44×44px on the contact link; no horizontal scroll at 320px

**Polish**

- [ ] One accent moment; hairline divider only
- [ ] Spacing strictly from the scale; measure ≤ 36rem
- [ ] Copy trimmed to essentials

---

## 8 · Recommendation & next step

Adopt **font strategy A (system-first)** — it best serves the brief's priorities
(fast loading, lightweight, premium-not-decorative) and removes the current
unloaded-font mismatch with zero network cost. Use **strategy B** only if preserving the
serif display identity is a hard requirement; it's still single-request and CLS-safe.

This document is the plan. On approval I can implement it directly in
`fallbackPage/index.html` — it's a contained, ~1-file change with no impact on the app.

# BestCitySpots Consolidated Audit

A consolidated catalogue of issues across CSS, layout, page components, hooks, libraries, API routes, and the analytics pipeline. Items are grouped by area, then ordered by severity within each area. Severities: **Critical**, **High**, **Medium**, **Low**.

---

## Validation Update — 3 May 2026

This audit was checked against the current `fix/front-end` working tree. Most high-impact UX, accessibility, API timeout, and analytics findings are accurate. The main corrections are severity/precision updates where code has drifted or a recommendation needs a broader implementation path.

### Confirmed Live Critical / High Findings

- **Live / Critical** — `experience-helpers.ts` note key handling is broken: `parseStoredNotes`, `sanitizeNotes`, and `toNoteMap` can re-sanitize already-sanitized keys, producing `k_k_...` keys and causing saved notes to miss on reload. The fix should make `sanitizeKey` idempotent or clearly separate raw IDs from stored sanitized keys.
- **Live / Critical** — `CitySearch.tsx` still strips Unicode input with `/[^a-zA-Z0-9\s-]/g`, blocking global city names such as Köln, São Paulo, Łódź, and Montréal.
- **Live / Critical** — `MobileBottomNav.tsx` is still not mounted in `layout.tsx`, while `SiteFooter` still reserves a mobile spacer for a bottom nav that users never see.
- **Live / Critical** — `.skip-link` still uses only `transform`, so the Tailwind `fixed top-3 left-3` skip link is present in the viewport but invisible until focused. Use an off-screen-until-focus pattern.
- **Live / High** — `Home()` still awaits `fetchTrendingDestinations()` before rendering the shell, and `fetchTrendingDestinations()` is only request-scoped `React.cache`, not cross-request `unstable_cache`.
- **Live / High** — `httpFetch()` still lets caller-provided `init.signal` bypass the per-attempt timeout and records `AbortError` as provider failure.
- **Live / High** — `places/search/route.ts` still uses `Promise.race` without aborting underlying provider/cache work.
- **Live / High** — `analytics/route.ts` still starts `processAnalyticsBatch()` without `await`/`waitUntil`, so serverless shutdown can drop writes.
- **Live / High** — `AnalyticsProvider.tsx` still sends full `document.referrer` and uses `sendBeacon` with a string body rather than an `application/json` `Blob`.
- **Live / High** — `ScrollProgress.tsx` still exposes static `aria-valuenow={0}` and renders an empty percentage span when `showPercentage` is true.

### Corrected / Downgraded Findings

- **Inactive components** — `ClientEffects` is not mounted from `layout.tsx`, so `VisualEffects`, `CitySphereBackground`, and the dynamically imported `FloralAccent` do not currently affect the live app. Their findings remain valid if these effects are re-mounted, but their live severity should be downgraded until then.
- **Dormant component** — `ConstellationBackground.tsx` is not imported anywhere in active source. Its RAF, random color, gradient allocation, and duplicate fetch findings are valid code-quality issues, but not live production regressions unless the component is reintroduced.
- **CSS false positives** — `.atlas-panel-strong`, `.organic-blob-inverse`, and `.animate-pulse-glow` are used in current source and should not be deleted as dead CSS.
- **JSON-LD** — Multiple `application/ld+json` script tags are valid. Consolidating into one `@graph` payload is optional cleanup, not a schema.org correctness bug.
- **`sendBeacon` wording** — `Request.json()` does not inherently reject `text/plain` bodies, but using a JSON `Blob` is still the robust fix because it preserves content type and makes server/proxy handling more predictable.
- **Places timeout recommendation** — Passing an `AbortSignal` requires extending `searchPlaces`/`getTopPlaces` and provider/cache helpers to accept and honor the signal. A route-only `AbortController` is not sufficient in the current signatures.

### Refined Priority Order

1. Fix note key idempotency across `sanitizeKey`, `toNoteMap`, `sanitizeNotes`, and `parseStoredNotes`.
2. Preserve Unicode in `CitySearch` input.
3. Mount `MobileBottomNav` or remove it and the footer spacer.
4. Fix skip-link positioning and focus visibility.
5. Add `unstable_cache` and `<Suspense>` for home trending data.
6. Compose abort signals and skip circuit-breaker failure recording for intentional aborts in `httpFetch`.
7. Replace `Promise.race` in places search with signal propagation through the places service layer.
8. Use `waitUntil`/Next `after()` for analytics batch processing and send Beacon payloads as JSON `Blob`s.
9. Fix `ScrollProgress` ARIA/progress text.
10. Remove only verified-dead CSS, leaving currently used shared utilities intact.

---

## CSS & Global Styles

### Performance

- **High** | `globals.css:411–415, 727–731, 782–786` — `box-shadow` transitions on `.intent-card`, `.interactive-card`, `.city-card-glow` force GPU-to-CPU compositing and trigger paint every animation frame. Use a `::after` pseudo-element with `opacity` transition, or `filter: drop-shadow()` (compositable). At minimum, only set `will-change: box-shadow` while `:hover` is active, never statically.
- **Medium** | `globals.css:225–232` — `backdrop-filter: blur(16px) saturate(110%)` on `.glass`, `.glass-dropdown`, `.liquid-glass` creates a stacking context with no containment hint. Add `contain: layout style`. Keep the mobile strip-out at lines 865–870.
- **Medium** | `globals.css:190–197` — Expensive `:not()` chain on every anchor: `a:not([class*="button"]):not([class*="btn"])...`. Substring attribute matching runs on every `<a>` during every style recalc. Invert the pattern: add an explicit `.link` utility class for styled links and remove the chain.
- **Low** | `globals.css:810–812` — `animate-pulse-glow` (5s infinite) is used by the city hero glow. Keep it, but prefer animating a pseudo-element or add a scoped compositing hint if profiling shows paint cost.

### Dead / Unused CSS (~240 lines deletable)

- **High** | Lines 284–332 — `landing-hero-shell`, `hero-atmosphere`, and orb variants (incl. `::before`/`::after` null overrides and dark-mode redundant re-assignment): zero usages. ~50 lines.
- **High** | Lines 267–280 — `.atlas-spotlight::after`: not referenced.
- **Corrected** | Lines 468–472 — `.atlas-panel-strong` is referenced by About, Top Cities, and city detail pages. Keep it and its shared `::before` treatment unless those panels are refactored.
- **High** | Lines 517–524 — `.atlas-chip-accent`, `.atlas-rule`: not referenced.
- **High** | Lines 531–553 — `.hero-notice`, `.hero-metric-pill`, and the `@media (min-width: 640px)` block that exists solely for these. ~23 lines.
- **High** | Lines 596–622 — `.badge-top-rated`, `.badge-dining`, `.badge-stays`: only `.badge-featured` is in use. ~27 lines.
- **High** | Lines 709–725 — `.progress-counter`: not referenced.
- **High** | Lines 768–795 — `.chapter-divider`, `.city-card-glow`, `.section-divider`: all unreferenced. ~28 lines.
- **High** | Lines 814–826 — `@keyframes marquee` + `.animate-marquee`: not referenced.
- **High** | Lines 855–913 — Mobile-only dead classes (`mobile-bottom-spacer`, `content-lazy`, `mobile-flat`, `mobile-color-border`, `hero-atmosphere-orb`). The `@media (max-width: 767px)` block can shrink from ~65 lines to ~15. Keep glass strip-out (865–870) and `.interactive-card` overrides (906–918).
- **Medium** | Lines 694–705 — `.custom-scrollbar`: applies to nothing.
- **Corrected** | Lines 391–393 — `.organic-blob-inverse` is used by `HeroHeader.tsx`; keep it unless that hero panel shape is redesigned.
- **Medium** | Lines 738–766 — `.search-stage` and `.noise-overlay::after` (a null override of a nonexistent class) are dead. Keep `search-shell` and `search-shell-glow`.

### Redundant Rules

- **Medium** | Lines 579–622 — All four badge variants repeat the same five base properties verbatim. Extract a `.badge` base class; variants only override color/background/border.
- **Medium** | Lines 329–332 — `.dark .landing-hero-shell` re-assigns tokens to themselves (moot once parent class is removed).
- **Medium** | Lines 321–327 — Null `::before` / `::after` on `.landing-hero-shell` (`content: none` for pseudo-elements never applied to this selector).
- **Low** | Lines 231–232, 868 — `-webkit-backdrop-filter` is unnecessary; Safari 15.4+ (2022) supports unprefixed `backdrop-filter`.
- **Low** | Lines 557–558 — `.lede` font-size hand-rolled `clamp(1rem, 0.95rem + 0.3vw, 1.12rem)` should use `var(--text-fluid-lg)`.

### Animation

- **High** | Line 141–146 — `scroll-behavior: smooth` is unconditional. Move into `@media (prefers-reduced-motion: no-preference)` rather than relying on the override at line 831.
- **Medium** | Lines 835–840 — Blanket `*` + `!important` override in `prefers-reduced-motion` is too broad. Use `:where(*, *::before, *::after)` to contain specificity, and use `animation: none !important; transition: none !important` as the canonical pattern.

### Accessibility

- **Critical** | Lines 215–221 — `.skip-link` uses `transform: translateY(-8px)`, leaving it in flow. A proper skip link must be off-screen until focused (`position: absolute; left: -9999px; ... :focus-visible { position: fixed; top: 1rem; left: 1rem; ... }`).
- **High** | Lines 7–88 — No `prefers-color-scheme` auto-init. Dark mode relies on a `.dark` class only — users with OS dark mode see a flash of light theme until JS toggles. Add a CSS-only baseline: `@media (prefers-color-scheme: dark) { :root:not(.light) { /* dark tokens */ } }`.
- **High** | Entire file — No `prefers-contrast: more` handling. Add overrides for `--color-muted` and border opacity.
- **Medium** | Line 16 — `--color-muted` (`oklch(0.55 0.015 42)` on `oklch(0.97 0.008 80)`) is ~4.2:1 — below 4.5:1 WCAG AA for the small uppercase text it's used in. Nudge to `oklch(0.50 0.018 42)`.
- **Medium** | Lines 209–213 — `focus-visible` outline uses `color-mix(... 60%, transparent)` which may not meet 3:1 against all backgrounds. Use `outline: 2px solid var(--color-accent)` opaque, with the glow ring as supplementary.
- **Low** | Line 142 — `-webkit-text-size-adjust: 100%` blocks user font-size scaling on WebKit mobile. Remove; the unprefixed property at line 143 is sufficient.

### Modern CSS Opportunities

- **Medium** | Lines 176–184 — Heading rule omits `h6`. Add it. Also adopt CSS nesting where rules share a parent.
- **Low** | Lines 638–642 — `transition: ... 0.2s ease` — `ease` is the default; drop it from all four declarations.
- **Corrected** | Lines 85–86 — `--radius-organic-inverse` is consumed by `.organic-blob-inverse`, which is used by `HeroHeader.tsx`. Keep both unless the hero panel is redesigned.

### CSS Splitting Plan

After dead-code removal, split `globals.css` into:

| File | Source Lines | Content |
|---|---|---|
| `src/styles/tokens.css` | 5–137 | Design tokens (`:root`, `.dark`) |
| `src/styles/base.css` | 139–221 | Reset, headings, focus, skip-link |
| `src/styles/glass.module.css` | 223–280 | `.glass`, `.glass-dropdown`, `.liquid-glass`, `.atlas-spotlight` |
| `src/components/sections/hero.module.css` | 283–453 | Hero shell, intent-card, terrain-lines, etc. |
| `src/components/ui/cards.module.css` | 454–473 | `.atlas-frame`, `.atlas-panel`, `.atlas-panel-strong` |
| `src/components/ui/typography.module.css` | 474–577 | Editorial kicker, eyebrow, atlas-chip, page-title, lede, etc. |
| `src/components/ui/badges.module.css` | 579–622 | Badge variants |
| `src/components/ui/buttons.module.css` | 624–665 | `.btn-primary`, `.btn-secondary` |
| `src/components/layout/nav.module.css` | 667–690 | `.nav-pill`, `.touch-target`, `.container-gutter` |
| `src/components/features/city/search.module.css` | 692–766 | Search components |
| `src/styles/animations.css` | 797–851 | Keyframes, animate classes, `prefers-reduced-motion` block |
| `src/styles/mobile.css` | 853–919 | Mobile overrides (post-cleanup) |

Target: `globals.css` reduced to ~15 lines (only `@import "tailwindcss"`, `@variant dark`, and re-imports).

---

## Layout, Navigation & Page Shell

- **Critical** | `MobileBottomNav.tsx` — Component is defined but never imported by the current `layout.tsx`, so mobile users never receive the bottom nav. `SiteFooter` reserves a `h-4 md:hidden` spacer for a nav that does not exist. Either mount it in `layout.tsx` and reserve the real safe-area height, or delete the file and spacer together.
- **High** | `layout.tsx:23–38` — Cormorant Garamond loads 4 weights (`400 500 600 700`); IBM Plex Mono loads 3. Neither is variable, so each weight is a separate request. Audit actual usage; likely only `400`/`600` for Cormorant and `400` for Plex Mono are needed. Add `display: 'swap'` explicitly.
- **High** | `page.tsx:14` — `Home()` `await`s `fetchTrendingDestinations()` before rendering anything. No `<Suspense>` boundaries means FCP is gated on the slowest data dependency. Move the data fetch into a child server component wrapped in `<Suspense fallback={<HomeSearchSkeleton />}>`.
- **High** | `ThemeToggle.tsx:28`, `SiteNav.tsx:31–38, 15–26` — Touch targets fail WCAG 2.5.5 (44×44px minimum):
    - ThemeToggle button: 36×36px (`h-9 w-9`)
    - Nav links (`px-2.5 py-2 text-xs`): ~30px tall
    - Logo `<Link>`: 36px tall
  Use `h-11 w-11` or wrap in `min-h-[44px] min-w-[44px]` containers; add `py-3` or `min-h-[44px] flex items-center` to nav links.
- **Low** | `layout.tsx:136–143` — Two `application/ld+json` script tags are valid. Consolidating them into one `@graph` payload is optional cleanup that would reduce DOM noise and make Organization/WebSite relationships easier to maintain.
- **Medium** | `ThemeToggle.tsx:29` — `aria-label="Toggle theme"` is static. Use state-aware text: `aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}`. Also resolve the icon convention (current vs. target).
- **Medium** | `SiteNav.tsx:31–38` — Desktop nav has no active link state. `MobileBottomNav` correctly uses `usePathname()` and `aria-current="page"`. Extract a `NavLink` client component with the same pattern.
- **Medium** | `layout.tsx:17–20` — `themeColor` only follows `prefers-color-scheme`, not the user's stored theme preference. Update the meta tag client-side via `next-themes`.
- **Medium** | `SiteNav.tsx` & `MobileBottomNav.tsx` — Route list defined twice. Move to `src/config/nav.ts`.
- **Medium** | `layout.tsx:155–159` — Skip link uses `top-3 left-3` AND inline margins with `env(safe-area-inset-...)` — double-offset on notched devices. Use `top: calc(0.75rem + env(safe-area-inset-top, 0px))`.
- **Low** | `layout.tsx:163–165` — Redundant inner `<div className="flex flex-1 flex-col">` adds DOM depth with no layout effect.
- **Low** | `SiteFooter.tsx:76` — `new Date().getFullYear()` runs at server render time; under ISR it freezes at build time. Use a tiny client component for the year span, or set `revalidate` on consuming pages.
- **Low** | `SiteNav.tsx:13` vs `MobileBottomNav.tsx:18` — Inconsistent `backdrop-blur-lg` vs `backdrop-blur-md`. Standardize on `md` (cheaper, still effective).
- **Low** | `page.tsx:17` — `min-h-screen` on `<main>` is redundant — root layout already has it.

---

## Experiences & AI Briefing Sections

- **Critical** | `experience-helpers.ts:23–45` + `ExperiencesSection.tsx:243–244` — Note keys are sanitized repeatedly across `toNoteMap`, `sanitizeNotes`, and `parseStoredNotes`, turning stored keys like `"k_abc"` into `"k_k_abc"`. Lookups miss after reload and during draft/persist transitions. **Fix:** make `sanitizeKey` idempotent (`key.startsWith("k_") ? key : ...`) or split raw-place-id and stored-note-key helpers, then ensure `toNoteMap` does not transform keys that are already in state.
- **High** | `ExperiencesSection.tsx:333–584` — `renderCard` is a 250-line inline function. Every state update (`expandedCards`, `savedPlaces`, `draftNotes`, `activeTab`) recreates it and re-renders all visible cards — also re-triggering framer-motion entry animations. Extract as `<ExperienceCard>` (separate file, `React.memo`); make handlers `useCallback` in the parent.
- **High** | `ExperiencesSection.tsx:211–221` — `rawData`/`filteredData`/`displayData` computed inline; `topK` runs on every render. Wrap in `useMemo` keyed on `[activeTab, selectedPrice, landmarks, restaurants, hotels]`.
- **High** | `ExperiencesSection.tsx:244` — `placeNotesMap` lacks `useMemo` while line 243's `draftNotesMap` has it. Mirror the pattern.
- **High** | `page.tsx:189` — `getCityWeather` awaited inline blocks the entire page shell. Move into an async `WeatherSection` server component wrapped in `<Suspense>`, or pass `weather={undefined}` initially and use `CityVitalsFallback`.
- **High** | `ExperiencesSkeleton.tsx:1–3` — Skeleton imports `motion` from framer-motion, gating the fallback on the very client bundle whose load it's supposed to mask. Replace `motion.*` with CSS keyframes (`animate-fade-in`, staggered `animation-delay` for loading dots). `AIBriefingSkeleton` already follows the correct pattern (server component + `animate-pulse`).
- **Medium** | `AIBriefingClient.tsx:57–65` — `mergedSeasons` recomputed on every render. Wrap in `useMemo(..., [insight])`.
- **Medium** | `AIBriefingClient.tsx:18–54` — `getSeasonColor` is pure; move to module scope.
- **Medium** | `ExperiencesSection.tsx:246–301` + `AIBriefingClient.tsx:97–137` — ~80 lines of duplicate tab switcher UI (scrollable bar, `layoutId` motion indicator, count badges). Extract a shared `<TabSwitcher tabs onChange layoutId />`.
- **Medium** | `AIBriefingSection.tsx:12–14` — Silent `null` return on missing AI insight. Render a fallback panel: "AI briefing is unavailable for this city right now."
- **Medium** | `ExperiencesSection.tsx:480–494` — Save button hardcodes orange classes regardless of active tab category. `catColor.save` / `catColor.saveHover` already exist — use them.
- **Medium** | `ExperiencesSection.tsx:205–209` — Three local-variable aliases (`tabs = TABS`, `priceLevelLabels = PRICE_LEVEL_LABELS`, `priceLevels = PRICE_LEVELS`) add cognitive noise. Reference the constants directly.
- **Medium** | `page.tsx:201–210` — Two overlapping breadcrumb affordances: a `<Breadcrumbs>` component and a manual `<nav aria-label="Breadcrumb">` directly below. Pick one.
- **Medium** | `ExperiencesSection.tsx:361–371` — Featured card image (`isFeatured = index === 0`) is large and above-the-fold but missing `priority` on `OptimizedImage`. Pass `priority={isFeatured}` to improve LCP.
- **Low** | `AIBriefingClient.tsx:68–72` — Static `tabs` array recreated each render. Hoist to module scope.
- **Low** | `AIBriefingClient.tsx:141–283` — Three motion tab panels share identical `initial`/`animate`/`exit`/`transition` props. Extract a shared variants object or `<TabPanel>` wrapper.
- **Low** | `AIBriefingSkeleton.tsx:11` — "Generating..." misleads if content is cached. Use "Loading briefing..." or omit.
- **Low** | `page.tsx:43–50` — `CoreMetricsSkeleton` height (`h-[120px]`) doesn't match `MetricCard`'s actual ~160–180px, causing CLS.
- **Low** | `experience-helpers.ts:139–175` — `topK` is over-engineered for k=5 on arrays of ≤20. A native `.sort().slice(0, 5)` is more readable; keep the heap version only if profiling justifies it.

---

## City Search & Backgrounds

### CitySearch.tsx

- **Critical** | Line 278 — `val.replace(/[^a-zA-Z0-9\s-]/g, "")` strips all Unicode. Users cannot type "Köln", "São Paulo", "Łódź", "Montréal", or any non-ASCII city. Use `/[<>{}|\\^\`\[\]]/g` for actual injection vectors only, or remove and rely on backend sanitization (the `length <= 100` cap already prevents runaway input).
- **High** | Lines 477–562 — `motion.li layout` triggers a full FLIP measurement pass across all 10 items on every `activeIndex` change (mouse-over, ArrowUp/Down). Remove the `layout` prop; only CSS classes change, not positions.
- **High** | Line 491 — `onMouseEnter={() => setActiveIndex(idx)}` overrides keyboard navigation. Track last interaction device via a ref; honor `onMouseEnter` only when the last interaction was mouse.
- **Medium** | Lines 564–573 — `<li role="status">` inside `<ul role="listbox">` violates ARIA child constraints. Drop the `role="status"`, keep `aria-live="polite"`, or render outside the `<ul>`.
- **Medium** | Line 235 — Hardcoded `resultsListId = "city-search-results"` produces duplicate IDs if mounted twice. Use `useId()`.
- **Medium** | Line 172 — `const highlightMatch = highlightMatchFn` is a redundant alias.
- **Low** | Lines 73–81 — `new Date()` allocated each render for `timeOfDay`. Wrap in `useMemo(..., [])`.

### CitySphereBackground.tsx

> **Validation note:** `CitySphereBackground` is currently reachable only through `VisualEffects`, and `ClientEffects` is not mounted in `layout.tsx`. These findings are valid if the visual-effects layer is re-enabled, but they are not active production costs in the current tree.

- **High** | Lines 32–43, 379–390 — ~170 simultaneously animated DOM nodes (120 `SphereNode` + 50 `FloatingParticle` + 8 with `animate-pulse` + `animate-ping`). Migrate to `<canvas>` like ConstellationBackground, or reduce `MAX_CITIES` to 60 and `PARTICLE_COUNT` to 20.
- **Medium** | Lines 144–148 — `backfaceVisibility: "hidden"` set as inline style on every `SphereNode` allocates 120 new objects per re-render. Move to a CSS class.
- **Medium** | Lines 278–306 — When the sphere scrolls off-screen, `activeIndices` aren't cleared before the early return; stale state accumulates when it returns into view. Replace `if (!isVisible) return;` with `if (!isVisible) { setActiveIndices([]); return; }`.
- **Low** | Lines 404–419 — `key={i}` on sphere nodes prevents reconciliation by identity when label data changes. Use `key={labels[i] ?? i}`.

### ConstellationBackground.tsx

> **Validation note:** `ConstellationBackground.tsx` is not imported anywhere in active source. Treat these as dormant code-quality issues or delete the component if it is no longer part of the product direction.

- **Critical** | Lines 51–53, 339 — `getStarColor(brightness)` calls `Math.random()` internally, executing once per star per frame at 60fps. Star colors strobe between palette entries — almost certainly an unintentional bug. Pre-compute `colorIndex` in `generateStars` and pass it instead.
- **High** | Lines 271–280 — Reading `canvas.offsetWidth`/`offsetHeight` inside RAF forces a synchronous layout reflow every frame. Use a `ResizeObserver` writing to a `dimRef`.
- **High** | Lines 265–368 — RAF runs at 60fps even when the canvas is off-screen. Mirror CitySphereBackground's `IntersectionObserver` pattern (lines 219–229) to pause the loop.
- **High** | Lines 326–329 — `ctx.createRadialGradient()` allocated per star per frame = 4,800 allocations/sec. Pre-draw a sprite/stamp once, or substitute `ctx.arc` with low-alpha fill.
- **Medium** | Lines 277–280 — `ctx.scale(dpr, dpr)` accumulates if `canvas.width` doesn't change but DPR does. Use `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)` (idempotent).
- **Medium** | Lines 348–356 — `ctx.font` set per labeled star and `ctx.shadowBlur` toggled per draw. Set `ctx.font` once before the loop; group all shadowed draws into one pass.
- **Medium** | Line 353 — `star.label.toUpperCase()` recomputed every frame. Uppercase at generation time inside `generateStars`.
- **Low** | Lines 219–241 + `CitySphereBackground` fetch — If both backgrounds are ever mounted together, they would fetch `/api/cities/sphere` independently. Today `ConstellationBackground` is dormant and `CitySphereBackground` is not mounted, so solve by deleting unused backgrounds or centralizing label loading before re-enabling both.

### OptimizedImage.tsx

- **Medium** | Lines 219–222 — `style={{ willChange: "transform, opacity" }}` is permanent — never removed after `isLoaded` is true. Lets every loaded image hold a dedicated GPU layer indefinitely. Remove it; Framer Motion manages `will-change` automatically around animation bounds.
- **Medium** | Lines 64–84 — `blurhashToDataURL` decoded per mount, allocating a canvas each time, even when the same blurhash is reused across instances. Add a module-scope `Map<string, string>` cache.
- **Low** | Line 167 — `generateSizes(width)` not memoized. Wrap in `useMemo(() => generateSizes(width), [width])`.

### CityVitals.tsx

- **High** | Lines 48, 57, 64, 73, 78 — `text-[8px]` and `text-[9px]` labels ("UPDATED", "TEMPERATURE", "AIR QUALITY", "HUMIDITY", "WIND") fail WCAG 1.4.4 legibility. Use `text-[11px]` minimum for category labels, `text-xs` (10px) for the timestamp.
- **Medium** | Lines 10–22 — `bg-emerald-500/8` (and similar `/8`) is non-standard Tailwind opacity; the JIT may purge it. Use `/10` or define `/8` in `tailwind.config`.
- **Medium** | Lines 9–39 — `getAqiColor`, `getTempColor`, `getTempIconColor` are pure but defined inside the component — recreated each render. Move to module scope.

---

## Reveals, Hero & Section Components

### Above-the-Fold

- **High** | `HeroHeader.tsx:15–22` — Hero starts at `opacity: 0, y: 12`; the browser paints blank until framer-motion hydrates and animates, masking LCP and contributing to CLS. Render as a Server Component with a thin client wrapper for the scroll handler only; use CSS `@keyframes` for the entry animation, or `initial={false}` to avoid blocking initial paint.
- **High** | `ScrollReveal.tsx:37` — Default `y: 40` offset is too aggressive — content slams upward 40px while `HeroHeader` uses subtle `y: 12`, an inconsistency. Change `fade-up`/`fade-down` defaults to `y: 20` / `y: -20`.
- **Medium** | `ScrollReveal.tsx:83` — `useReducedMotion()` called per `ScrollReveal` instance (~30+ per page) creates redundant media-query subscriptions. Provide once via a `MotionPreferencesProvider` context.

### Content Loading

- **High** | `TopCitiesPageContent.tsx:226–234` — ~50 individual `IntersectionObserver` instances, one per `CityRow`. The 26–50 band stagger at 0.03s means the last item animates in 0.75s after viewport entry — content withheld for no reason. Wrap the `atlas-frame` once or use a single `StaggerContainer` per band.
- **Medium** | `HomeSearchShowcase.tsx:49` — `cityPreview = topCities.slice(0, 6)` allocates a new array each render. `useMemo`.
- **Medium** | `HomeSearchShowcase.tsx:138–157` — Inline `[{...}].map(...)` array allocated each render. Hoist to module scope.

### Animation Polish

- **Medium** | `AboutPageContent.tsx:75–94` & `TopCitiesPageContent.tsx:140–154` — Three sequential `ScrollReveal` instances watch the same viewport area (eyebrow, h1, lede). Use one `ScrollReveal` on the `<header>` with framer-motion `staggerChildren`.
- **Low** | `HeroHeader.tsx:7–22` vs line 26 — Variants are at module scope but `signalItems` is defined inside the component. Move `signalItems` out for consistency.
- **Low** | `HomeSearchShowcase.tsx:84–87` — Four `motion.article` cards each have their own `whileInView` + `viewport`. Use parent `variants` stagger so framer-motion does it with one observer.

### Typography

- **Medium** | `AboutPageContent.tsx:134` — `<h2>` used inside a section that already has an `h2`. Change card titles to `<h3>` to fix the heading outline.
- **Low** | `AboutPageContent.tsx:59–60` & `TopCitiesPageContent.tsx:124–125` — `py-12` + inline `style={{ paddingTop: "max(...)" }}` is fragile; a Tailwind config change to `py-12` could silently break the safe-area padding. Use `pb-12` and a dedicated `pt-safe` utility.

### Interactive Elements (page-level)

- **High** | `ScrollProgress.tsx:32–33` — `aria-valuenow={0}` is a static prop on the `progressbar` role — screen readers announce "0% reading progress" forever. Wire to scroll progress with `useMotionValueEvent(scrollYProgress, "change", v => setProgressValue(Math.round(v * 100)))`.
- **High** | `ScrollProgress.tsx:60–67` — `showPercentage={true}` renders a `<motion.span>` containing only a comment. Wire it to the progress state above, or remove the prop.
- **Medium** | `TopCitiesPageContent.tsx:257` — `window.scrollTo({ ..., behavior: "smooth" })` ignores `prefers-reduced-motion`. Pick `"auto"` when `useReducedMotion()` returns true.
- **Low** | `HeroHeader.tsx:64–71` — `setTimeout` for focus has no cleanup; if the component unmounts during the 200ms delay, it focuses a detached node. Store the ID in a ref and clear in `useEffect` cleanup.
- **Low** | `ScrollProgress.tsx:43–52` — Permanent blurred glow `<div>` bleeds outside the 1px progress bar. Add `overflow: hidden` to the parent track or reduce blur to `4px`.

### Responsive

- **Medium** | `TestimonialsSection.tsx:63` & `TrustIndicators.tsx:73` — `grid-cols-3` jumps from 1 column to 3 with no `sm:grid-cols-2` intermediate. Add an intermediate breakpoint.
- **Low** | `TopCitiesPageContent.tsx:158–182` — "Countries" card uses responsive radius (`rounded-[1.1rem] sm:rounded-[1.3rem] md:rounded-[1.5rem]`) while siblings use flat `rounded-[1.5rem]`. Make consistent.

### Component Architecture

- **High** | `TestimonialsSection`, `TrustIndicators`, `FreeResourceCTA`, `AboutPageContent`, `TopCitiesPageContent` — All `"use client"` for static markup whose only client need is `ScrollReveal`'s `useInView`. Forces full JS bundle and prevents RSC streaming. Extract a tiny `<AnimatedSection>` client wrapper; let content render on the server.
- **Medium** | `AboutPageContent.tsx` & `TopCitiesPageContent.tsx` — ~80 lines of duplicate page shell (`ScrollProgress`, container, breadcrumb nav). Extract a `PageShell` component with `back-href` and `back-label` props.
- **Low** | `TopCitiesPageContent.tsx:208` — `cities.indexOf(bandCities[0])` is a linear scan inside the render loop. Encode `start`/`end` directly on the `bands` constant.

---

## Visual Effects, Hotspots & Interactive Buttons

> **Validation note:** `VisualEffects` and `FloralAccent` are behind `ClientEffects`, but `ClientEffects` is not mounted in the current `layout.tsx`. Keep the VisualEffects findings as pre-mount hardening tasks, not live production regressions, unless the effects layer is restored.

- **High** | `VisualEffects.tsx:43–99` — `AnimatePresence` wraps a plain `<div>`, not a `motion.*`. Exit animations never fire — the dialog snaps away. Change to `motion.div` with `initial`/`animate`/`exit` props.
- **High** | `VisualEffects.tsx:47–98` — `role="dialog"` with no focus trap or focus management. Keyboard users can tab through background content (WCAG 2.1 Level A failure: 1.3.1, 2.1.2). Use `focus-trap-react` or `@radix-ui/react-dialog`.
- **High** | `InteractiveButton.tsx:178–185` — Link variant renders `<motion.div><Link>`, breaking inline layout and adding a screen-reader announcement. Use `const MotionLink = motion(Link)` directly.
- **Medium** | `Hotspot.tsx:118–133` — Each instance runs an infinite `repeat: Infinity` RAF loop for the pulse glow even when closed. Animate only `whileHover`, or use a CSS animation (off-thread).
- **Medium** | `Hotspot.tsx:102–110` — `onMouseEnter`/`onMouseLeave` on the outer span and `onClick` toggle on the inner button share `isOpen`. On touch, `onMouseEnter` fires before `onClick` and the tooltip opens-then-closes (or vice versa). Separate the models: hover on pointer, click on touch.
- **Medium** | `Hotspot.tsx:111, 142` — Mixes `aria-expanded` (dialog pattern) on the trigger with `role="tooltip"` on the content. For a tooltip, the trigger needs `aria-describedby={tooltipId}` and the tooltip needs the matching `id`.
- **Medium** | `Hotspot.tsx` — No click-outside handler; click/keyboard-opened tooltips don't dismiss when clicking elsewhere. Add a document-level `mousedown` listener with cleanup.
- **Medium** | `Hotspot.tsx:147–174` — `position: absolute` tooltip is clipped by `overflow: hidden` ancestors. Render via `createPortal` with `getBoundingClientRect` positioning.
- **Medium** | `InteractiveButton.tsx:74–93` — Raw `setTimeout` on the 600ms ripple isn't cancelled on unmount. Store in a ref and clear in cleanup.
- **Medium** | `ScrollReveal.tsx:152–159` — `StaggerContainer` checks `Array.isArray(children)`, which is false for a single child node — animation silently dropped. Use `React.Children.map`.
- **Medium** | `VisualEffects.tsx:15–28` — Global keydown Easter egg buffer accumulates characters from form typing. Guard with `if ((e.target as HTMLElement).closest('input, textarea, [contenteditable]')) return;`.
- **Medium** | `Breadcrumbs.tsx:17–26` — `<Link aria-label="Home">` already provides the accessible name; the inner `<span className="sr-only">Home</span>` causes some screen readers to announce "Home Home". Remove the span.
- **Low** | `FloralAccent.tsx` + `ClientEffects.tsx:8–10` — `FloralAccent` returns `null` and would cost an empty dynamic chunk if `ClientEffects` were mounted. Since `ClientEffects` is currently unused, either delete both the null component and its import path, or mount only `VisualEffects` when needed.
- **Low** | `ScrollReveal.tsx:56–59` — `blur` animation uses `filter: blur()`, which forces paint-layer promotion (not compositor-only like `opacity`/`transform`). Consider an opacity + backdrop-blur background alternative.
- **Low** | `VisualEffects.tsx:79–86` — Static diagnostics array defined inside JSX. Move to module scope as `const ATLAS_DIAGNOSTICS`.
- **Low** | `InteractiveButton.tsx:102–113` — Multi-line conditional template literal for `baseClasses` recomputed every render. Use `cn()`/`clsx`.
- **Low** | `InteractiveButton.tsx:107` — Focus ring hardcoded `ring-orange-500/50` for all variants. Use `focus-visible:ring-[color:var(--color-accent)]` or per-variant tokens.
- **Low** | `ScrollReveal.tsx:66–110` — Dual stagger mechanisms (`staggerIndex`/`staggerDelay` vs `StaggerContainer`) are confusing. Document `StaggerContainer` as preferred.
- **Low** | `Breadcrumbs.tsx:30` — Last item silently ignores `href` (intentional per WCAG, but the type accepts it without warning). Drop `href` from the last-item type or add a dev warning.

---

## Hooks & Libraries

### `useDeviceType.ts`

- **Medium** | Lines 34–43 — Three independent `MediaQueryList` listeners produce separate `setState` calls on a single resize; React 18 may not batch across distinct listener registrations. Use one `"change"` listener; derive `isTablet`/`isDesktop` inside one handler.
- **Low** | Lines 13–19 — SSR default `isDesktop: true` causes a flash of desktop layout on mobile during hydration. Prefer CSS media queries or `next/headers` UA sniffing for layout-critical decisions.
- **Low** | Line 28 — Dead `typeof window` guard inside `useEffect` (which never runs on the server). Delete.

### `useNetworkQuality.ts`

- **Medium** | Lines 90–91 — `dpr` re-read on every network-change event. DPR doesn't change with network conditions. Read once in initial state; exclude from the `"change"` handler (or split into `useDpr`).
- **Medium** | Lines 44–59 — `downlink` field is on the interface but never used for tier selection. A 4G connection could be 1 Mbps or 100 Mbps. Add a `downlink`-based tier in `determineQuality`, falling back to `effectiveType`.
- **Low** | Lines 63–69 — `defaultState.dpr: 1` causes retina display flash. Initialize lazily with `Math.min(window.devicePixelRatio || 1, 3)`.

### `useRecentSearches.ts`

- **Low** | Lines 22–25 — `queueMicrotask` rationale ("avoid cascading render warning under React Compiler") is incorrect; the warning doesn't exist. Call `setRecentCities` and `setIsLoaded` directly inside `useEffect`.
- **Low** | Line 15 — `useMemo` for a 5-element `Set` overshoots the cost/benefit. Either expose only the array or remove the over-justifying comment.

### `http.ts`

- **Critical** | Line 216 — `signal: init.signal ?? AbortSignal.timeout(timeoutMs)` silently bypasses the timeout if a caller passes any signal. Compose:
  ```ts
  signal: init.signal
    ? AbortSignal.any([init.signal, AbortSignal.timeout(timeoutMs)])
    : AbortSignal.timeout(timeoutMs),
  ```
- **High** | Lines 216–217 — Each retry gets a fresh timeout; with `maxRetries=2` and `timeoutMs=8000` the worst-case wall clock is ~30s. Accept an optional `totalDeadlineMs` and compose one outer signal across the retry loop.
- **High** | Lines 264–274 — `AbortError` from intentional unmount cancellation falls into the catch and increments `consecutiveFailures`, opening the breaker for healthy providers. Skip `recordFailure` on AbortError.
- **High** | Lines 202–206 — `{ ...(headers as Record<string, string>) }` silently drops `Headers` instances and array-of-tuples inputs. Use `new Headers(headers)` then `.set()` for added entries.

### `cache.ts`

- **Medium** | Lines 61–63 — `get size()` returns raw `map.size`, including expired-but-unswept entries. Document or add a `validSize(now)` method.
- **Low** | Lines 18–29 — `get` always promotes to MRU. Add a `peek(key, now?)` for telemetry/debug callers that shouldn't affect eviction order.

### `format.ts`

- **Medium** | Line 9 — Inline `/\.0$/` regex re-allocated on every call. Hoist as `const TRAILING_ZERO_RE = /\.0$/`.
- **Medium** | Line 7 — No billions tier — 1.4B renders as "1400.0M". Add `if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1).replace(TRAILING_ZERO_RE, "") + "B";` before the million check.

### `env.ts`

- **Medium** | Lines 70–89 — No runtime guard preventing `serverEnv()` from being called from a client bundle. If a client file ever imports it, secrets leak into the client JS. Either add `if (typeof window !== "undefined") throw ...` at the top, or move `serverEnv`/`requireServerEnv` into an `env.server.ts` with `import "server-only"`.
- **Low** | Lines 59–65 — Validation failure caches `publicCache = {}` for the process lifetime; a later `populateEnv` won't be picked up unless `__resetEnvCache()` is called. Cache `null` instead so the next call retries.

### `validation.ts`

- **High** | Lines 34–37 — `paginationSchema` uses `z.number()` while every other field uses `z.coerce.number()`. URL search params arrive as strings — silent runtime failure anywhere this schema parses query strings. Replace with `z.coerce.number()` in both `page` and `limit`.
- **Low** | Lines 28–30 vs 63–64 — `coordinatesSchema` fields duplicated verbatim in `placeSearchSchema`. Spread `coordinatesSchema.shape` instead.
- **Low** | Lines 28–30, 63–64 — Default Zod messages ("Number must be greater than or equal to -90") aren't UX-friendly. Add custom strings: `.min(-90, "Latitude must be between -90 and 90")`.

---

## API Routes

### `places/search/route.ts`

- **Critical** | Lines 33–38 — `Promise.race` rejects at 25s but the underlying `searchPlaces` keeps running, holding DB connections, memory, and serverless billing. Add abort support through the places service layer (`searchPlaces` → `getTopPlaces` → provider/cache fetches), then use `AbortController` in the route:
  ```ts
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), REQUEST_TIMEOUT_MS);
  try {
    const data = await searchPlaces(parsed.data, { signal: ac.signal });
    clearTimeout(timer);
    // ...
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return NextResponse.json({ error: "Request timed out" }, { status: 504 });
    }
    throw err;
  }
  ```
- **High** | Line 52 — `error.message === "timeout"` magic-string check will misclassify any library error containing "timeout" (e.g., DB connection timeouts) as a 504. Use a `class TimeoutError extends Error {}` sentinel.
- **High** | Lines 40–49 — `Cache-Control: public, s-maxage=300` caches geo-personalized results at the edge. Coordinates are logged at every CDN PoP (privacy concern) and the search itself is personal. Downgrade to `private, max-age=60` when `lat`/`lng` are present.
- **Medium** | Lines 40–49 — No `ETag` for conditional GETs. Hash the response body and honour `If-None-Match` (same pattern as the sphere route).
- **Medium** | Lines 9–23 — Schema caps `limit` at 100, but the route has no independent guard. Add `const safeLimit = Math.min(parsed.data.limit ?? 20, 50)`.

### `analytics/route.ts`

- **Critical** | Lines 16–21 — Content-Length size guard is bypassable via `Transfer-Encoding: chunked`. Read the body via a size-limited stream reader before `.json()`:
  ```ts
  const MAX_BYTES = 64 * 1024;
  const reader = request.body?.getReader();
  let size = 0, chunks: Uint8Array[] = [];
  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    chunks.push(value);
  }
  const body = JSON.parse(new TextDecoder().decode(Buffer.concat(chunks)));
  ```
- **Critical** | Lines 35–44 — `processAnalyticsBatch()` started without `await` is killed when Vercel freezes the invocation after the response sends — silently dropping analytics batches. Use `waitUntil` from `@vercel/functions`.
- **High** | Lines 41–43 — `countryName` is being assigned `x-vercel-ip-country` (an ISO alpha-2 code, not a name) and `x-vercel-ip-country-region` (a sub-region code). Either look up the human name or rename the field to `countryCode`/`regionCode`.
- **Medium** | (Whole file) — No IP-level rate limit. A single attacker can POST 50 events/request indefinitely. Add Vercel edge middleware (e.g. `@upstash/ratelimit` + Redis) or a `429`/`Retry-After` path keyed on `x-forwarded-for`.
- **Medium** | Line 35 — No idempotency key — retries duplicate events. Accept an `idempotencyKey`/`batchId` and dedupe on insert.

### `cities/sphere/route.ts`

- **Medium** | Lines 76–86 — SHA-1 ETag computed *after* data is loaded; `If-None-Match` clients still pay a full DB round-trip before the 304. Cache the ETag alongside data via `unstable_cache` for `population` mode.
- **Medium** | Lines 97–100 — `detail: error instanceof Error ? error.message : "unknown"` leaks raw exception messages (potentially stack traces, table names, credentials). Log server-side; return only a generic code.
- **Low** | Line 83 — `s-maxage=86400` is identical for DB-backed (`population`) and in-memory modes. Use `s-maxage=3600, stale-while-revalidate=86400` for `population`.

### `health/route.ts`

- **Medium** | Lines 5–25 — No timeout on `getHealth()`; a hung Supabase check blocks until the platform's generic 504. Race it against a 3–5s timeout returning 503.
- **Medium** | Lines 1–28 — Unauthenticated endpoint enumerates configured providers and circuit-breaker state — recon gift. Require an auth header for the full report; return only `{ ok: true|false }` to anonymous callers.
- **Low** | Line 21 — Raw `error.message` leaked in the response. Log it; return a generic string.

### `actions.ts`

- **High** | Lines 10–20 — `React.cache()` deduplicates only within a single render pass — every page render still triggers an AI lookup. Wrap with `unstable_cache(..., ["trending-destinations"], { revalidate: 3600, tags: ["trending"] })`.
- **Medium** | Lines 10–20 — No try/catch; a thrown error from `getIntelligentTrendingCities()` or `getTopCities(5)` propagates to the RSC caller. Return a safe empty array or a hardcoded fallback list on failure.
- **Low** | Line 19 — `return await` in a tail position adds a redundant promise wrapper and stack frame. `return getTopCities(5);`.

---

## Analytics Pipeline (Provider, Banner, DB)

- **High** | `AnalyticsProvider.tsx:231–234` — `navigator.sendBeacon` called with `JSON.stringify(...)` sends `text/plain`, not `application/json`. The current route may still parse it, but proxies, logs, and future middleware can treat it incorrectly. Wrap the body in a `Blob` with `type: "application/json"`; consider making `sendEvents` return a success boolean for retry-aware callers.
- **Medium** | `index.ts:3` + `GeoConsentBanner.tsx:4` — `GeoConsentBanner` imports `{ motion, AnimatePresence, useReducedMotion }` from framer-motion and is re-exported from the analytics barrel — so any layout importing `{ AnalyticsProvider, PageTracker }` ships ~50–100 KB gzipped of framer-motion in the initial bundle. The banner is delayed 3s anyway. Lazy-load via `next/dynamic` at the call site, ideally with `ssr: false`.
- **Medium** | `GeoConsentBanner.tsx:55–113` — `role="dialog"` is set but `aria-modal="true"` is missing; focus is not moved into the dialog when it appears; there's no Escape-key handler (WCAG 2.1.2 keyboard-operable). Add `aria-modal`, an autofocus `useEffect`, and an `onKeyDown` Escape handler.
- **Medium** | `AnalyticsProvider.tsx:256–268` — `trackPageView`, `trackAction`, `trackCityView` queue events whenever `shouldTrack()` returns `true`; the only gate is DNT. There's no general analytics opt-in — only a geo-specific banner. Under GDPR/ePrivacy, even pseudonymous session profiling typically requires a legal basis. Either add a cookie-consent gate or document the legal basis (and link it from the banner).
- **Medium** | `AnalyticsProvider.tsx:267` — Full `document.referrer` URL is sent. Referrers can contain query strings with PII (`?email=...`, `?token=...`, `?search=medical+condition`) — violates GDPR data minimisation (Art. 5(1)(c)). Strip to origin: `new URL(document.referrer).origin`.
- **Medium** | `analytics.ts:152–154` — `totalVisits` and `uniqueVisitors` are both `sessions.size`, making the distinction meaningless. Use `totalVisits = events.filter(e => e.type === "pageview").length`; keep `uniqueVisitors = sessions.size` (acknowledge it's per-batch only).
- **Medium** | `AnalyticsProvider.tsx:92–101` — `bcs_visited` is written to `localStorage` for cross-session "returning user" detection — effectively a persistent identifier. Under ePrivacy, this needs the same consent regime as cookies. Either move detection server-side (first-seen `sessionId`) or gate behind consent.
- **Low** | `AnalyticsProvider.tsx:113–126` — `shouldTrack()` re-evaluates `publicEnv()` and `navigator.doNotTrack` on every event call. Compute once in init `useEffect` and store in a ref.
- **Low** | `analytics.ts` (whole file) — `recordDailyVisitorStats`, `recordGeoStats`, etc. upsert indefinitely with no TTL. GDPR Art. 5(1)(e) requires data kept "no longer than necessary". Add a Supabase `pg_cron` purge for rows older than (e.g.) 13 months.
- **Low** | `AnalyticsProvider.tsx:148–165` — `sessionRef.current` is reset to `{ id, startTime: Date.now(), pageCount: 0 }` whenever the `useEffect` re-runs (React 18 strict mode double-invoke, layout-tree-driven remount). Guard with a one-shot ref or compare the new `sessionId` before overwriting `startTime`.
- **Low** | `GeoConsentBanner.tsx:47` — `handleDismiss` doesn't write `GEO_ASKED_KEY`, so the banner re-pesters every returning user who dismissed it. Add `setStorageItem(GEO_ASKED_KEY, "true")`.
- **Low** | `AnalyticsProvider.tsx:245, 249` — Both `beforeunload` and `pagehide` listeners fire on tab close, causing duplicate `session_end` records. `pagehide` fires on both navigation and tab-close — keep only that one.

---

## Top Quick Wins

The highest-impact changes ordered roughly by impact-to-effort:

1. **Fix note-key idempotency** (`experience-helpers.ts:23–45`) — Make `sanitizeKey` idempotent or split raw/sanitized key helpers, then stop re-sanitizing state keys in `toNoteMap`, `sanitizeNotes`, and `parseStoredNotes`. This unbreaks notes persistence and reload.
2. **Fix the Unicode-stripping search input** (`CitySearch.tsx:278`) — Change the regex to allow non-ASCII characters. Immediately unblocks Köln, São Paulo, Łódź, Montréal, etc. — a Critical UX regression for a global app.
3. **Mount `MobileBottomNav` (or delete it)** — Currently dead code with a layout spacer reserved for nothing. Decide and act before polishing nav spacing.
4. **Compose `AbortSignal` with user signal in `http.ts:216`** — 2 lines via `AbortSignal.any`. Closes the silent timeout-bypass when callers pass their own controller.
5. **Skip circuit breaker on AbortError** (`http.ts:264`) — 3 lines. Prevents component unmounts from tripping the breaker on healthy providers.
6. **Replace `Promise.race` timeout with propagated abort support** (`places/search/route.ts`, `places.ts`) — Extend the places service functions to accept an `AbortSignal`, then abort the underlying work when the route times out.
7. **Fix `paginationSchema` to use `z.coerce.number()`** (`validation.ts:35–36`) — 2-character change. Matches every other coercion in the file; prevents silent runtime failure when parsing query strings.
8. **Wrap the analytics fire-and-forget in `waitUntil` or Next `after()`** (`analytics/route.ts:35`) — Stops silent event loss on Vercel/serverless hosts. If using `@vercel/functions`, add it as a dependency first.
9. **Fix the analytics `countryName` field** (`analytics/route.ts:41–43`) — Either look up the human name or rename to `countryCode`/`regionCode`. Every analytics row currently has wrong data.
10. **Fix `ScrollProgress` `aria-valuenow={0}`** — Wire to actual scroll progress with `useMotionValueEvent`. ~10 lines, fixes a permanent screen-reader regression.
11. **Fix the broken skip link** (`globals.css:215–221`) — Replace `transform: translateY(-8px)` with the `position: absolute; left: -9999px` pattern. One selector change, real accessibility regression resolved.
12. **Fix `ThemeToggle` aria-label to be state-aware** — One-line change with significant screen-reader UX impact.
13. **Add `<Suspense>` around `HomeSearchShowcase`** — Move `fetchTrendingDestinations()` into a child async component. Unblocks the hero from painting on every visit.
14. **Add `unstable_cache` to `fetchTrendingDestinations`** (`actions.ts:10`) — Highest-leverage perf change in the audit: eliminates per-render DB and Gemini round-trips.
15. **Fix `sendBeacon` to use a `Blob`** (`AnalyticsProvider.tsx:231`) — One-line change preventing silent analytics loss on page unload.
16. **Strip `document.referrer` to origin** (`AnalyticsProvider.tsx:267`) — One-expression change for GDPR data minimisation; doesn't degrade `parseReferrer`.
17. **Lazy-load `GeoConsentBanner` via `next/dynamic`** — Removes framer-motion from the initial bundle for a banner that doesn't render for 3s anyway.
18. **Delete confirmed dead CSS only** — Remove `landing-hero-shell`, `hero-atmosphere`, `animate-marquee`, `progress-counter`, `chapter-divider`, mobile dead classes, and similar verified-unused rules. Keep `.atlas-panel-strong`, `.organic-blob-inverse`, and `.animate-pulse-glow` because they are used.
19. **Reduce Cormorant Garamond to 2 weights** (`layout.tsx:31`) — Drop `500` and `700`. Saves 2 font requests per page load.
20. **Reduce `ScrollReveal` `y: 40` → `y: 20`** — Two-character change for site-wide motion polish.
21. **Remove `ScrollReveal` from individual `CityRow` items** (`TopCitiesPageContent.tsx:226–234`) — Wrap one container per band; eliminates ~40 IntersectionObserver instances and the "drips in slowly" feel.
22. **Hoist regex + add billions tier in `format.ts`** — Per-call regex allocation eliminated; 1.4B no longer renders as "1400M".
23. **Harden `GeoConsentBanner` accessibility** — Add `aria-modal`, focus management, Escape handling, and record dismissals so the banner does not re-prompt every session.
24. **Strip framer-motion from `ExperiencesSkeleton`** — Lets the skeleton render as a server component with no JS dependency, the way `AIBriefingSkeleton` already does.
25. **Memoize `displayData` in `ExperiencesSection`** (lines 212–221) — One `useMemo`, eliminates the most frequent unnecessary work (note edits, bookmark toggles, expand/collapse).
26. **Add `priority` to the featured card image** (`ExperiencesSection.tsx ~365`) — Direct LCP improvement.
27. **Delete or harden dormant `ConstellationBackground`** — It is not imported today. If it returns, precompute star colors, add visibility pause, and replace RAF layout reads with a `ResizeObserver`.
28. **Restore `ClientEffects` deliberately or remove the path** — `VisualEffects`, `CitySphereBackground`, and `FloralAccent` are currently inactive. Do not tune their runtime performance before deciding whether the effects layer belongs in the product.
29. **Remove permanent `willChange` from `OptimizedImage`** — One-line deletion; lets framer-motion manage layer promotion.
30. **`AnimatePresence` plain `<div>` → `motion.div` if effects return** (`VisualEffects.tsx:43`) — One-line change that fixes the dormant overlay's exit animation before it is re-mounted.
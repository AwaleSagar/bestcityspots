# BestCitySpots Frontend Performance & UX Audit Report

> **Date:** 2025-05-03
> **Scope:** 77 files, 12,549 lines (full frontend)
> **Focus:** Performance, UX polish, CSS optimization, modern 2025 design patterns
> **Auditor:** Claude Code (claude-sonnet-4-6) via Hermes phased audit

---

## 1. Executive Summary

| Metric | Value |
|---|---|
| **Overall Health Score** | 54 / 100 |
| **Critical Issues** | 8 |
| **High Severity** | 28 |
| **Medium Severity** | 42 |
| **Low Severity** | 28 |
| **Total Findings** | 106 |

**Health score rationale:** The codebase has a solid architectural foundation (server components, streaming, Zod validation, circuit breakers) but is undermined by several critical data-loss bugs, a ~26% dead-CSS payload, accessibility regressions, and pervasive render-path inefficiencies that together degrade real-user performance and reliability.

### Top 3 Critical Areas

1. **Data integrity bugs** — `toNoteMap` double-sanitization destroys notes on every keystroke; `http.ts` drops caller-provided `AbortSignal` timeout silently; analytics dequeues events before send confirmation.
2. **Accessibility failures** — Broken skip-link, permanently-zero `aria-valuenow` on scroll progress bar, unfocused/untrapped dialogs, 8px text labels, and missing `prefers-color-scheme` CSS baseline all represent real WCAG regressions.
3. **Animation & render performance** — `Math.random()` in a 60fps canvas draw loop causes strobing; `canvas.offsetWidth` forces layout reflow every frame; 170+ simultaneously-animated DOM nodes; ~50 individual `IntersectionObserver` instances on a single list page.

### Estimated Improvement Potential

| Area | Current | After Fixes |
|---|---|---|
| `globals.css` payload | 919 lines | ~15 lines (imports) + ~650 lines across modules |
| Dead CSS removed | ~240 lines wasted | 0 |
| LCP (home page) | Blocked on data fetch | Streams immediately via `<Suspense>` |
| Analytics data loss on unload | ~5–15% events lost | Near-zero with `waitUntil` + correct drain |
| IntersectionObserver instances (Top Cities) | ~50 | ~3 |
| Consent banner UX | Re-appears on every dismiss | Persists dismissal correctly |

---

## 2. Critical Issues

| # | Severity | File | Line(s) | Issue | Impact | Fix |
|---|---|---|---|---|---|---|
| C1 | **CRITICAL** | `src/styles/globals.css` | 215–221 | `.skip-link` uses `translateY(-8px)` — remains visible, defeats purpose | Screen reader users cannot skip navigation; keyboard trap risk | Replace with `position:absolute; left:-9999px` / `focus-visible` reveal pattern |
| C2 | **CRITICAL** | `src/lib/experience-helpers.ts` | 23–31 | `toNoteMap` calls `sanitizeKey` on already-sanitized keys, producing `k_k_abc` — notes textarea resets to `""` on every keystroke | Notes feature is completely broken for all users | Remove `sanitizeKey` call inside `toNoteMap`; keys entering state are pre-sanitized |
| C3 | **CRITICAL** | `src/components/features/city/ConstellationBackground.tsx` | 51–53, 339 | `Math.random()` called inside RAF draw loop (60fps) — star colors strobe every frame | Severe visual bug: rapid color flickering across all stars | Pre-compute `colorIndex` in `generateStars`; read from star object in draw loop |
| C4 | **CRITICAL** | `src/lib/http.ts` | 216 | User-supplied `AbortSignal` completely bypasses `timeoutMs` guard | Runaway fetches with caller-provided signals hang indefinitely, hold connections | Use `AbortSignal.any([init.signal, AbortSignal.timeout(timeoutMs)])` |
| C5 | **CRITICAL** | `src/app/api/analytics/route.ts` | 16–21 | `Content-Length` guard bypassable via chunked transfer encoding | Attacker can stream arbitrarily large body; forces unbounded `request.json()` parse | Read body with a size-limited stream reader before parsing |
| C6 | **CRITICAL** | `src/app/api/analytics/route.ts` | 35–44 | Fire-and-forget `processAnalyticsBatch()` — Vercel freezes invocation on response send | Analytics batches silently dropped on every page navigation | Use `waitUntil(processAnalyticsBatch(...))` from `@vercel/functions` |
| C7 | **CRITICAL** | `src/app/api/places/search/route.ts` | 33–38 | `Promise.race` timeout leaks the underlying `searchPlaces` request | Holds DB connection + memory after caller times out; connection pool exhaustion under load | Replace with `AbortController`; pass `signal` into `searchPlaces` |
| C8 | **CRITICAL** | `src/lib/http.ts` | 202–206 | Unsafe `headers` cast silently drops `Headers` instance and array-of-tuples inputs | Custom request headers lost; auth tokens, content-type overrides silently ignored | Use `new Headers(headers)` then `.set()` for injected headers |

---

## 3. High Severity Issues

| # | Severity | File | Line(s) | Issue | Impact | Fix |
|---|---|---|---|---|---|---|
| H1 | High | `src/styles/globals.css` | 7–88 | No `prefers-color-scheme` CSS baseline — FOIT on OS dark mode | Flash of wrong theme until JS hydrates | Add `@media (prefers-color-scheme: dark) { :root:not(.light) { ... } }` alongside `.dark` class |
| H2 | High | `src/styles/globals.css` | Entire file | No `prefers-contrast: more` handling; `--color-muted` ~4.2:1 contrast (below 4.5:1 AA) | Fails WCAG AA for small text in `.editorial-kicker`, `.eyebrow`, `.atlas-chip` | Add `@media (prefers-contrast: more)` block; nudge `--color-muted` to `oklch(0.50 0.018 42)` |
| H3 | High | `src/styles/globals.css` | 141–146 | `scroll-behavior: smooth` not gated on `prefers-reduced-motion` | Vestibular disorder users get forced scrolling animations | Move inside `@media (prefers-reduced-motion: no-preference)` |
| H4 | High | `src/styles/globals.css` | 411–415, 727–731, 782–786 | `box-shadow` in CSS `transition` — CPU paint on every animation frame (3 instances) | Janky hover on mid-range Android; triggers compositor-to-CPU round-trip | Use `::after` + `opacity` trick or `filter: drop-shadow()` |
| H5 | High | `src/styles/globals.css` | 284–332 + 8 other blocks | ~240 lines of confirmed dead CSS (`landing-hero-shell`, unused badges, `animate-marquee`, `progress-counter`, etc.) | Wasted ~26% of file download on every page load | Delete all confirmed dead selectors (detailed in Phase 0 findings) |
| H6 | High | `src/app/layout.tsx` | 23–38 | 3 font families, 7 weights loaded (non-variable) — up to 7 separate font file requests | Blocks text rendering; adds ~150–250KB font payload | Reduce Cormorant Garamond to `["400","600"]`, IBM Plex Mono to `["400"]` |
| H7 | High | `src/app/page.tsx` | 14 | Entire home page blocked on `fetchTrendingDestinations()` with no `<Suspense>` | FCP gated on slowest data fetch; blank screen for users on slow connections | Wrap data-fetching sections in `<Suspense>` with skeleton fallbacks |
| H8 | High | `src/components/layout/ThemeToggle.tsx` | 28 | Touch target 36×36px (WCAG minimum 44×44px) | Fails WCAG 2.5.5; misses taps on mobile, especially for users with motor impairments | Change to `h-11 w-11` or add `min-h-[44px] min-w-[44px]` wrapper |
| H9 | High | `src/components/layout/SiteNav.tsx` | 31–38 | Nav links ~30px tall, logo link 36px — both below 44px touch target | Same WCAG 2.5.5 failure; critical on the primary navigation | Increase to `py-3` or add `min-h-[44px] flex items-center` |
| H10 | High | `src/components/layout/MobileBottomNav.tsx` | Entire file | Component never imported anywhere — dead code; SiteFooter reserves spacer for it | Mobile users have no bottom navigation; spacer adds blank space for nothing | Import into `layout.tsx` above `</body>` or delete component + remove spacer |
| H11 | High | `src/components/features/city/ExperiencesSection.tsx` | 333–584 | `renderCard` is a 250-line inline function — no memoization, all cards re-render on every state change | Every note edit, bookmark toggle, tab switch re-renders all visible cards + re-triggers framer-motion entries | Extract `<ExperienceCard>` component + `React.memo`; `useCallback` for handlers |
| H12 | High | `src/components/features/city/ExperiencesSection.tsx` | 211–221 | `rawData`/`filteredData`/`displayData` computed inline without `useMemo` | `topK` reruns on every unrelated state change (saves, note edits, expands) | Wrap in `useMemo` keyed on `[activeTab, selectedPrice, landmarks, restaurants, hotels]` |
| H13 | High | `src/components/features/city/ExperiencesSection.tsx` | 244 | `placeNotesMap = toNoteMap(placeNotes)` computed every render, no `useMemo` | New `Map` allocated on every render including unrelated tab switches | `useMemo(() => toNoteMap(placeNotes), [placeNotes])` |
| H14 | High | `src/components/features/city/page.tsx` | 189 | `getCityWeather` awaited synchronously, blocking entire page shell from streaming | Nothing renders until weather API resolves; weather visible in only 3 spots | Move into `<WeatherSection>` async component wrapped in `<Suspense>` |
| H15 | High | `src/components/features/city/ExperiencesSkeleton.tsx` | 1–3 | Skeleton imports `framer-motion` — JS must load before fallback renders | Defeats the purpose of the `<Suspense>` fallback; slow initial load | Replace `motion.*` with pure CSS keyframe animations; render as server component |
| H16 | High | `src/components/core/CitySearch.tsx` | 278 | Input sanitization strips all non-ASCII — `Köln`, `São Paulo`, `Łódź`, `Montréal` untypeable | Breaks international city search for majority of the world's cities | Replace regex with `/[<>{}\[\]\\]/g` or remove entirely; backend sanitizes |
| H17 | High | `src/components/core/CitySearch.tsx` | 477–562 | `motion.li layout` animates on every keyboard/hover event — full FLIP measurement pass on 10 items per interaction | ~10 DOM measurements per keypress; janky autocomplete on any device | Remove `layout` prop from `motion.li`; entrance animations don't need layout |
| H18 | High | `src/components/core/CitySearch.tsx` | 491 | `onMouseEnter` overrides keyboard `activeIndex` on mouse movement | Keyboard navigation silently reset by any cursor drift; fails users relying on keyboard | Track last interaction device via ref; only honor `onMouseEnter` when `"mouse"` |
| H19 | High | `src/components/core/CitySphereBackground.tsx` | 32–43, 379–390 | ~170 simultaneously animated DOM nodes (120 sphere nodes + 50 particles + ping/pulse combos) | Likely drops to sub-30fps on mid-range phones; burns battery | Migrate sphere to `<canvas>`; or reduce `MAX_CITIES` to 60, `PARTICLE_COUNT` to 20 |
| H20 | High | `src/components/core/ConstellationBackground.tsx` | 265–368 | No `IntersectionObserver` — RAF runs at 60fps even when off-screen | Constant CPU/GPU burn on all pages where constellation scrolls out of view | Mirror `CitySphereBackground`'s IntersectionObserver + `isVisible` guard pattern |
| H21 | High | `src/components/core/ConstellationBackground.tsx` | 271–280 | `canvas.offsetWidth`/`offsetHeight` read inside RAF — forced layout reflow every frame | Guarantees synchronous layout recalc at 60fps; major performance regression | Replace with `ResizeObserver` writing to a `dimRef`; read ref inside RAF |
| H22 | High | `src/components/core/ConstellationBackground.tsx` | 326–329 | `ctx.createRadialGradient()` allocated per star per frame (80× at 60fps = 4,800/s) | Massive GC pressure; GPU gradient allocation overhead | Replace with `ctx.arc` + low-alpha fill or pre-drawn sprite stamp |
| H23 | High | `src/components/ui/CityVitals.tsx` | 48, 57, 64, 73, 78 | `text-[8px]` and `text-[9px]` labels — below any legibility standard | Fails WCAG 1.4.4; unreadable on any display; user trust damage | Minimum `text-[11px]` for category labels; `text-xs` (12px) for timestamps |
| H24 | High | `src/components/ui/VisualEffects.tsx` | 43–99 | `AnimatePresence` wraps a plain `<div>` — exit animations never fire | Dialog "snaps" away instead of animating out; broken UX | Change outer `<div>` to `<motion.div initial/animate/exit>` |
| H25 | High | `src/components/ui/VisualEffects.tsx` | 47–98 | `role="dialog"` with no focus trap or focus management | Keyboard users tab through all page content behind the modal — WCAG 2.1 Level A failure | Add `focus-trap-react` or `@radix-ui/react-dialog`; move focus on open |
| H26 | High | `src/components/ui/InteractiveButton.tsx` | 178–185 | Link variant renders `<motion.div><Link>` — block wrapper breaks inline layout and ARIA | Extra DOM node; screen readers announce spurious container; inline layout breaks | Use `const MotionLink = motion(Link)` directly |
| H27 | High | `src/lib/http.ts` | 216–217 | Timeout resets on every retry — worst-case total wait `3 × 8s + backoff ≈ 30s` | No wall-clock budget enforcement; callers cannot set a deadline | Accept optional `totalDeadlineMs`; compose outer `AbortSignal.timeout` across all retries |
| H28 | High | `src/lib/http.ts` | 264–274 | `AbortError` from component unmount trips circuit breaker | 5 cancelled requests mark healthy provider as failed; opens circuit for legitimate traffic | Check `err.name === "AbortError"` before calling `recordFailure(provider)` |

---

## 4. Medium Severity Issues

| # | Severity | File | Line(s) | Issue | Impact | Fix |
|---|---|---|---|---|---|---|
| M1 | Medium | `src/styles/globals.css` | 225–232 | `backdrop-filter` on `.glass` without `contain` hint | Unnecessary compositor texture copies | Add `contain: layout style` to glass elements |
| M2 | Medium | `src/styles/globals.css` | 190–197 | Expensive `:not()` chain on every `<a>` (5-level substring matching) | Style recalc cost on every DOM update | Invert: use explicit `.link` class; remove `:not` chain |
| M3 | Medium | `src/styles/globals.css` | 579–622 | Badge base properties duplicated 4× verbatim | Maintenance burden; divergence risk | Extract `.badge` base class; variants override only color/background |
| M4 | Medium | `src/styles/globals.css` | 209–213 | `focus-visible` outline uses 60% opacity — may fail 3:1 non-text contrast | Focus invisible on certain backgrounds; accessibility failure | Use fully opaque `outline: 2px solid var(--color-accent)` as base |
| M5 | Medium | `src/styles/globals.css` | 835–840 | Blanket `*` override in `prefers-reduced-motion` too broad — affects third-party widgets | Unexpected animation kills in injected content | Scope to `@layer utilities` or `:where(*, *::before, *::after)` |
| M6 | Medium | `src/styles/globals.css` | 176–184 | `h6` missing from heading font-family/line-height rule | `h6` inherits wrong font | Add `h6` to the selector list |
| M7 | Medium | `src/app/layout.tsx` | 136–143 | Two separate `application/ld+json` scripts — non-standard; second may be ignored by parsers | Structured data may be partially invisible to Google | Merge into single `@graph` array |
| M8 | Medium | `src/app/layout.tsx` | 17–20 | `themeColor` meta reflects OS preference, not user-chosen theme | Browser chrome color wrong after user toggles theme | Add `<ThemeColorMeta />` client component that updates on theme change |
| M9 | Medium | `src/app/layout.tsx` | 155–159 | Skip link `position:fixed` + safe-area inset `margin` double-offsets on notched devices | Skip link mispositioned on iPhone/Android notch devices | Remove inline margin; use `top: calc(0.75rem + env(safe-area-inset-top, 0px))` |
| M10 | Medium | `src/components/layout/ThemeToggle.tsx` | 29 | `aria-label="Toggle theme"` — static, context-free | Screen reader users don't know current state or what will change | `aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}` |
| M11 | Medium | `src/components/layout/SiteNav.tsx` | 31–38 | No active link state on desktop nav | Keyboard/cognitive users can't tell current page | Extract `<NavLink>` client component with `usePathname()` + `aria-current="page"` |
| M12 | Medium | `src/components/layout/SiteNav.tsx` + `MobileBottomNav.tsx` | various | Route list defined independently in two files | Adding a route requires editing two files; divergence risk | Move to shared `src/config/nav.ts` |
| M13 | Medium | `src/components/features/city/AIBriefingClient.tsx` | 57–65 | `mergedSeasons` recomputed on every render (`.find()` per season) | Unnecessary work on every re-render | Wrap in `useMemo(() => ..., [insight])` |
| M14 | Medium | `src/components/features/city/AIBriefingClient.tsx` | 18–54 | `getSeasonColor` pure function defined inside component, recreated every render | Unnecessary function allocation | Move to module scope |
| M15 | Medium | `src/components/features/city/ExperiencesSection.tsx` + `AIBriefingClient.tsx` | various | Duplicate tab-switcher UI (~80 lines) in two components | Maintenance duplication; divergence risk | Extract shared `<TabSwitcher>` component |
| M16 | Medium | `src/components/features/city/AIBriefingSection.tsx` | 12–14 | Silent `null` return on missing AI insight — no error/empty state | Section vanishes after "Generating..." skeleton, confusing users | Return a styled fallback message element |
| M17 | Medium | `src/components/features/city/ExperiencesSection.tsx` | 480–494 | Save button uses hardcoded orange classes instead of `catColor.save` | Wrong color for non-landmarks categories | Replace with `catColor.save` and `catColor.saveHover` |
| M18 | Medium | `src/components/features/city/ExperiencesSection.tsx` | 205–209 | Three no-op local variable aliases to hoisted constants (`tabs`, `priceLevelLabels`, `priceLevels`) | Code noise | Delete; reference module-scope constants directly |
| M19 | Medium | `src/components/features/city/page.tsx` | 201–210 | `<Breadcrumbs>` + manual back-nav `<nav>` rendered side-by-side — duplicate navigation affordance | Confusing; redundant DOM | Choose one pattern; remove the other |
| M20 | Medium | `src/components/features/city/ExperiencesSection.tsx` | 361–371 | Featured card image missing `priority` flag | LCP image not preloaded; measurable LCP regression | Add `priority={isFeatured}` to `<OptimizedImage>` for `index === 0` |
| M21 | Medium | `src/components/core/CitySearch.tsx` | 564–573 | `role="status"` child inside `role="listbox"` — ARIA constraint violation | Screen readers misbehave with invalid ARIA tree | Remove `role="status"`; keep `aria-live="polite"` or render empty state outside `<ul>` |
| M22 | Medium | `src/components/core/CitySearch.tsx` | 235 | Hardcoded `resultsListId` breaks multiple instances (duplicate IDs) | `aria-controls` pointing to duplicate ID is undefined behavior in AT | Use `useId()` hook to generate unique ID per instance |
| M23 | Medium | `src/components/core/CitySearch.tsx` | 172 | `const highlightMatch = highlightMatchFn` — redundant alias recreated every render | Code noise | Delete alias; use `highlightMatchFn` directly |
| M24 | Medium | `src/components/core/CitySphereBackground.tsx` | 144–148 | `backfaceVisibility: hidden` as inline style on 120 nodes — 120 new object allocations per re-render | GC pressure; bypasses CSS class caching | Move to CSS class or Tailwind arbitrary utility |
| M25 | Medium | `src/components/core/CitySphereBackground.tsx` | 278–306 | Stale active indices not cleared when sphere leaves viewport | Accumulated stale state; visual glitch on re-enter | Add `setActiveIndices([])` inside `if (!isVisible) return` |
| M26 | Medium | `src/components/core/ConstellationBackground.tsx` | 277–280 | `ctx.scale(dpr, dpr)` stacks on repeated resize if `canvas.width` doesn't change | Distorted canvas on display change | Replace with idempotent `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)` |
| M27 | Medium | `src/components/core/ConstellationBackground.tsx` | 348–356 | `ctx.font` set per-star; `ctx.shadowBlur` toggled every labeled star | Canvas state thrashing; slow compositing | Set `ctx.font` once before loop; batch shadowed draws in a separate pass |
| M28 | Medium | `src/components/core/ConstellationBackground.tsx` | 353 | `star.label.toUpperCase()` computed every frame | String allocation at 60fps | Pre-uppercase labels in `generateStars` |
| M29 | Medium | `src/components/core/ConstellationBackground.tsx` + `CitySphereBackground.tsx` | various | Both components independently fetch `/api/cities/sphere` — no deduplication | Two API calls for the same data on pages with both | Lift fetch to shared context or use SWR/React Query with shared cache key |
| M30 | Medium | `src/components/ui/OptimizedImage.tsx` | 64–84 | No cache for `blurhashToDataURL` — canvas allocated per mount for same hash | Redundant decode work for reused blur hashes | Add module-scope `Map<string, string>` cache; check before decoding |
| M31 | Medium | `src/components/ui/CityVitals.tsx` | 9–39 | `getAqiColor`, `getTempColor`, `getTempIconColor` defined inside component — recreated every render | Unnecessary function allocation | Move to module scope |
| M32 | Medium | `src/components/ui/CityVitals.tsx` | 10–22 | `bg-emerald-500/8` may not be recognized by all Tailwind toolchain versions | AQI badge potentially transparent (silent purge) | Use `/10` or define `/8` in `tailwind.config` `extend.opacity` |
| M33 | Medium | `src/components/ui/Hotspot.tsx` | 102–110 | Hover + toggle state conflict — touch tap opens and immediately closes tooltip | Broken mobile tooltip behavior | Separate pointer vs. touch interaction modes |
| M34 | Medium | `src/components/ui/Hotspot.tsx` | 111, 142 | Mixed `aria-expanded` (dialog) + `role="tooltip"` patterns | Screen readers don't associate content with trigger | Use `aria-describedby={tooltipId}` on trigger; `id` on tooltip |
| M35 | Medium | `src/components/ui/Hotspot.tsx` | various | No click-outside handler | Tooltip stays open when user clicks elsewhere | Add `useEffect` document `mousedown` listener |
| M36 | Medium | `src/components/ui/Hotspot.tsx` | 147–174 | Tooltip `position: absolute` — clipped by `overflow: hidden` ancestors | Tooltips cut off inside cards | Render via `createPortal` with `getBoundingClientRect` positioning |
| M37 | Medium | `src/components/ui/InteractiveButton.tsx` | 74–93 | `setTimeout` for ripple not cancelled on unmount | `setState` called on unmounted component | Store timeout ID in ref; clear in `useEffect` cleanup |
| M38 | Medium | `src/components/ui/ScrollReveal.tsx` | 152–159 | `StaggerContainer` silently skips animation for single (non-array) children | Animation dropped without warning | Use `React.Children.map` instead of `Array.isArray` check |
| M39 | Medium | `src/components/ui/VisualEffects.tsx` | 15–28 | Global keydown Easter egg fires inside `<input>` and `<textarea>` | Normal form typing accumulates in the Easter egg buffer | Add guard: `if (target.closest('input,textarea,[contenteditable]')) return` |
| M40 | Medium | `src/components/ui/Breadcrumbs.tsx` | 17–26 | `<Link aria-label="Home">` + `<span className="sr-only">Home</span>` — double announcement | Screen readers announce "Home Home" | Remove `sr-only` span; `aria-label` is sufficient |
| M41 | Medium | `src/components/sections/HeroHeader.tsx` | 15–22 | Hero entry animation starts at `opacity:0, y:12` — blank screen during hydration; contributes to CLS | FCP delayed; LCP element masked | Use CSS `@keyframes` for entry animation; no JS required |
| M42 | Medium | `src/components/sections/ScrollReveal.tsx` | 83 | `useReducedMotion()` called per instance — ~30+ subscriptions per page | Redundant media query listeners | Create `MotionPreferencesProvider` context; call `useReducedMotion()` once at root |

---

## 5. Low Severity Issues

| # | Severity | File | Line(s) | Issue | Fix |
|---|---|---|---|---|---|
| L1 | Low | `src/styles/globals.css` | 231–232 | `-webkit-backdrop-filter` vendor prefix unnecessary (Safari 15.4+ 2022) | Remove both occurrences |
| L2 | Low | `src/styles/globals.css` | 557–558 | `.lede` font-size hand-rolled clamp breaks token system | Replace with `var(--text-fluid-lg)` |
| L3 | Low | `src/styles/globals.css` | 85–86 | `--radius-organic-inverse` token used only by dead `.organic-blob-inverse` | Delete token and class together |
| L4 | Low | `src/styles/globals.css` | 638–642 | Button `transition` lists `ease` explicitly — it is the default | Drop `ease` keyword from all 4 transition declarations |
| L5 | Low | `src/styles/globals.css` | 810–812 | `animate-pulse-glow` missing `will-change` hint | Add `will-change: opacity, transform` |
| L6 | Low | `src/styles/globals.css` | 142 | `-webkit-text-size-adjust: 100%` blocks user scaling on WebKit | Remove; unprefixed version on line 143 is sufficient |
| L7 | Low | `src/app/layout.tsx` | 163–165 | Redundant nested flex wrapper adds DOM depth with no layout effect | Flatten; apply `flex-1` directly or use `mt-auto` on footer |
| L8 | Low | `src/components/layout/SiteFooter.tsx` | 76 | `new Date().getFullYear()` freezes at build time under ISR caching | Accept, use client component for year span, or set `revalidate` on pages |
| L9 | Low | `src/components/layout/SiteNav.tsx` | 13 | `backdrop-blur-lg` vs `backdrop-blur-md` on `MobileBottomNav` — visible inconsistency | Standardize to `backdrop-blur-md` (less GPU-intensive) |
| L10 | Low | `src/app/page.tsx` | 17 | Redundant `min-h-screen` on `<main>` — root layout already sets it | Remove |
| L11 | Low | `src/components/features/city/AIBriefingClient.tsx` | 68–72 | `tabs` array with no dynamic values recreated every render | Hoist to module scope |
| L12 | Low | `src/components/features/city/AIBriefingClient.tsx` | 141–283 | Identical `initial/animate/exit/transition` props across 3 tab panels | Extract shared `tabVariants` object |
| L13 | Low | `src/components/features/city/AIBriefingSkeleton.tsx` | 11 | "Generating..." text misleading when content is served from cache | Change to "Loading briefing..." |
| L14 | Low | `src/components/features/city/page.tsx` | 43–50 | `CoreMetricsSkeleton` height `h-[120px]` doesn't match actual `MetricCard` height (~160–180px) | Fix height to match; eliminates CLS on sidebar load |
| L15 | Low | `src/lib/experience-helpers.ts` | 139–175 | `topK` heap sort over-engineered for arrays of ≤20 items | Replace with `.sort().slice(0, 5)` for readability |
| L16 | Low | `src/components/core/CitySearch.tsx` | 73–81 | `new Date()` constructed every render to compute `timeOfDay` | Wrap in `useMemo(() => ..., [])` |
| L17 | Low | `src/components/core/CitySphereBackground.tsx` | 404–419 | `key={i}` index keys on sphere nodes | Use `key={labels[i] ?? i}` |
| L18 | Low | `src/components/ui/OptimizedImage.tsx` | 219–222 | Permanent `willChange: "transform, opacity"` after animation completes; retains GPU layer forever | Remove; Framer Motion manages `will-change` automatically |
| L19 | Low | `src/components/ui/OptimizedImage.tsx` | 167 | `generateSizes(width)` not memoized | `useMemo(() => generateSizes(width), [width])` |
| L20 | Low | `src/components/ui/Hotspot.tsx` | 118–133 | Infinite pulse animation per mounted Hotspot, even when closed | Animate only on hover (`whileHover`) or use CSS animation |
| L21 | Low | `src/components/ui/FloralAccent.tsx` + `ClientEffects.tsx` | 8–10 | `FloralAccent` returns `null` but triggers a dynamic import + JS chunk | Delete file; remove import from `ClientEffects` |
| L22 | Low | `src/components/ui/ScrollReveal.tsx` | 56–59 | `blur` variant uses CSS `filter` — not compositor-only; forces paint layer | Use `opacity` + structural backdrop-blur alternative |
| L23 | Low | `src/components/ui/ScrollReveal.tsx` | 66–110 | Two stagger mechanisms (`staggerIndex`/`staggerDelay` vs `StaggerContainer`) create confusing API | Document that `StaggerContainer` is preferred; deprecate manual index |
| L24 | Low | `src/components/ui/InteractiveButton.tsx` | 107 | Focus ring hardcoded to `ring-orange-500/50` for all variants | Use `focus-visible:ring-[color:var(--color-accent)]` or per-variant token |
| L25 | Low | `src/components/ui/Breadcrumbs.tsx` | 30 | Last item silently ignores `href` prop (correct behavior, undocumented) | Add dev-mode warning or adjust type for final item |
| L26 | Low | `src/components/ui/VisualEffects.tsx` | 79–86 | Static diagnostics array defined inside JSX expression | Move to module scope as `const ATLAS_DIAGNOSTICS` |
| L27 | Low | `src/hooks/useDeviceType.ts` | 28 | Dead `typeof window` guard inside `useEffect` | Delete unreachable guard |
| L28 | Low | `src/hooks/useDeviceType.ts` | 13–19 | SSR default `isDesktop: true` causes layout shift on mobile | Use CSS media queries or RSC user-agent sniffing for initial paint |

---

## 6. CSS Splitting Plan

Current `globals.css` is 919 lines serving as a monolithic stylesheet. After dead code removal (~240 lines) and splitting, the file should be ~15 lines of imports only.

| New File | Source Lines | Content | Priority |
|---|---|---|---|
| `src/styles/tokens.css` | 5–137 | Design tokens (`:root`, `.dark`) — theme variables, typography scale, spacing, radii | **P0** — imported by everything; isolates theming |
| `src/styles/base.css` | 139–221 | HTML/body reset, heading defaults, focus-visible, skip-link fix | **P0** — pure base layer, no component coupling |
| `src/styles/animations.css` | 797–851 | `@keyframes`, animate utility classes, `prefers-reduced-motion` block | **P0** — centralizes all motion; easy to audit/disable site-wide |
| `src/styles/glass.module.css` | 223–280 | `.glass`, `.glass-dropdown`, `.liquid-glass` (after dead code removal) | **P1** — used by CitySearch + ExperiencesSkeleton; self-contained visual system |
| `src/components/sections/hero.module.css` | 283–453 | Organic section/panel/blob, flow-grid, intent-card, destination-story-card, terrain-lines, container query | **P1** — all landing-page section components |
| `src/components/ui/typography.module.css` | 474–577 | Editorial kicker, eyebrow, atlas-chip, page-title, lede, labelled-rule | **P1** — typography utilities for About + Top Cities pages |
| `src/components/ui/cards.module.css` | 454–473 | `.atlas-frame`, `.atlas-panel` (after removing dead `.atlas-panel-strong`) | **P2** — generic card surfaces used across pages |
| `src/components/ui/badges.module.css` | 579–622 | All badge variants + new `.badge` base class | **P2** — isolated badge system; easy to extend |
| `src/components/ui/buttons.module.css` | 624–665 | `.btn-primary`, `.btn-secondary` | **P2** — button system used globally |
| `src/components/layout/nav.module.css` | 667–690 | `.nav-pill`, `.touch-target`, `.container-gutter` | **P2** — layout/navigation utilities |
| `src/components/features/city/search.module.css` | 692–766 | `.custom-scrollbar`, `.search-shell`, `.search-shell-glow` (dead code removed) | **P3** — search feature isolation |
| `src/styles/mobile.css` | 853–919 | Mobile overrides after dead code removal (~15 lines remain) | **P3** — viewport-specific overrides |

**Target `globals.css` after split:**
```css
@import "tailwindcss";
@variant dark (&:where(.dark, .dark *));

@import "./styles/tokens.css";
@import "./styles/base.css";
@import "./styles/animations.css";
```
All component-scoped CSS moves to co-located `.module.css` files.

---

## 7. Architecture Recommendations

### AR1 — Adopt React Server Components fully for static content
`TestimonialsSection`, `TrustIndicators`, `FreeResourceCTA`, `AboutPageContent`, and `TopCitiesPageContent` are all `"use client"` solely because `ScrollReveal` uses `useInView`. Extract a tiny `<AnimatedSection>` client wrapper that accepts `children`. Static content renders on the server and streams instantly; motion hydrates lazily. Eliminates the full JS bundle overhead for entirely-static page content.

### AR2 — Centralize motion preferences at the provider level
`useReducedMotion()` is called in ~30+ components. Create a `<MotionPreferencesProvider>` at the root that calls it once and exposes `prefersReducedMotion` via context. Replace all call sites with `useContext(MotionPreferencesContext)`. Also centralizes the `scroll-behavior: smooth` gate and ensures consistent behavior across all components.

### AR3 — Move trending destinations to `unstable_cache`
`React.cache()` in `actions.ts` only deduplicates within one RSC render pass. Wrapping `fetchTrendingDestinations` with `unstable_cache(fn, ["trending"], { revalidate: 3600 })` eliminates a DB + potential Gemini round-trip on every page render for every unique visitor. Highest-leverage backend performance change in the codebase.

### AR4 — Extract a shared `PageShell` component
`AboutPageContent` and `TopCitiesPageContent` share identical outer structure: `<ScrollProgress>`, safe-area-padded container, and the same back-nav breadcrumb (~80 lines duplicated). Extract to `<PageShell backHref="/" backLabel="Back to explorer">`. Any future page with the same shell gets it for free.

### AR5 — Migrate sphere background to Canvas
`CitySphereBackground` renders 170+ simultaneously-animated DOM nodes. Migrating to `<canvas>` with `fillText` for city labels and requestAnimationFrame-driven positions would reduce the compositor layer count from ~170 to 1. The pattern is already established by `ConstellationBackground`. This is the single highest-impact animation performance change available.

### AR6 — Implement request deduplication for shared API calls
`CitySphereBackground` and `ConstellationBackground` both fetch `/api/cities/sphere` independently on mount. Use SWR or React Query with a shared cache key, or lift the fetch to a shared context. For a page with both components, this halves the API calls.

### AR7 — Establish a GDPR/consent boundary
The analytics pipeline tracks session data, referrers, and city views without a general consent gate — only a geo-specific opt-in and a DNT check. Separate tracked from untracked paths more explicitly: `shouldTrack()` should check a stored consent decision. `document.referrer` should be truncated to origin before queuing. `isNewVisitor` detection (via `localStorage`) requires the same consent gate as other tracking under ePrivacy.

### AR8 — Add a total-deadline to HTTP retry logic
`http.ts` gives each retry attempt its own fresh timeout, so worst-case total wait is `retries × timeoutMs + backoff`. Add an optional `totalDeadlineMs` parameter; compose a single outer `AbortSignal.timeout(totalDeadlineMs)` across all retry iterations using `AbortSignal.any`. This is the foundational network reliability pattern the rest of the app depends on.

---

## 8. Top 10 Quick Wins

Ranked by effort-to-value ratio (highest value, lowest effort first):

| # | File(s) | Change | Expected Impact | Effort |
|---|---|---|---|---|
| **1** | `src/lib/experience-helpers.ts:27` | Remove `sanitizeKey()` call inside `toNoteMap` — change `map.set(sanitizeKey(key), value)` to `map.set(key, value)` | **Critical bug fix** — notes textarea stops resetting on every keystroke; note persistence restored for all users | S |
| **2** | `src/styles/globals.css:215–221` | Replace broken skip-link with `position:absolute; left:-9999px` / `:focus-visible` reveal pattern | **Accessibility regression fixed** — skip-link actually works for keyboard/AT users | S |
| **3** | `src/components/core/ConstellationBackground.tsx:51–53,339` | Pre-compute `colorIndex` in `generateStars`; read from star object in draw loop instead of calling `Math.random()` | **Critical visual bug fixed** — stars stop strobing; eliminates 4,800 `Math.random()` calls/s | S |
| **4** | `src/lib/http.ts:216` | Change `init.signal ?? AbortSignal.timeout(timeoutMs)` to `AbortSignal.any([init.signal, AbortSignal.timeout(timeoutMs)])` | **Critical infrastructure fix** — all fetch calls respect timeout regardless of caller-provided signal | S |
| **5** | `src/components/analytics/AnalyticsProvider.tsx:231` | Wrap `sendBeacon` payload in `new Blob([...], { type: "application/json" })` | **Prevents silent analytics loss** on every page unload in environments that check Content-Type | S |
| **6** | `src/components/analytics/GeoConsentBanner.tsx:47` | Add `setStorageItem(GEO_ASKED_KEY, "true")` in `handleDismiss` | **UX + legal fix** — consent banner stops re-appearing on every page load after dismissal; avoids coercive dark pattern | S |
| **7** | `src/app/actions.ts:10` | Replace `React.cache()` with `unstable_cache(fn, ["trending"], { revalidate: 3600 })` | **Eliminates DB + Gemini round-trip on every page render** for every unique visitor; highest-leverage backend perf change | S |
| **8** | `src/components/core/ConstellationBackground.tsx:271–280` | Add `ResizeObserver` writing to `dimRef`; read `dimRef.current` inside RAF instead of `canvas.offsetWidth` | **Eliminates forced layout reflow at 60fps** — most impactful single-frame-time improvement | S |
| **9** | `src/components/core/CitySearch.tsx:278` | Change input sanitization regex from `/[^a-zA-Z0-9\s-]/g` to `/[<>{}\[\]\\]/g` | **Critical UX fix** — restores international city search (Köln, São Paulo, Łódź, etc.) for majority of world's cities | S |
| **10** | `src/components/features/city/ExperiencesSkeleton.tsx` | Replace `framer-motion` imports with CSS `@keyframes`; convert to server component | **Removes JS dependency from critical path** — skeleton now renders instantly without waiting for framer-motion bundle | M |

---

## 9. Phase-by-Phase Details

### Phase 0: Global CSS (`src/styles/globals.css`, 919 lines)

**Summary:** ~240 lines of confirmed dead CSS; 3 box-shadow transition anti-patterns causing paint on every hover; broken accessibility (skip-link, FOIT, no contrast media query); animation performance gaps.

**Key findings:**
- **Dead CSS (~240 lines):** `landing-hero-shell` block (50L), `atlas-spotlight::after` (14L), `atlas-panel-strong` (5L), `atlas-chip-accent`/`atlas-rule` (8L), `hero-notice`/`hero-metric-pill` (23L), three unused badge variants (27L), `progress-counter` (17L), `chapter-divider`/`city-card-glow`/`section-divider` (28L), `animate-marquee`+`@keyframes marquee` (13L), mobile dead classes (50L), `custom-scrollbar` (12L), `organic-blob-inverse` (3L), `search-stage`/`noise-overlay` (8L)
- **Performance:** Three `box-shadow` transitions trigger CPU paint (`.intent-card`, `.interactive-card`, `.city-card-glow`); `backdrop-filter` without `contain` hint; expensive `:not()` chain on all anchors
- **Accessibility:** Broken skip-link (C1); no `prefers-color-scheme` CSS baseline (H1); no `prefers-contrast: more` handling (H2); `--color-muted` below 4.5:1 AA (H2); `scroll-behavior: smooth` not gated on motion preference (H3)
- **CSS split plan:** 12 target files defined; `globals.css` target is ~15 import lines

---

### Phase 1: Layout + Root (`layout.tsx`, `page.tsx`, `SiteNav.tsx`, `ThemeToggle.tsx`, `SiteFooter.tsx`, `MobileBottomNav.tsx`)

**Summary:** `MobileBottomNav` is a dead component never imported. Font over-provisioning adds 7 network requests. Home page FCP gated on data fetch. Multiple WCAG touch-target failures.

**Key findings:**
- **Critical:** `MobileBottomNav` never mounted; SiteFooter spacer renders empty space (C-class from Phase 1 perspective, moved to H10)
- **Performance:** 3 font families × multiple weights = up to 7 font files blocking text rendering (H6); entire home page awaits `fetchTrendingDestinations()` before first paint (H7)
- **Accessibility:** Touch targets below 44px on `ThemeToggle` (H8), nav links (H9), logo link; static `ThemeToggle` aria-label (M10); no desktop active link state (M11); two JSON-LD scripts (M7)
- **Architecture:** `navLinks` duplicated in two files (M12); skip-link double-offsets on notched devices (M9); redundant nested flex wrapper (L7)

---

### Phase 2: City Detail Page (`page.tsx`, `ExperiencesSection.tsx`, `ExperiencesSkeleton.tsx`, `AIBriefingSection.tsx`, `AIBriefingClient.tsx`, `AIBriefingSkeleton.tsx`, `experience-helpers.ts`)

**Summary:** Critical data bug makes the notes feature entirely non-functional. Multiple `useMemo` gaps. Skeleton imports framer-motion defeating its purpose.

**Key findings:**
- **Critical:** `toNoteMap` double-sanitizes keys — notes textarea empties on every keystroke (C2)
- **Performance:** `renderCard` inline 250-line function with no memoization (H11); `displayData` computed without `useMemo` (H12); `placeNotesMap` created every render (H13); weather fetch blocks page streaming (H14); skeleton imports framer-motion (H15)
- **UX:** Featured card image missing `priority` prop (M20); duplicate breadcrumb/back-nav (M19); silent null return on missing AI insight (M16); hardcoded save button colors (M17)
- **Code quality:** Duplicate tab switcher UI in two components (M15); no-op variable aliases (M18); `topK` over-engineered (L15)

---

### Phase 3: Core Feature Components (`CitySearch.tsx`, `CitySphereBackground.tsx`, `ConstellationBackground.tsx`, `OptimizedImage.tsx`, `CityVitals.tsx`)

**Summary:** International city search broken for non-ASCII input. Constellation stars strobe due to `Math.random()` in draw loop. Canvas reads force layout reflow every frame. 170+ animated DOM nodes in sphere background.

**Key findings:**
- **Critical:** `Math.random()` in RAF loop — star colors strobe at 60fps (C3); Unicode-stripping input sanitizer (C-class UX, listed as H16)
- **Canvas performance:** `canvas.offsetWidth` layout reflow every frame (H21); no IntersectionObserver on constellation (H20); 4,800 gradient allocations/s (H22); `ctx.font`/`ctx.shadowBlur` thrashing (M27); `toUpperCase()` in draw loop (M28)
- **DOM performance:** 170+ simultaneously-animated sphere nodes (H19); `backfaceVisibility` inline style × 120 (M24); stale active indices on visibility return (M25)
- **Other:** `OptimizedImage` permanent `willChange` after animation (L18); no `blurhashToDataURL` cache (M30); 8px/9px text labels in `CityVitals` (H23)

---

### Phase 4: Sections + Pages (`HeroHeader.tsx`, `ScrollReveal.tsx`, `HomeSearchShowcase.tsx`, `TopCitiesPageContent.tsx`, `AboutPageContent.tsx`, `TestimonialsSection.tsx`, `TrustIndicators.tsx`, `ScrollProgress.tsx`)

**Summary:** `aria-valuenow` hardcoded to 0 on progress bar. Hero entry animation causes CLS. ~50 IntersectionObserver instances on list page. Static content forced into client bundles unnecessarily.

**Key findings:**
- **Accessibility:** `aria-valuenow={0}` never updates — screen readers always announce 0% (listed in Phase 5 as H24-equivalent); `window.scrollTo` ignores `prefers-reduced-motion` (M-level)
- **Performance:** Hero entry animation masks LCP (M41); `y: 40` scroll reveal too aggressive (cosmetic); ~50 IntersectionObserver instances on `TopCitiesPage` (M-level); `"use client"` on all-static components (H-class architecture issue)
- **Accessibility:** Wrong heading hierarchy in `AboutPageContent` — `h2` inside `h2` section (M-level); `showPercentage` feature renders empty markup (dead feature)
- **Code quality:** Inline anonymous array in `HomeSearchShowcase` JSX (M38-equivalent); `cityPreview` slice without `useMemo` (M-level); duplicated `PageShell` structure across About + TopCities (AR4)

---

### Phase 5: UI Primitives + Effects (`ScrollProgress.tsx`, `VisualEffects.tsx`, `InteractiveButton.tsx`, `Hotspot.tsx`, `ScrollReveal.tsx`, `FloralAccent.tsx`, `ClientEffects.tsx`, `Breadcrumbs.tsx`)

**Summary:** Dialog has no focus trap. `AnimatePresence` wraps a non-motion element. Easter egg fires inside form inputs. `FloralAccent` is completely inert but ships a JS chunk.

**Key findings:**
- **Critical accessibility:** `role="dialog"` with no focus trap (H25); `AnimatePresence` broken exit animation (H24); link variant renders block wrapper around `<Link>` (H26)
- **Bugs:** `setTimeout` for ripple not cleaned up on unmount (M37); `StaggerContainer` drops animation for single children (M38); Easter egg fires in form fields (M39)
- **Accessibility:** Double "Home" announcement in `Breadcrumbs` (M40); `Hotspot` broken mobile interaction (M33); missing `aria-describedby` on Hotspot (M34); no click-outside handler (M35); portal needed for tooltip positioning (M36)
- **Waste:** `FloralAccent.tsx` returns null but ships a chunk (L21); permanent `willChange` in `OptimizedImage` (L18); focus ring hardcoded to orange for all button variants (L24)

---

### Phase 6: Hooks + Lib Performance (`useDeviceType.ts`, `useNetworkQuality.ts`, `useRecentSearches.ts`, `http.ts`, `cache.ts`, `format.ts`, `env.ts`, `validation.ts`)

**Summary:** Critical infrastructure bugs in `http.ts` — caller signal bypasses timeout, `AbortError` trips circuit breaker, `Headers` input silently dropped. `paginationSchema` uses non-coercing `z.number()` for URL params.

**Key findings:**
- **Critical:** User signal bypasses timeout (C4); unsafe `Headers` cast (C8); each retry gets fresh timeout (H27); `AbortError` trips circuit breaker (H28)
- **Validation:** `paginationSchema` uses `z.number()` instead of `z.coerce.number()` — silently fails for URL params (H-level); coordinate validation duplicated (L-level)
- **Utilities:** `formatPopulation` has no billions tier — displays "1400M" (M-level); inline regex recreated per call (M-level); `env.ts` `serverEnv()` has no guard against client-side calls (M-level)
- **Hooks:** Three separate `matchMedia` listeners can produce two re-renders per resize in `useDeviceType` (M-level); `queueMicrotask` in `useRecentSearches` unjustified (L27)

---

### Phase 7: API Routes + Actions (`api/places/search/route.ts`, `api/analytics/route.ts`, `api/cities/sphere/route.ts`, `api/health/route.ts`, `actions.ts`)

**Summary:** `Promise.race` leaks requests. Analytics fire-and-forget silently drops events on Vercel. `fetchTrendingDestinations` hits DB on every page render. Health endpoint leaks infrastructure topology.

**Key findings:**
- **Critical:** `Promise.race` doesn't cancel underlying request (C7); analytics fire-and-forget killed by Vercel on response (C6); Content-Length guard bypassed by chunked encoding (C5)
- **Data bugs:** `countryName` field receives two-letter country code, not name (H-level from analytics); timeout detected via fragile string comparison (H-level)
- **Performance:** `fetchTrendingDestinations` uses `React.cache()` (request-scoped only) — DB hit on every page render (H10-equivalent); search results with `lat`/`lng` cached publicly at CDN (M-level)
- **Security:** Health endpoint leaks provider topology to unauthenticated callers (M-level); internal error messages exposed to clients in sphere and health routes (M/L-level)
- **Architecture:** `return await getTopCities(5)` unnecessary (L-level)

---

### Phase 8: Analytics Pipeline (`AnalyticsProvider.tsx`, `GeoConsentBanner.tsx`, `analytics.ts`, `PageTracker.tsx`, `index.ts`)

**Summary:** `sendBeacon` sends wrong Content-Type. Consent banner dismissal never persisted — re-appears forever. Duplicate `session_end` events from both `beforeunload` and `pagehide`. Events cleared before send confirmation — lost on network failure.

**Key findings:**
- **Data integrity:** `sendBeacon` without `Blob` sends `text/plain` — silently rejected by Next.js API route (H-level); events dequeued before send completes — lost on failure (H23-equivalent); `beforeunload` + `pagehide` both registered — doubles `session_end` records (H-level); `totalVisits === uniqueVisitors` always — statistic is useless (M-level)
- **UX/legal:** `handleDismiss` never writes `GEO_ASKED_KEY` — banner re-appears on every load (H-level); `isNewVisitor` uses `localStorage` without consent (M-level); raw `document.referrer` sent with sensitive query params (M-level); analytics run before general consent collected (M-level)
- **Bundle size:** `GeoConsentBanner` imports framer-motion into initial bundle — shown after 3s delay (M-level)
- **Accessibility:** Consent dialog missing focus trap, `aria-modal`, Escape handler (M-level)

---

*Report generated by Claude Code (claude-sonnet-4-6) — BestCitySpots Hermes phased audit, 2025-05-03*

# Motion Policy

Binding for every surface. Motion in the editorial-almanac system is
functional: it confirms a state change or helps the eye follow something
that moved. It never decorates.

Companion: `docs/design-tokens.md`, and the `--ease-standard` token and
`prefers-reduced-motion` block in `src/app/globals.css`.

## Rules

1. **CSS only.** No animation libraries. Transitions and `@keyframes` in
   Tailwind utilities or `globals.css`; overlay entrances use
   `@starting-style`.
2. **One curve.** `ease-standard` (`cubic-bezier(0.2, 0, 0, 1)`) for
   everything. Plain `linear` is reserved for the skeleton shimmer.
3. **Short durations.**

   | Class                   | Duration | Example                                 |
   | ----------------------- | -------- | --------------------------------------- |
   | State feedback          | 150ms    | hover fills, color changes, arrow nudge |
   | Component change        | 200ms    | disclosure icon, image fade-in          |
   | Overlay entrance / exit | 280ms    | search dialog, mobile menu sheet        |

4. **No ambient motion.** The only looping animations are the skeleton
   shimmer (while loading) and the pulsing "live" dot while the AI briefing
   streams. No scroll-triggered reveals, parallax, scroll-jacking or
   progress bars.
5. **Reduced motion is total.** The global `prefers-reduced-motion` block
   collapses every animation and transition; smooth scrolling (map pin →
   card) switches to instant jumps. Leaflet zoom/fade animations are turned
   off from the same media query.
6. **Never animate layout.** Animate `opacity`, `transform` and colors only;
   loading placeholders reserve their final size so nothing shifts.

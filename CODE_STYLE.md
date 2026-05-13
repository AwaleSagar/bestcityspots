# Code Style — Quick Reference

A short cheat sheet. For the full project conventions and PR process, see [CONTRIBUTING.md](CONTRIBUTING.md).

## TypeScript

```typescript
// ✅ Explicit signatures, no `any`
function getCityById(id: number): Promise<City | null> { ... }

// ✅ interface for shapes, type for unions / intersections
interface City { id: number; name: string; country: string; }
type CityResult = City & { matchScore: number };

// ❌ Don't
function getData(id: any): Promise<any> { ... }
var count = 0;
```

## React / Next.js

```tsx
// ✅ Server Component by default; "use client" only when needed
"use client";
import { useCallback, useState } from "react";

interface ButtonProps {
  label: string;
  onClick: () => void;
}

export function Button({ label, onClick }: ButtonProps) {
  const handle = useCallback(onClick, [onClick]);
  return <button onClick={handle}>{label}</button>;
}
```

- Server-only modules: start the file with `import "server-only"`.
- Hooks order: `useState` → `useEffect` → `useMemo` → `useCallback` → custom hooks.
- Effects: include all deps; always clean up subscriptions / timers.

## Environment, HTTP & data

```typescript
// ✅ Read env via env.ts
import { serverEnv, requireServerEnv } from "@/lib/env";
const key = requireServerEnv("GOOGLE_GEMINI_API_KEY");

// ✅ Outbound HTTP through providers + http.ts
import { fetchGooglePlace } from "@/lib/providers/googlePlaces";
const data = await fetchGooglePlace(id);

// ❌ Don't read process.env directly in app code
const key = process.env.GOOGLE_GEMINI_API_KEY;

// ❌ Don't call fetch() to third parties directly
const r = await fetch("https://maps.googleapis.com/...");
```

Always validate inputs and AI/provider outputs with **Zod** schemas from `src/lib/validation.ts`.

## Naming

| Kind               | Convention       | Example                                    |
| ------------------ | ---------------- | ------------------------------------------ |
| Components         | PascalCase       | `CityCard`, `HeroHeader`                   |
| Functions / vars   | camelCase        | `getCityById`, `isLoading`                 |
| Constants          | UPPER_SNAKE_CASE | `MAX_RESULTS`, `CACHE_TIERS`               |
| Interfaces / types | PascalCase       | `CityInsight`, `PlaceResult`               |
| Utility files      | kebab-case       | `cache-config.ts`, `place-search-utils.ts` |
| Component files    | PascalCase       | `CityCard.tsx`, `MobileBottomNav.tsx`      |

## Styling

```tsx
// ✅ Tailwind utilities + liquid-glass tokens
<div className="flex items-center gap-4 rounded-lg bg-glass/60 p-4 backdrop-blur-md hover:bg-glass/80 transition-colors">
  ...
</div>

// ❌ Inline styles, hardcoded colors
<div style={{ display: "flex", padding: 16, background: "#1a1a1a" }}>...</div>
```

- Tailwind 4 + custom properties from `src/app/globals.css` (`--color-glass`, `--liquid-glow-*`, `--shadow-3xl`, …). No hardcoded colors.
- Support dark mode via `next-themes` / `dark:` variants.

## Accessibility

```tsx
// ✅
<button aria-label="Close menu"><X /></button>
<nav><ul><li><a href="/">Home</a></li></ul></nav>
<img src="/city.jpg" alt="Skyline at dusk" />

// ❌
<div onClick={handleClick}>Click me</div>
<img src="/city.jpg" />
```

Respect `prefers-reduced-motion` in any animation work.

## Error handling

```typescript
// ✅ Explicit + graceful degradation on read paths
try {
  return await fetchSomething();
} catch (error) {
  log.warn("fetchSomething failed", { error });
  return null;
}
```

Use `createLogger({ component })` from `src/lib/logger.ts` rather than ad-hoc `console.log` in new modules.

## Performance

- Memoize expensive derivations with `useMemo`; stabilize handlers with `useCallback`.
- Debounce search and high-frequency inputs.
- Use Next.js `<Image>` or the project's `OptimizedImage` wrapper for images.

## Security

```typescript
// ✅ Validate, sanitize, parameterize
const parsed = uuidSchema.parse(id);
const sanitized = userInput.replace(/[^a-zA-Z0-9\s-]/g, "");

// ❌ Never
const apiKey = "sk-1234..."; // committed secret
const html = `<div>${userInput}</div>`; // XSS
```

- Validate inputs with Zod (`src/lib/validation.ts`).
- Supabase queries are parameterized — don't build SQL strings.
- RLS is the primary boundary; never bypass it from the client.

## Commit messages

Conventional Commits: `feat(search): add alias fallback`, `fix(http): respect caller AbortSignal`, `docs(readme): refresh API surface`.

## Quick commands

```bash
npm run dev           # Dev server
npm run lint          # ESLint + security plugin
npm run lint:fix
npm run format        # Prettier
npm run type-check    # tsc --noEmit
npm run build         # Production build
```

---

**Write code for humans first, machines second. Clarity > cleverness.**

# Contributing to Best City Spots

Thanks for contributing! This guide focuses on project-specific conventions. For architecture and security model see [AGENTS.md](AGENTS.md); for the file map see [PROJECT.md](PROJECT.md); for setup see [README.md](README.md).

## Getting started

```bash
git clone https://github.com/AwaleSagar/bestcityspots.git
cd bestcityspots
npm install
cp .env.example .env.local   # (or create one — see README)
npm run dev
```

Prerequisites: **Node.js 20.x+**, **npm 10.x+**, Git.

Placeholder env values are enough for `lint`, `type-check`, and `build`. The app degrades gracefully when backends are unreachable.

## Branch & PR workflow

1. Branch from the default branch: `feat/...`, `fix/...`, `docs/...`, `refactor/...`.
2. Make small, focused commits using Conventional Commits (see below).
3. Before opening a PR:

   ```bash
   npm run lint
   npm run format
   npm run type-check
   ```

4. Open a PR with a clear description: **what** changed, **why**, and **how to verify**.
5. Address review feedback; keep history tidy (squash where helpful).

### Commit messages

[Conventional Commits](https://www.conventionalcommits.org/):

```
feat(search): add alias fallback in search_cities_elastic
fix(http): pass caller AbortSignal into provider fetch
docs(readme): refresh API surface and env vars
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`.

## Project conventions

These are the rules that matter for this codebase. Please follow them.

### Environment & secrets

- Read env via `publicEnv()` / `serverEnv()` from `src/lib/env.ts`. **Never read `process.env` directly** in app code.
- Use `requireServerEnv(key)` when a value is mandatory at the call site.
- Only `NEXT_PUBLIC_*` may be referenced from client components.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` or any provider key to the client.

### Outbound HTTP

- All third-party HTTP must go through `src/lib/http.ts` (`httpFetch` / `httpJson`). It owns timeouts, retry+jitter, and the per-provider circuit breaker.
- Wrap each new provider in `src/lib/providers/<name>.ts` rather than calling `fetch` from elsewhere.

### Data access & caching

- Database calls live in `src/lib/*`, not in route handlers or components.
- Follow the **cache-first + stale-while-revalidate** pattern: check Supabase cache → on miss/stale call provider → upsert cache (often in the background).
- TTL tiers are centralized in `src/lib/cache-config.ts` (`CACHE_TIERS`). To invalidate, bump `schemaVersion`. For AI caches, bump `PROMPT_VERSIONS` in `src/lib/providers/gemini.ts`.

### Validation

- Validate every API input, every AI / provider output, and every env var with **Zod**.
- Shared schemas live in `src/lib/validation.ts`; use them rather than redefining.

### Database (Supabase)

- Baseline SQL is in `supabase/*.sql`. **New schema changes go in `supabase/migrations/<YYYYMMDDHHMM>_<short_description>.sql`** — idempotent (`IF NOT EXISTS`, `CREATE OR REPLACE`), one concern per file. See [`supabase/migrations/README.md`](supabase/migrations/README.md).
- RLS is the primary security boundary. Review and adjust policies (`supabase/security.sql`, `supabase/harden_security.sql`) when adding tables, columns, or write paths.
- Privileged writes are server-only via `supabaseServer` (service role).

### Cost & rate control

- Paid provider calls (Gemini, Google Places) are gated by `src/lib/cost-guard.ts` with daily call limits. Respect `*_LIVE_FETCH_ENABLED` flags in non-prod environments.

### TypeScript

- Strict mode is on. **Don't use `any`** — use `unknown` and narrow.
- Prefer explicit return types on exported functions.
- Use `interface` for object shapes; `type` for unions, intersections, and mapped types.

### React / Next.js

- **Prefer Server Components.** Add `"use client"` only when you need browser APIs, event handlers, state, effects, or custom hooks.
- Server-only modules must start with `import "server-only"` to keep secrets off the client bundle.
- Hooks order: `useState`, `useEffect`, `useMemo`, `useCallback`, then custom hooks.
- Always cleanup subscriptions, timers, and listeners in effects.
- Include all effect dependencies (ESLint `exhaustive-deps`).

### Styling

- Tailwind 4 utilities + the liquid-glass CSS custom properties defined in `src/app/globals.css` (`--color-glass`, `--liquid-glow-*`, `--shadow-3xl`, etc.).
- **No hardcoded colors** and no inline `style={{ ... }}` outside genuinely dynamic values.
- Support dark mode via `next-themes` / Tailwind's `dark:` variants.

### Accessibility

- Use semantic HTML; avoid `<div onClick>` for interactive elements.
- Provide `aria-label` for icon-only controls and `alt` for images.
- Respect `prefers-reduced-motion` for animations.

### Error handling

- Handle failures explicitly in `src/lib` and route handlers.
- For user-facing reads, prefer graceful degradation (`null`, `[]`, stale cache, provider fallback) over throwing.
- Logging is pragmatic: `console.warn`/`console.error`/`console.info`. Use the `createLogger({ component })` helper from `src/lib/logger.ts` when introducing new modules.

### Naming

| Kind               | Convention       | Example                                    |
| ------------------ | ---------------- | ------------------------------------------ |
| Components         | PascalCase       | `CityCard`, `SearchBar`                    |
| Functions / vars   | camelCase        | `getUserData`, `isLoading`                 |
| Constants          | UPPER_SNAKE_CASE | `MAX_RESULTS`, `CACHE_TIERS`               |
| Interfaces / types | PascalCase       | `CityInsight`, `PlaceResult`               |
| Utility files      | kebab-case       | `cache-config.ts`, `place-search-utils.ts` |
| Component files    | PascalCase       | `CityCard.tsx`, `HeroHeader.tsx`           |

## Testing & verification

There is no full automated test suite yet. The minimum bar is:

```bash
npm run lint
npm run type-check
npm run build       # smoke-build for non-trivial changes
```

Targeted manual checks:

```bash
npm run test:google-places   # Google Places integration
npm run test:supabase        # Supabase backend smoke tests
npm run test:refactor        # Cross-cutting refactor verification
```

When touching ranking, validation, search, cache freshness, or analytics aggregation, add a focused script under `scripts/` or a dedicated check rather than relying on manual UI testing.

## PR checklist

- [ ] `npm run lint` passes with no security-plugin warnings
- [ ] `npm run type-check` passes
- [ ] No new `process.env` references — use `env.ts`
- [ ] No direct `fetch` to third parties — goes through `http.ts` / `providers/*`
- [ ] All new inputs / AI outputs validated with Zod
- [ ] New SQL lives in `supabase/migrations/` and is idempotent
- [ ] RLS policies reviewed if tables / write paths changed
- [ ] No secrets committed; no `SUPABASE_SERVICE_ROLE_KEY` reachable from client code
- [ ] Documentation updated when behavior, routes, env vars, or scripts change

## Questions

Open an issue or start a discussion on GitHub. Thanks for helping build Best City Spots! 🌎

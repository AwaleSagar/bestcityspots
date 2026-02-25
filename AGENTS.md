# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Best City Spots is a single Next.js 16 (App Router, React 19) application — not a monorepo. See `README.md` for full tech stack and project structure.

### Quick reference commands

All standard dev commands are in `package.json` scripts. Key ones:

- `npm run dev` — starts Next.js dev server on port 3000
- `npm run lint` / `npm run lint:fix` — ESLint (includes `eslint-plugin-security`)
- `npm run type-check` — `tsc --noEmit`
- `npm run build` — production build (standalone output)
- `npm run format` / `npm run format:check` — Prettier

### Environment variables

The app requires a `.env.local` file. At minimum, `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` must be set — `src/lib/supabase.ts` throws at import time if they are missing. Placeholder values (e.g. `https://placeholder.supabase.co`) are sufficient for lint, type-check, build, and starting the dev server; the app gracefully degrades data-fetching features when the backend is unreachable.

Additional API keys (`GOOGLE_PLACES_API_KEY`, `GOOGLE_GEMINI_API_KEY`, `OPENWEATHERMAP_API_KEY`) enable AI insights, Google Places, and weather features respectively but are not required for the app to start and render.

### Non-obvious caveats

- **No test framework**: The project has no unit/integration test suite (no Jest, Vitest, etc.). The `test:google-places` script is a manual integration check, not an automated test. Lint + type-check are the primary automated quality gates.
- **Build warnings are expected**: During `npm run build`, Supabase fetch errors and Gemini API errors appear in the console when placeholder credentials are used. These are logged warnings from static page generation — the build still succeeds.
- **Node.js version**: The README specifies Node.js 20.x+. The Dockerfile uses `node:20-alpine`, but Node.js 22.x also works without issues.
- **Package manager**: This project uses **npm** (there is a `package-lock.json`). Do not use yarn/pnpm.
- **Dev server lock file**: If `npm run dev` fails with "Unable to acquire lock", remove `/workspace/.next/dev/lock` and kill stale `next-server` processes before retrying.
- **`.env.local` is gitignored**: Secrets are injected as environment variables; the `.env.local` file must be (re)generated from them at the start of each session if real API connectivity is needed.

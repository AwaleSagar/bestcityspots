# Copilot Instructions for Best City Spots

## 1. Project Context
- **Name**: Best City Spots (Atlas // Index 01)
- **Stack**: Next.js 16 (App Router), Tailwind CSS 4, Supabase, Framer Motion.
- **Core Value**: High-fidelity urban intelligence using liquid glass UI and AI-driven insights.

## 2. Architecture & Patterns
- **Directory Structure**:
  - `src/app`: Routes & Pages. Prefer Server Components.
  - `src/lib`: **Business Logic Core**. All API calls, Database interactions, and AI generation live here.
    - `intelligence.ts`: Gemini integration + Supabase caching (Server-Side Cache).
    - `places.ts`: Google Places API fetcher.
    - `validation.ts`: Zod schemas for inputs.
    - `supabase.ts`: Supabase client initialization.
    - `storage.ts`: LocalStorage wrapper (Client-Side Preference).
  - `src/components`: UI components using `framer-motion` and "liquid glass" CSS vars.
  - `supabase/`: SQL migrations. **Always** check existing tables before writing queries.

- **Data Flow**:
  1. **Server Components** fetch data via `src/lib/` functions.
  2. **Functions in `src/lib`** (like `intelligence.ts`) check Supabase cache tables first (e.g., `city_ai_insights`).
  3. **If Stale/Missing**: Fetch external API (Gemini/Google Places) -> Return Data -> Background Upsert to Supabase.
  4. **Client Components** receive strictly typed props.

- **Liquid Glass UI System**:
  - Defined in `src/app/globals.css`.
  - Use variables like `--color-glass`, `--liquid-glow-1`, `--shadow-3xl`.
  - **Do not** hardcode colors; use Tailwind classes or these custom vars.

## 3. Critical Workflows
- **Development**: `npm run dev`
- **Linting**: `npm run lint` (includes `eslint-plugin-security`). Fix all security warnings.
- **Testing**: `npm run test:google-places` for API integration tests.
- **Database**:
  - Migrations in `supabase/`.
  - Verify RLS policies in `supabase/security.sql` when adding tables.

## 4. Coding Conventions
- **Validation**:
  - **MUST** use `zod` schemas from `src/lib/validation.ts` for all API inputs.
  - Example: `uuidSchema.parse(id)`, `cityIdSchema.parse(param)`.
- **Error Handling**:
  - Handle errors explicitly in `src/lib`. Return `null` or throw structured errors to be caught by UI.
- **AI Integration**:
  - Use `GoogleGenerativeAI` in `src/lib/intelligence.ts`.
  - **ALWAYS** implement the "Cache-First" pattern: Check DB -> Call AI -> Update DB.
- **Styling**:
  - Tailwind 4 + `src/app/globals.css` vars.
  - Pattern: Glass background + blurred backdrop + fine borders.

## 5. Key Integrations
- **Supabase**:
  - Use `supabaseServer` (in `src/lib/supabase.ts`) for server ops (bypasses RLS if service key present).
  - Use `supabase` for client/anon ops.
- **Google Gemini**:
  - Model: `gemini-3-flash-preview` (or latest config).
  - Output: Strict JSON only (strip markdown fencing).
- **Google Places**:
  - Use `fetchFromGoogle` in `src/lib/places.ts`. Respected radius limits.

## 6. Common Pitfalls
- **Confusing Caches**: `storage.ts` is client-side (localStorage). `city_ai_insights` table is server-side AI cache.
- **Env Vars**: Only expose `NEXT_PUBLIC_` if used in client components.
- **Security**: Never bypass Zod. Never expose API keys to client (except specific public ones).


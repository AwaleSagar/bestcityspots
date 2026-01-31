# Copilot Instructions for Best City Spots

## Project Overview
- **Best City Spots** is a Next.js 16 (App Router) platform for real-time urban intelligence, featuring a Liquid Glass UI, AI-powered city briefings, and live data integrations.
- Major data sources: Google Gemini (AI), Google Places API, Open-Meteo (weather), and Supabase (database, caching, auth).

## Architecture & Key Patterns
- **src/app/**: Next.js App Router structure. API endpoints in `api/`, city pages in `cities/`, and resources in `resources/`.
- **src/lib/**: Core business logic (AI, places, metrics, Supabase, validation). All API integrations and data processing live here.
- **src/components/**: UI components, including Liquid Glass elements and visual effects.
- **supabase/**: SQL migrations and RLS security policies. All DB changes must be reflected here.
- **data/**: Static datasets for cities and candidates.

## Developer Workflows
- **Setup**: Copy `.env.local` template from README and fill in API keys.
- **Database**: Run all SQL scripts in `supabase/` to initialize tables and security.
- **Start Dev Server**: `npm run dev`
- **Linting**: `npm run lint` (uses `eslint-plugin-security`)
- **Formatting**: `npm run format` (Prettier)
- **Build**: `npm run build`

## Project-Specific Conventions
- **Validation**: All API inputs and env vars must use Zod schemas (see `src/lib/validation.ts`).
- **Caching**: Use Supabase for 24h/7d persistent caching of API results (see `src/lib/storage.ts`).
- **Security**: Enforce RLS in Supabase and validate all inputs. Never bypass Zod validation.
- **Styling**: Use Tailwind CSS 4 and custom CSS for Liquid Glass effects. Avoid inline styles.
- **Animations**: Use Framer Motion for transitions and background effects.

## Integration & Communication
- **API Integrations**: All external API logic is in `src/lib/` (e.g., `lib/places.ts`, `lib/intelligence.ts`).
- **Cross-component Data**: Pass data via props or Next.js server actions. Avoid global state unless necessary.
- **Security**: Never expose secrets to the client. Only use public keys in client code.

## Examples
- **City Briefings**: See `src/app/cities/[id]/AIBriefingSection.tsx` for AI-driven content.
- **API Route**: See `src/app/api/cities/sphere/route.ts` for a typical API handler.
- **Validation**: See `src/lib/validation.ts` for Zod schemas.
- **Caching**: See `src/lib/storage.ts` for Supabase caching logic.

---
For more details, see [README.md](../README.md) and the `supabase/` SQL files.

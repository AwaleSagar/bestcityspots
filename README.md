# Best City Spots — Atlas // Index 01

A premium, high-fidelity urban intelligence platform designed with a **Liquid Glass** aesthetic. Explore the world's most vibrant cities with real-time data and AI-driven insights.

## 💎 Design Philosophy

- **Liquid Glass UI:** Deep blacks, high-saturation blurs, and refraction effects powered by Tailwind CSS 4 and Vanilla CSS.
- **Atmospheric Motion:** Fluid background orbs, constellation effects, and smooth `framer-motion` transitions.
- **Architectural Typography:** Bold hierarchy using massive font weights and technical accents.

## 🧠 Intelligence & Data

- **AI-Powered Discovery:** Real-time travel trends and city briefings curated by **Google Gemini 1.5 Flash**.
- **Global Landmarks:** Top experiences, dining, and luxury stays via **Google Places API (New)**.
- **Real-time Weather:** Live meteorological conditions and air quality powered by **OpenWeatherMap** (60-minute cache).
- **Intelligence Cache:** Smart 24h/7d persistent caching in **Supabase** to minimize API costs and maximize speed.

## 📊 Analytics

- **Privacy-conscious visitor analytics** stored in Supabase: daily visitor stats, traffic sources, device/browser breakdown, geo stats (with consent), city views, and user actions. See `src/components/analytics/` and `src/app/api/analytics/`.

## 🛡️ Security & Validation

- **Input Validation:** Strict schema validation using **Zod** for all API inputs and environment variables.
- **Database Security:** Robust **Supabase RLS (Row Level Security)** policies on all tables.
- **Security Linting:** Integrated `eslint-plugin-security` for object-injection, non-literal fs, and eval checks.
- **Hardened Headers:** HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy in Next.js config.

## ⚡ Tech Stack & Performance

- **Framework:** Next.js 16 (App Router), React 19
- **Styling:** Tailwind CSS 4 & Vanilla CSS
- **Database / Auth / Storage:** Supabase
- **AI:** Google Generative AI (Gemini)
- **Weather:** OpenWeatherMap
- **Validation:** Zod
- **Icons:** Lucide React
- **Animations:** Framer Motion
- **Build:** Standalone output for Docker/deployment

## 📂 Project Structure

```text
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── about/              # About page
│   │   ├── cities/[id]/        # City detail (AI briefing, experiences, vitals)
│   │   ├── resources/top-cities/
│   │   ├── api/                # analytics, cities/sphere
│   │   ├── actions.ts          # Server actions (trending, etc.)
│   │   ├── layout.tsx, page.tsx, globals.css
│   │   ├── robots.ts, sitemap.ts, opengraph-image.tsx
│   ├── components/
│   │   ├── analytics/          # AnalyticsProvider, GeoConsentBanner, PageTracker
│   │   ├── effects/            # ClientEffects, FloralAccent, VisualEffects
│   │   ├── features/city/      # CitySearch, CitySphereBackground, CityVitals, ConstellationBackground
│   │   ├── layout/             # SiteNav, SiteFooter, MobileBottomNav, ThemeProvider, ThemeToggle
│   │   ├── pages/              # AboutPageContent, TopCitiesPageContent
│   │   ├── sections/           # HeroHeader, TrustIndicators, TestimonialsSection, FreeResourceCTA
│   │   └── ui/                 # Breadcrumbs, Hotspot, InteractiveButton, ScrollProgress, ScrollReveal
│   ├── hooks/                  # useNetworkQuality, useRecentSearches
│   └── lib/                    # cities, intelligence, places, weather, metrics, ranking, supabase, validation, storage, geo, format, image-transforms, sphere-categories, useAnalytics
├── supabase/                   # SQL migrations (security, RLS, analytics, city_ai_insights, weather cache, performance)
├── scripts/                    # warm-cache, analytics-report, backfillCityInsights, deploy, seedCoreMetrics, etc.
├── data/                       # Static city datasets (e.g. city_ai_candidates.txt)
├── public/                     # Static assets
├── Dockerfile                  # Multi-stage Node 20 Alpine build (standalone)
└── docker-compose.yml
```

## 🛠 Setup & Development

### Prerequisites

- **Node.js** 20.x or higher  
- **npm** 10.x or higher  

### Environment

Create a `.env.local` in the project root:

```env
# Required for core features
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
GOOGLE_PLACES_API_KEY=your_google_places_key
GOOGLE_GEMINI_API_KEY=your_gemini_key

# Optional — weather (OpenWeatherMap)
OPENWEATHERMAP_API_KEY=your_openweathermap_key

# Optional — server-side Supabase (cache writes, admin)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional — SEO & verification
NEXT_PUBLIC_SITE_URL=https://bestcityspots.com
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=your_verification_token

# Optional — enable analytics in development
NEXT_PUBLIC_ANALYTICS_DEV=1
```

### Database

Apply the SQL scripts in `supabase/` to your Supabase project (tables, RLS, functions). Key objects include: `cities`, `city_ai_insights`, `city_places_cache`, `city_weather_cache`, `ai_trending_cache`, `city_metrics`, and analytics tables (`daily_visitor_stats`, `traffic_sources_daily`, `device_stats_daily`, `geo_stats_daily`, `city_views_daily`, `user_actions_daily`).

### Commands

```bash
npm install          # Install dependencies
npm run dev          # Start development server
npm run build        # Build for production (standalone)
npm run start        # Run production server
npm run lint         # ESLint (includes security rules)
npm run lint:fix     # ESLint with auto-fix
npm run format       # Prettier format
npm run format:check # Prettier check
npm run type-check   # TypeScript (tsc --noEmit)
npm run warm-cache   # Warm intelligence/trending caches
npm run warm-cache:trending   # Trending only
npm run warm-cache:dry-run    # Dry run
npm run analytics    # Analytics report (default window)
npm run analytics:30d # Last 30 days
npm run analytics:json # JSON output
npm run test:google-places # Test Google Places integration
```

### Docker

Build and run with Docker:

```bash
docker build -t bestcityspots .
docker run -p 3000:3000 --env-file .env.local bestcityspots
```

Pass build args for Next.js public env at build time: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GOOGLE_PLACES_API_KEY`, `GOOGLE_GEMINI_API_KEY`. Runtime env (e.g. `OPENWEATHERMAP_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) via `--env-file` or `-e`.

## 📄 Key Routes

- **/** — Home (hero, city search, trending, trust indicators, testimonials)
- **/about** — About the platform
- **/cities/[id]** — City detail (AI briefing, experiences, weather, vitals)
- **/resources/top-cities** — Top cities resource page

## 📜 License & Contributing

- **License:** See [LICENSE](LICENSE).
- **Contributing:** See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, code style, and PR process.

---

*Index 01 // Built for the modern explorer.*

# Best City Spots — Atlas // Index 01

A premium, high-fidelity urban intelligence platform designed with a **Liquid Glass** aesthetic. Explore the world's most vibrant cities with real-time data and AI-driven insights.

## 💎 Design Philosophy
- **Liquid Glass UI:** Deep blacks, high-saturation blurs, and refraction effects.
- **Atmospheric Motion:** Fluid background orbs and smooth `framer-motion` transitions.
- **Architectural Typography:** Bold hierarchy using massive font weights and technical accents.

## 🧠 Intelligence & Data
- **AI-Powered Discovery:** Real-time travel trends curated by **Google Gemini 3 Flash**.
- **Global Landmarks:** Top experiences, dining, and luxury stays via **Google Places API (New)**.
- **Real-time weather:** Live meteorological conditions powered by **Open-Meteo**.
- **Intelligence Cache:** Smart 24h/7d persistent caching in **Supabase** to minimize API costs and maximize speed.

## ⚡ Performance Engineering
- **Streaming UI:** React Suspense-driven layouts for near-instant perceived performance.
- **Parallel Fetching:** Optimized server-side data waterfalls.
- **Responsive Architecture:** Fluid design that scales from mobile to ultra-wide displays.

## 🛠 Setup
1. **Environment:** Create a `.env.local` with the following:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   GOOGLE_PLACES_API_KEY=
   GOOGLE_GEMINI_API_KEY=
   ```
2. **Database:** Execute the SQL scripts in `supabase/` to initialize tables and RLS policies.
3. **Run:**
   ```bash
   npm install
   npm run dev
   ```

---
*Index 01 // Built for the modern explorer.*

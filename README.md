# Best City Spots — Atlas // Index 01

A premium, high-fidelity urban intelligence platform designed with a **Liquid Glass** aesthetic. Explore the world's most vibrant cities with real-time data and AI-driven insights.

## 💎 Design Philosophy
- **Liquid Glass UI:** Deep blacks, high-saturation blurs, and refraction effects powered by Tailwind CSS 4 and Vanilla CSS.
- **Atmospheric Motion:** Fluid background orbs and smooth `framer-motion` transitions.
- **Architectural Typography:** Bold hierarchy using massive font weights and technical accents.

## 🧠 Intelligence & Data
- **AI-Powered Discovery:** Real-time travel trends and city briefings curated by **Google Gemini 1.5 Flash**.
- **Global Landmarks:** Top experiences, dining, and luxury stays via **Google Places API (New)**.
- **Real-time Weather:** Live meteorological conditions powered by **Open-Meteo**.
- **Intelligence Cache:** Smart 24h/7d persistent caching in **Supabase** to minimize API costs and maximize speed.

## 🛡️ Security & Validation
- **Input Validation:** Strict schema validation using **Zod** for all API inputs and environment variables.
- **Database Security:** Robust **Supabase RLS (Row Level Security)** policies to protect data layers.
- **Security Linting:** Integrated `eslint-plugin-security` for identifying potential vulnerabilities during development.

## ⚡ Tech Stack & Performance
- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS 4 & Vanilla CSS
- **Database/Auth:** Supabase
- **AI:** Google Generative AI (Gemini)
- **Validation:** Zod
- **Icons:** Lucide React
- **Animations:** Framer Motion

## 📂 Project Structure
```text
├── src/
│   ├── app/            # Next.js App Router (Cities, API Actions)
│   ├── lib/            # Core Business Logic (AI, Places, Metrics, Supabase)
│   └── components/     # UI Components (Liquid Glass elements)
├── supabase/           # Database Migrations & Security Policies
├── data/               # Static City Datasets
└── public/             # Optimized Assets
```

## 🛠 Setup & Development
1. **Environment:** Create a `.env.local` with the following:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
   GOOGLE_PLACES_API_KEY=your_google_key
   GOOGLE_GEMINI_API_KEY=your_gemini_key
   ```
2. **Database:** Execute the SQL scripts in `supabase/` to initialize tables and RLS policies.
3. **Common Commands:**
   ```bash
   npm install      # Install dependencies
   npm run dev      # Start development server
   npm run build    # Build for production
   npm run lint     # Run security-focused linting
   npm run format   # Format code with Prettier
   ```

---
*Index 01 // Built for the modern explorer.*

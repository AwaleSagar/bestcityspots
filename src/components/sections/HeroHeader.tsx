"use client";

import { motion } from "framer-motion";
import { Sparkles, Compass, MapPin } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";

const HeroVideo = dynamic(() => import("./HeroVideo"), {
  ssr: false,
});

const featuredHighlights = [
  { icon: MapPin, text: "Curated Local Gems" },
  { icon: Compass, text: "Insider Itineraries" },
  { icon: Sparkles, text: "AI-Powered Insights" },
] as const;

export default function HeroHeader() {
  return (
    <div className="hero-full-bleed">
      {/* Lazy-loaded, location-aware background video */}
      <HeroVideo />
      <div className="hero-overlay" />

      <motion.header
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        className="hero-content text-center"
      >
        {/* Brand accent */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="mb-6 flex items-center justify-center gap-3"
        >
          <span className="section-heading">Best City Spots</span>
        </motion.div>

        <h1 className="relative mb-6 block py-2 md:py-4 overflow-visible">
          <span className="text-4xl leading-[1.08] font-black tracking-tight text-white sm:text-5xl md:text-7xl block drop-shadow-lg">
            Explore Cities Like
            <span className="block bg-gradient-to-r from-purple-400 via-purple-300 to-violet-300 bg-clip-text text-transparent">
              a Local
            </span>
          </span>
          {/* Ambient glow */}
          <div className="absolute top-1/2 left-1/2 -z-10 h-64 w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-500/[0.08] blur-[100px]" />
        </h1>

        <div className="mx-auto max-w-lg space-y-6">
          <p className="text-base md:text-lg leading-relaxed font-medium text-white/70">
            Curated city experiences for modern explorers. Discover hidden gems,
            plan smarter trips, and feel confident wherever you go.
          </p>

          {/* Primary & Secondary CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="#city-search"
              className="btn-primary w-full sm:w-auto"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById("city-search")?.focus();
              }}
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              Start Exploring
            </Link>
            <Link
              href="/resources/top-cities"
              className="btn-secondary w-full sm:w-auto"
            >
              Browse Top 50 Cities
            </Link>
          </div>

          {/* Feature highlights */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {featuredHighlights.map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="flex items-center gap-1.5 rounded-full border border-white/[0.12] bg-white/[0.06] px-3.5 py-2 text-[11px] font-semibold tracking-wide text-white/60"
              >
                <Icon
                  className="h-3.5 w-3.5 text-purple-300/80"
                  aria-hidden
                />
                {text}
              </div>
            ))}
          </div>
        </div>
      </motion.header>
    </div>
  );
}

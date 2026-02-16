"use client";

import { motion } from "framer-motion";
import { MapPin, Compass, TrendingUp } from "lucide-react";

const featuredHighlights = [
  { icon: MapPin, text: "Pros & Cons for Every City" },
  { icon: Compass, text: "Daily Budget Estimates" },
  { icon: TrendingUp, text: "Safety & Seasonal Advice" },
] as const;

export default function HeroHeader() {
  return (
    <motion.header
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
      className="mb-6 text-center"
    >
      {/* Minimalist Tech Accent */}
      <div className="mb-8 flex items-center justify-center gap-4 opacity-40">
        <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-foreground" />
        <span className="text-[9px] font-black tracking-[0.6em] text-foreground uppercase">
          Atlas // Index 01
        </span>
        <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-foreground" />
      </div>

      <h1 className="relative mb-4 block py-2 md:py-4 overflow-visible">
        <span className="text-5xl leading-[1.1] font-black tracking-tighter text-foreground md:text-8xl block pb-4">
          Best City <br /> Spots
        </span>
        {/* Liquid Glow Underlay */}
        <div className="absolute top-1/2 left-1/2 -z-10 h-64 w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-500/5 blur-[120px]" />
      </h1>

      <div className="mx-auto max-w-lg space-y-4">
        <p className="text-base md:text-xl leading-snug font-medium tracking-tight text-foreground/40">
          Your free, AI-powered city intelligence platform. Get <span className="text-foreground/90 italic">honest pros &amp; cons</span>, budget estimates, safety tips, and curated local picks for <span className="text-foreground/90">every destination</span>.
        </p>
        <div className="flex items-center justify-center gap-2 pt-1">
          <span className="h-1.5 w-1.5 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(147,51,234,0.8)]" />
          <span className="text-[11px] font-black tracking-[0.2em] text-foreground/40 uppercase">
            Real-time Data Active
          </span>
        </div>

        {/* Feature highlights - quick value propositions */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          {featuredHighlights.map(({ icon: Icon, text }) => (
            <div
              key={text}
              className="flex items-center gap-1.5 rounded-full border border-foreground/5 bg-foreground/[0.02] px-3 py-1.5 text-[10px] font-bold tracking-wide text-foreground/50"
            >
              <Icon className="h-3 w-3 text-purple-400/70" aria-hidden />
              {text}
            </div>
          ))}
        </div>
      </div>
    </motion.header>
  );
}

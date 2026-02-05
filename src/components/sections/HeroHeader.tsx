"use client";

import { motion } from "framer-motion";

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

      <div className="mx-auto max-w-lg space-y-2">
        <p className="text-base md:text-xl leading-snug font-medium tracking-tight text-foreground/40">
          Exploring the world&apos;s most <span className="text-foreground/90 italic">vibrant</span> urban centers through a <span className="text-foreground/90">premium intelligence</span> lens.
        </p>
        <div className="flex items-center justify-center gap-2 pt-1">
          <span className="h-1.5 w-1.5 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(147,51,234,0.8)]" />
          <span className="text-[11px] font-black tracking-[0.2em] text-foreground/40 uppercase">
            Real-time Data Active
          </span>
        </div>
      </div>
    </motion.header>
  );
}

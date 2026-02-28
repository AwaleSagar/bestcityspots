"use client";

import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import Link from "next/link";

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 50, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 1.0, ease: [0.16, 1, 0.3, 1] as const },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export default function HeroHeader() {
  return (
    <motion.header
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="relative flex min-h-[52vh] flex-col items-center justify-center text-center md:min-h-[60vh]"
    >
      {/* Eyebrow */}
      <motion.div variants={fadeUp} className="mb-8">
        <span className="inline-flex items-center gap-2.5 rounded-full border border-orange-500/[0.2] bg-orange-500/[0.07] px-5 py-2.5 text-[11px] font-semibold tracking-[0.16em] text-orange-300 uppercase backdrop-blur-sm">
          <MapPin className="h-3.5 w-3.5 text-orange-300" aria-hidden />
          AI-Powered City Discovery
        </span>
      </motion.div>

      {/* Main heading */}
      <motion.h1 variants={fadeUp} className="relative mb-6 px-2 leading-[1.12]">
        <span className="block text-[clamp(2.1rem,4.5vw+0.7rem,4.4rem)] font-semibold leading-[1.12] tracking-[-0.02em] text-foreground">
          Find Your Next
        </span>
        <span className="mt-2 block text-[clamp(2.1rem,4.5vw+0.7rem,4.4rem)] font-semibold leading-[1.12] tracking-[-0.02em]">
          <span className="inline-block bg-gradient-to-r from-orange-400 via-amber-300 to-orange-300 bg-clip-text pb-[0.04em] text-transparent">City</span> Faster
        </span>
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        variants={fadeUp}
        className="mx-auto mb-8 max-w-xl text-sm leading-relaxed text-foreground/55 md:text-base"
      >
        Search cities by name, vibe, or destination intent in seconds.
      </motion.p>

      {/* CTAs */}
      <motion.div
        variants={scaleIn}
        className="flex flex-col items-center gap-3 sm:flex-row"
      >
        <Link
          href="#city-search"
          className="btn-primary btn-primary-accent group"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById("city-search")?.focus();
          }}
        >
          Start Exploring
          <MapPin className="h-4 w-4 transition-transform group-hover:scale-110" aria-hidden />
        </Link>
        <Link href="/resources/top-cities" className="btn-secondary">
          Browse Top 50 Cities
        </Link>
      </motion.div>

      {/* Stats row */}
      <motion.div
        variants={fadeUp}
        className="mt-8 flex flex-wrap items-center justify-center gap-6 border-t border-foreground/[0.06] pt-6 md:mt-10 md:gap-10 md:pt-7"
      >
        {[
          { value: "10,000+", label: "Cities covered" },
          { value: "24/7", label: "Live data" },
          { value: "100%", label: "Free access" },
        ].map(({ value, label }) => (
          <div key={label} className="flex flex-col items-center gap-1">
            <span className="text-2xl font-semibold tracking-tight text-foreground">{value}</span>
            <span className="text-[11px] font-medium text-foreground/35 uppercase tracking-[0.14em]">{label}</span>
          </div>
        ))}
      </motion.div>
    </motion.header>
  );
}

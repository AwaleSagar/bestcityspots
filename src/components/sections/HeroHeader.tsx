"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Compass, Sparkles } from "lucide-react";
import Link from "next/link";

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.12 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.19, 1, 0.22, 1] as const },
  },
};

export default function HeroHeader() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.header
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="relative overflow-hidden pt-3 md:pt-6"
    >
      <div className="landing-hero-shell rounded-[2.2rem] p-5 md:p-8 lg:p-10">
        <div className="hero-atmosphere" aria-hidden>
          <motion.span
            className="hero-atmosphere-orb hero-atmosphere-orb-primary"
            animate={shouldReduceMotion ? undefined : { x: [0, 20, -8, 0], y: [0, -14, 10, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.span
            className="hero-atmosphere-orb hero-atmosphere-orb-secondary"
            animate={shouldReduceMotion ? undefined : { x: [0, -16, 8, 0], y: [0, 18, -12, 0] }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <div className="mx-auto max-w-3xl">
          <div>
            <motion.p variants={fadeUp} className="eyebrow">
              Editorial Atlas 2026 &middot; Human-readable city intelligence
            </motion.p>

            <motion.h1 variants={fadeUp} className="page-title text-foreground mt-6 max-w-5xl">
              Pick a city the way a thoughtful magazine would edit the shortlist.
            </motion.h1>

            <motion.p variants={fadeUp} className="lede mt-5 max-w-3xl">
              Best City Spots turns sprawling destination research into a clean urban briefing.
              Search once, get weather and scale instantly, then move into neighborhood texture,
              travel timing, and saved experiences without losing your place.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-8">
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <Link
                  href="#city-search"
                  className="btn-primary group"
                  onClick={(event) => {
                    event.preventDefault();
                    const searchInput = document.getElementById("city-search");
                    searchInput?.scrollIntoView({
                      behavior: shouldReduceMotion ? "auto" : "smooth",
                      block: "center",
                    });
                    window.setTimeout(() => searchInput?.focus(), shouldReduceMotion ? 0 : 220);
                  }}
                >
                  Find a city
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>

                <div className="atlas-chip atlas-chip-accent hero-notice rounded-full border border-[color:color-mix(in_oklab,var(--color-accent)_20%,transparent)] px-3 py-2">
                  <Compass className="h-3.5 w-3.5" aria-hidden />
                  Search, compare, then dive deeper
                </div>
              </div>
            </motion.div>

            <motion.div
              variants={fadeUp}
              className="mt-10 flex flex-wrap items-center gap-3 text-xs text-[color:var(--color-muted)]"
            >
              <div className="hero-metric-pill">
                <Sparkles className="h-3.5 w-3.5 text-[color:var(--color-accent)]" aria-hidden />
                Instant city signals
              </div>
              <div className="hero-metric-pill">Editorial briefings</div>
              <div className="hero-metric-pill">Live context</div>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.header>
  );
}

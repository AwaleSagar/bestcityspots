"use client";

import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Compass, Sparkles } from "lucide-react";
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
      className="relative overflow-hidden pt-4 md:pt-6"
    >
      <div className="noise-overlay relative overflow-hidden rounded-[2rem] border border-line bg-surface/72 px-5 py-6 shadow-3xl backdrop-blur-xl md:rounded-[3rem] md:px-8 md:py-10 lg:px-10">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -left-10 top-0 h-48 w-48 rounded-full bg-[color:var(--liquid-glow-1)] blur-[90px]" />
          <div className="absolute right-0 top-10 h-40 w-40 rounded-full bg-[color:var(--liquid-glow-2)] blur-[90px]" />
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] lg:items-end lg:gap-10">
          <div className="text-left">
            <motion.div variants={fadeUp} className="mb-6">
              <span className="inline-flex items-center gap-2.5 rounded-full border border-line bg-background/45 px-4 py-2 text-[11px] font-semibold tracking-[0.2em] text-muted-strong uppercase backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden />
                Atlas // Index 01
              </span>
            </motion.div>

            <motion.h1 variants={fadeUp} className="max-w-4xl text-[clamp(3rem,8vw,6.5rem)] leading-[0.9] text-foreground">
              Choose a city with
              <span className="block text-accent">more context, less clutter.</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-5 max-w-2xl text-sm leading-relaxed text-muted md:text-base"
            >
              Best City Spots turns destination research into an editorial briefing. Search by city, scan live signals, and move from curiosity to a shortlist without bouncing across ten tabs.
            </motion.p>

            <motion.div variants={scaleIn} className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <Link
                href="#city-search"
                className="btn-primary btn-primary-accent group"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById("city-search")?.focus();
                }}
              >
                Open City Search
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
              <Link href="/resources/top-cities" className="btn-secondary group">
                <BookOpen className="h-4 w-4" aria-hidden />
                Read the Top 50
              </Link>
            </motion.div>

            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              <span className="rounded-full border border-line bg-background/45 px-3.5 py-2">10,000+ cities</span>
              <span className="rounded-full border border-line bg-background/45 px-3.5 py-2">Live climate signals</span>
              <span className="rounded-full border border-line bg-background/45 px-3.5 py-2">Transparent sourcing</span>
            </motion.div>
          </div>

          <motion.div variants={fadeUp} className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {[
              {
                value: "24/7",
                label: "Live signals",
                text: "Weather, city metrics, and changing conditions keep the shortlist current.",
              },
              {
                value: "50",
                label: "Editorial picks",
                text: "Start with the most important cities, then drill into neighborhoods and pulse.",
              },
              {
                value: "1",
                label: "Calmer workflow",
                text: "Search, compare, and decide inside one mobile-friendly atlas instead of a tab maze.",
              },
            ].map(({ value, label, text }) => (
              <div key={label} className="rounded-[1.6rem] border border-line bg-background/45 p-4 shadow-sm backdrop-blur-md md:p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted">{label}</span>
                  <Compass className="h-4 w-4 text-accent" aria-hidden />
                </div>
                <div className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-foreground">{value}</div>
                <p className="mt-3 text-sm leading-relaxed text-muted">{text}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </motion.header>
  );
}

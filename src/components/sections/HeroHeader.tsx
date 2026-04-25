"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Compass, Leaf, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export default function HeroHeader() {
  const shouldReduceMotion = useReducedMotion();
  const signalItems = [
    { icon: Leaf, label: "Live city signals" },
    { icon: Sparkles, label: "AI-labeled briefings" },
    { icon: ShieldCheck, label: "Visible sources" },
  ];

  return (
    <motion.header
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="organic-section pt-10 pb-6 sm:pt-14 md:pt-18 lg:pt-24"
    >
      <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,1.12fr)_minmax(20rem,0.88fr)] lg:gap-12">
        <div className="max-w-4xl">
          <motion.p variants={fadeUp} className="editorial-kicker">
            City Intelligence &middot; Organic Atlas
          </motion.p>

          <motion.h1
            variants={fadeUp}
            className="page-title text-foreground mt-5 max-w-4xl sm:mt-7"
          >
            Choose your next city by feeling, facts, and timing.
          </motion.h1>

          <motion.p variants={fadeUp} className="lede mt-5 max-w-2xl sm:mt-6">
            Best City Spots turns live weather, local places, AI-assisted narrative, and practical
            planning cues into a calm atlas for deliberate travel.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="mt-7 flex flex-col gap-3 sm:mt-9 sm:flex-row sm:items-center"
          >
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
                window.setTimeout(() => searchInput?.focus(), shouldReduceMotion ? 0 : 200);
              }}
            >
              Start with intent
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link href="/resources/top-cities" className="btn-secondary group">
              Browse The Global 50
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </motion.div>
        </div>

        <motion.aside
          variants={fadeUp}
          className="organic-panel organic-blob-inverse p-[var(--space-fluid-panel)]"
          aria-label="Best City Spots intelligence model"
        >
          <div className="flex items-start gap-3">
            <div className="border-line flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] border bg-[color:var(--color-leaf-soft)]">
              <Compass className="h-5 w-5 text-[color:var(--color-leaf)]" aria-hidden />
            </div>
            <div>
              <p className="text-muted text-xs font-semibold tracking-[0.18em] uppercase">
                Intent map
              </p>
              <h2 className="text-foreground mt-2 text-2xl leading-none sm:text-3xl">
                Discovery, comparison, planning, arrival.
              </h2>
            </div>
          </div>

          <div className="mt-7 grid gap-3">
            {signalItems.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="border-line flex items-center justify-between gap-4 border-t pt-3"
              >
                <span className="text-muted-strong flex items-center gap-2 text-sm font-semibold">
                  <Icon className="text-accent h-4 w-4" aria-hidden />
                  {label}
                </span>
                <span className="source-chip">On</span>
              </div>
            ))}
          </div>
        </motion.aside>
      </div>
    </motion.header>
  );
}

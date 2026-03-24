"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
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

  return (
    <motion.header
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="pt-8 pb-4 sm:pt-12 md:pt-16 lg:pt-20"
    >
      <div className="mx-auto max-w-3xl">
        <motion.p variants={fadeUp} className="text-xs font-medium uppercase tracking-widest text-muted">
          City Intelligence &middot; 2026
        </motion.p>

        <motion.h1 variants={fadeUp} className="page-title text-foreground mt-4 sm:mt-6">
          Find the right city,<br className="hidden sm:inline" /> with the right context.
        </motion.h1>

        <motion.p variants={fadeUp} className="mt-4 max-w-xl text-base leading-relaxed text-muted sm:mt-6 sm:text-lg">
          Search once, get weather and signals instantly, then explore neighborhoods,
          timing, and saved experiences — all in one place.
        </motion.p>

        <motion.div variants={fadeUp} className="mt-6 sm:mt-8">
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
            Find a city
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </motion.div>
      </div>
    </motion.header>
  );
}

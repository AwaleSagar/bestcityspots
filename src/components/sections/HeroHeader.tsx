"use client";

import { motion } from "framer-motion";
import { Sparkles, ArrowDown } from "lucide-react";
import Link from "next/link";

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.3 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 60, filter: "blur(10px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 1, ease: [0.16, 1, 0.3, 1] },
  },
};

export default function HeroHeader() {
  return (
    <motion.header
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="relative flex min-h-[70vh] flex-col items-center justify-center text-center md:min-h-[80vh]"
    >
      {/* Ambient glows */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="absolute top-1/4 left-1/2 h-[500px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-500/[0.06] blur-[150px]"
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2, delay: 0.5 }}
          className="absolute bottom-0 right-1/4 h-[300px] w-[400px] rounded-full bg-amber-500/[0.04] blur-[120px]"
        />
      </div>

      {/* Eyebrow */}
      <motion.div variants={fadeUp} className="mb-8">
        <span className="inline-flex items-center gap-2.5 rounded-full border border-foreground/[0.06] bg-foreground/[0.02] px-5 py-2.5 text-[11px] font-semibold tracking-[0.2em] text-foreground/40 uppercase backdrop-blur-sm">
          <Sparkles className="h-3.5 w-3.5 text-purple-400/70" aria-hidden />
          Urban Intelligence Platform
        </span>
      </motion.div>

      {/* Main heading */}
      <motion.h1 variants={fadeUp} className="relative mb-8">
        <span className="block text-[clamp(2.5rem,5vw+1rem,5.5rem)] font-black leading-[0.95] tracking-[-0.04em] text-foreground">
          Discover the World&apos;s
        </span>
        <span className="mt-2 block text-[clamp(2.5rem,5vw+1rem,5.5rem)] font-black leading-[0.95] tracking-[-0.04em]">
          <span className="bg-gradient-to-r from-purple-400 via-violet-400 to-purple-300 bg-clip-text text-transparent">
            Most Vibrant
          </span>{" "}
          Cities
        </span>
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        variants={fadeUp}
        className="mx-auto mb-10 max-w-xl text-base leading-relaxed text-foreground/45 md:text-lg"
      >
        AI-powered insights, real-time data, and curated experiences for
        the modern explorer. No paywalls. No dark patterns.
      </motion.p>

      {/* CTAs */}
      <motion.div
        variants={scaleIn}
        className="flex flex-col items-center gap-4 sm:flex-row"
      >
        <Link
          href="#city-search"
          className="btn-primary group"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById("city-search")?.focus();
          }}
        >
          Start Exploring
          <Sparkles className="h-4 w-4 transition-transform group-hover:rotate-12" aria-hidden />
        </Link>
        <Link href="/resources/top-cities" className="btn-secondary">
          Browse Top 50
        </Link>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <ArrowDown className="h-5 w-5 text-foreground/20" />
        </motion.div>
      </motion.div>
    </motion.header>
  );
}

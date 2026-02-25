"use client";

import { Globe2, Shield, Zap, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import ScrollReveal from "@/components/ui/ScrollReveal";

const indicators = [
  {
    icon: Globe2,
    label: "Worldwide Coverage",
    stat: "10,000+",
    statLabel: "Cities",
    description: "Verified data across thousands of cities, so you can explore confidently wherever your curiosity takes you.",
  },
  {
    icon: Shield,
    label: "Transparent & Ethical",
    stat: "100%",
    statLabel: "Open",
    description: "No dark patterns, no hidden agendas. Every metric shows its source, so you always know what you're reading.",
  },
  {
    icon: Zap,
    label: "Always Fresh",
    stat: "24/7",
    statLabel: "Updates",
    description: "Live weather, updated metrics, and AI-curated insights refreshed daily — so your plans stay current.",
  },
] as const;

const credibilitySignals = [
  { icon: CheckCircle, text: "Google Places verified" },
  { icon: CheckCircle, text: "Public data sourced" },
  { icon: CheckCircle, text: "AI insights fact-checked" },
] as const;

export default function TrustIndicators() {
  return (
    <section
      className="relative mx-auto max-w-5xl px-4 sm:px-6"
      aria-labelledby="trust-heading"
    >
      <ScrollReveal animation="fade-up">
        <div className="mb-12 text-center md:mb-16">
          <span className="mb-4 inline-block text-[11px] font-semibold tracking-[0.25em] text-purple-400/60 uppercase">
            Built on Trust
          </span>
          <h2 id="trust-heading" className="text-3xl font-bold tracking-[-0.02em] text-foreground md:text-4xl">
            Why travelers choose us
          </h2>
        </div>
      </ScrollReveal>

      <ul className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8" role="list">
        {indicators.map(({ icon: Icon, label, stat, statLabel, description }, idx) => (
          <ScrollReveal key={label} animation="fade-up" staggerIndex={idx} staggerDelay={0.15}>
            <motion.li
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className="group relative overflow-hidden rounded-2xl border border-foreground/[0.05] bg-foreground/[0.015] p-7 transition-all duration-500 hover:border-purple-500/15 hover:shadow-xl md:rounded-3xl md:p-8"
            >
              <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-purple-500/[0.04] blur-[60px] transition-opacity duration-500 group-hover:opacity-100 opacity-0" />

              <div className="relative">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/[0.06] transition-colors duration-300 group-hover:bg-purple-500/[0.1]">
                  <Icon className="h-5.5 w-5.5 text-purple-400/80 transition-colors duration-300 group-hover:text-purple-400" aria-hidden />
                </div>

                <div className="mb-4">
                  <span className="text-3xl font-black tracking-tight text-foreground">{stat}</span>
                  <span className="ml-1.5 text-sm font-medium text-foreground/40">{statLabel}</span>
                </div>

                <h3 className="mb-3 text-sm font-bold tracking-tight text-foreground/80">
                  {label}
                </h3>
                <p className="text-sm leading-relaxed text-foreground/40">{description}</p>
              </div>
            </motion.li>
          </ScrollReveal>
        ))}
      </ul>

      <ScrollReveal animation="fade-up" delay={0.4}>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4 md:mt-14">
          {credibilitySignals.map(({ icon: Icon, text }) => (
            <div
              key={text}
              className="flex items-center gap-2 rounded-full border border-foreground/[0.05] bg-foreground/[0.02] px-4 py-2.5 text-xs font-medium text-foreground/40 transition-colors duration-300 hover:border-emerald-500/15 hover:text-foreground/55"
            >
              <Icon className="h-3.5 w-3.5 text-emerald-400/60" aria-hidden />
              {text}
            </div>
          ))}
        </div>
      </ScrollReveal>
    </section>
  );
}

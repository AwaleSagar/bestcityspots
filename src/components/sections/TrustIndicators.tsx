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
      className="relative mx-auto max-w-6xl"
      aria-labelledby="trust-heading"
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:gap-12">
        <ScrollReveal animation="fade-up">
          <div className="space-y-5 lg:sticky lg:top-28">
            <span className="section-heading">Built on trust</span>
            <h2 id="trust-heading" className="max-w-sm text-[clamp(2rem,5vw,3.35rem)] leading-[0.98] text-foreground">
              The product is designed to feel credible before it feels clever.
            </h2>
            <p className="max-w-md text-sm leading-relaxed text-muted md:text-base">
              Everything on the surface should make the site easier to trust on a phone: clear sources, calmer hierarchy, and fewer decorative distractions fighting the content.
            </p>
          </div>
        </ScrollReveal>

        <ul className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5" role="list">
        {indicators.map(({ icon: Icon, label, stat, statLabel, description }, idx) => (
          <ScrollReveal key={label} animation="fade-up" staggerIndex={idx} staggerDelay={0.15}>
            <motion.li
              whileHover={{ y: -6 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className="group relative overflow-hidden rounded-[1.85rem] border border-line bg-surface/70 p-5 transition-all duration-500 hover:border-accent/20 hover:shadow-xl md:p-6"
            >
              <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[color:var(--liquid-glow-1)] blur-[60px] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

              <div className="relative">
                <div className="mb-5 flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted">0{idx + 1}</span>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-background/45">
                    <Icon className="h-5 w-5 text-accent transition-colors duration-300" aria-hidden />
                  </div>
                </div>

                <div className="mb-5">
                  <span className="text-3xl font-semibold tracking-[-0.04em] text-foreground">{stat}</span>
                  <span className="ml-1.5 text-sm font-semibold text-accent">{statLabel}</span>
                </div>

                <h3 className="mb-3 text-lg leading-tight text-foreground">
                  {label}
                </h3>
                <p className="text-sm leading-relaxed text-muted">{description}</p>
              </div>
            </motion.li>
          </ScrollReveal>
        ))}
        </ul>
      </div>

      <ScrollReveal animation="fade-up" delay={0.4}>
        <div className="mt-8 flex flex-wrap gap-3 md:mt-10">
          {credibilitySignals.map(({ icon: Icon, text }) => (
            <div
              key={text}
              className="flex items-center gap-2 rounded-full border border-line bg-background/40 px-4 py-2.5 text-xs font-medium text-muted-strong transition-colors duration-300 hover:border-accent/20 hover:text-foreground"
            >
              <Icon className="h-3.5 w-3.5 text-accent" aria-hidden />
              {text}
            </div>
          ))}
        </div>
      </ScrollReveal>
    </section>
  );
}

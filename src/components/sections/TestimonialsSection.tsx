"use client";

import { Lightbulb, Eye, Shield, MapPin, Wallet, Route } from "lucide-react";
import { motion } from "framer-motion";
import ScrollReveal from "@/components/ui/ScrollReveal";

const highlights = [
  {
    text: "Real metrics — population, climate, air quality — without sign-up walls. Compare cities side by side with data you can trust.",
    label: "Open Data Access",
    icon: Eye,
  },
  {
    text: "AI-curated briefings that summarize each city in seconds — attractions, best seasons, and local weather, all from verified sources.",
    label: "Smart City Briefings",
    icon: Lightbulb,
  },
  {
    text: "No pop-ups, no dark patterns, no paywalls. We believe great travel tools should be honest and straightforward.",
    label: "Transparent by Design",
    icon: Shield,
  },
] as const;

const uniqueFeatures = [
  {
    icon: MapPin,
    title: "Hidden Local Gems",
    description: "Go beyond the tourist trail. Discover quiet parks, neighborhood cafés, and offbeat landmarks that only locals know about.",
  },
  {
    icon: Wallet,
    title: "Budget-Smart Planning",
    description: "See cost indicators for every recommendation. Filter by price level to plan experiences that fit your budget perfectly.",
  },
  {
    icon: Route,
    title: "Insider Itinerary Tips",
    description: "Arrival timing, best entry points, daily specials — AI-curated insider knowledge that turns a good trip into a great one.",
  },
] as const;

export default function TestimonialsSection() {
  return (
    <section
      className="relative overflow-hidden rounded-[2rem] border border-foreground/[0.04] bg-foreground/[0.01] py-16 md:rounded-[2.5rem] md:py-24"
      aria-labelledby="highlights-heading"
    >
      {/* Decorative gradient */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[500px] w-[600px] -translate-x-1/2 rounded-full bg-purple-500/[0.03] blur-[150px]" />
      </div>

      <div className="mx-auto max-w-5xl px-6 md:px-8">
        <ScrollReveal animation="fade-up">
          <div className="mb-14 text-center md:mb-20">
            <span className="mb-4 inline-block text-[11px] font-semibold tracking-[0.25em] text-purple-400/60 uppercase">
              How It Works
            </span>
            <h2
              id="highlights-heading"
              className="text-3xl font-bold tracking-[-0.02em] text-foreground md:text-4xl"
            >
              Everything you need to explore
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-foreground/40 md:text-base">
              Plan with confidence and discover with delight.
            </p>
          </div>
        </ScrollReveal>

        <ul className="grid gap-6 md:grid-cols-3 md:gap-8" role="list">
          {highlights.map(({ text, label, icon: Icon }, idx) => (
            <ScrollReveal key={label} animation="fade-up" staggerIndex={idx} staggerDelay={0.15}>
              <motion.li
                whileHover={{ y: -4 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className="group relative flex flex-col gap-5 rounded-2xl border border-foreground/[0.05] bg-foreground/[0.02] p-7 transition-all duration-500 hover:border-purple-500/12 hover:shadow-lg md:p-8"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/[0.06] transition-colors duration-300 group-hover:bg-purple-500/[0.1]">
                  <Icon className="h-5 w-5 text-purple-400/70 transition-colors group-hover:text-purple-400" aria-hidden />
                </div>
                <div>
                  <h3 className="mb-2 text-base font-bold tracking-tight text-foreground/80">
                    {label}
                  </h3>
                  <p className="text-sm leading-relaxed text-foreground/40">
                    {text}
                  </p>
                </div>
              </motion.li>
            </ScrollReveal>
          ))}
        </ul>

        {/* Unique features */}
        <div className="mt-20 md:mt-28">
          <ScrollReveal animation="fade-up">
            <div className="mb-14 text-center">
              <span className="mb-4 inline-block text-[11px] font-semibold tracking-[0.25em] text-purple-400/60 uppercase">
                The Difference
              </span>
              <h3 className="text-2xl font-bold tracking-[-0.02em] text-foreground md:text-3xl">
                What makes us different
              </h3>
              <p className="mx-auto mt-3 max-w-md text-sm text-foreground/40">
                Curated, not scraped. Every recommendation is intentional.
              </p>
            </div>
          </ScrollReveal>

          <ul className="grid gap-6 md:grid-cols-3 md:gap-8" role="list">
            {uniqueFeatures.map(({ icon: Icon, title, description }, idx) => (
              <ScrollReveal key={title} animation="fade-up" staggerIndex={idx} staggerDelay={0.15}>
                <motion.li
                  whileHover={{ y: -4 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className="group flex flex-col gap-5 rounded-2xl border border-purple-500/[0.06] bg-purple-500/[0.015] p-7 transition-all duration-500 hover:border-purple-500/15 hover:shadow-lg md:p-8"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-purple-500/12 bg-purple-500/[0.05] transition-all duration-300 group-hover:bg-purple-500/10 group-hover:border-purple-500/20">
                    <Icon className="h-5 w-5 text-purple-400/70 transition-colors group-hover:text-purple-400" aria-hidden />
                  </div>
                  <div>
                    <h4 className="mb-2 text-base font-bold tracking-tight text-foreground/80">
                      {title}
                    </h4>
                    <p className="text-sm leading-relaxed text-foreground/40">
                      {description}
                    </p>
                  </div>
                </motion.li>
              </ScrollReveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

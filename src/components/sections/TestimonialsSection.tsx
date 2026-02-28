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
      className="relative overflow-hidden rounded-[2rem] border border-foreground/[0.06] bg-foreground/[0.02] py-16 md:rounded-[2.5rem] md:py-24"
      aria-labelledby="highlights-heading"
    >
      {/* Decorative gradient */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[500px] w-[600px] -translate-x-1/2 rounded-full bg-orange-500/[0.05] blur-[150px]" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[400px] rounded-full bg-amber-500/[0.04] blur-[120px]" />
      </div>

      <div className="mx-auto max-w-5xl px-6 md:px-8">
        <ScrollReveal animation="fade-up">
          <div className="mb-14 text-center md:mb-20">
            <span className="mb-4 inline-block text-[11px] font-bold tracking-[0.25em] text-orange-400/80 uppercase">
              How It Works
            </span>
            <h2
              id="highlights-heading"
              className="text-3xl font-bold tracking-[-0.02em] text-foreground md:text-4xl"
            >
              Everything you need to explore
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-foreground/45 md:text-base">
              Plan with confidence and discover with delight.
            </p>
          </div>
        </ScrollReveal>

        <ul className="grid gap-6 md:grid-cols-3 md:gap-8" role="list">
          {highlights.map(({ text, label, icon: Icon }, idx) => (
            <ScrollReveal key={label} animation="fade-up" staggerIndex={idx} staggerDelay={0.15}>
              <motion.li
                whileHover={{ y: -6 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className="group relative flex flex-col gap-5 rounded-2xl border border-foreground/[0.07] bg-foreground/[0.03] p-7 transition-all duration-500 hover:border-orange-500/20 hover:shadow-lg hover:bg-foreground/[0.05] md:p-8"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/[0.1] border border-orange-500/[0.1] transition-colors duration-300 group-hover:bg-orange-500/[0.18]">
                  <Icon className="h-5 w-5 text-orange-400/80 transition-colors group-hover:text-orange-400" aria-hidden />
                </div>
                <div>
                  <h3 className="mb-2 text-base font-bold tracking-tight text-foreground/90">
                    {label}
                  </h3>
                  <p className="text-sm leading-relaxed text-foreground/45">
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
              <span className="mb-4 inline-block text-[11px] font-bold tracking-[0.25em] text-amber-400/80 uppercase">
                The Difference
              </span>
              <h3 className="text-2xl font-bold tracking-[-0.02em] text-foreground md:text-3xl">
                What makes us different
              </h3>
              <p className="mx-auto mt-3 max-w-md text-sm text-foreground/45">
                Curated, not scraped. Every recommendation is intentional.
              </p>
            </div>
          </ScrollReveal>

          <ul className="grid gap-6 md:grid-cols-3 md:gap-8" role="list">
            {uniqueFeatures.map(({ icon: Icon, title, description }, idx) => (
              <ScrollReveal key={title} animation="fade-up" staggerIndex={idx} staggerDelay={0.15}>
                <motion.li
                  whileHover={{ y: -6 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className="group flex flex-col gap-5 rounded-2xl border border-amber-500/[0.1] bg-amber-500/[0.03] p-7 transition-all duration-500 hover:border-amber-500/25 hover:shadow-lg hover:bg-amber-500/[0.06] md:p-8"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/[0.15] bg-amber-500/[0.08] transition-all duration-300 group-hover:bg-amber-500/[0.15] group-hover:border-amber-500/25">
                    <Icon className="h-5 w-5 text-amber-400/80 transition-colors group-hover:text-amber-400" aria-hidden />
                  </div>
                  <div>
                    <h4 className="mb-2 text-base font-bold tracking-tight text-foreground/90">
                      {title}
                    </h4>
                    <p className="text-sm leading-relaxed text-foreground/45">
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

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
      className="relative overflow-hidden rounded-[2rem] border border-line bg-surface/65 py-10 shadow-3xl backdrop-blur-xl md:rounded-[2.75rem] md:py-14"
      aria-labelledby="highlights-heading"
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 left-10 h-56 w-56 rounded-full bg-[color:var(--liquid-glow-1)] blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-60 w-60 rounded-full bg-[color:var(--liquid-glow-2)] blur-[140px]" />
      </div>

      <div className="mx-auto grid max-w-6xl gap-8 px-5 md:px-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12">
        <ScrollReveal animation="fade-up">
          <div className="rounded-[1.9rem] border border-line bg-background/40 p-6 md:p-8 lg:sticky lg:top-28">
            <span className="section-heading">Use the atlas</span>
            <h2
              id="highlights-heading"
              className="mt-4 text-[clamp(2rem,4vw,3.3rem)] leading-[0.98] text-foreground"
            >
              A travel tool that reads more like a briefing than a dashboard.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted md:text-base">
              The redesign pushes the product toward an editorial rhythm: fewer competing badges, stronger hierarchy, and clearer moments to search, compare, and commit.
            </p>
            <div className="mt-8 grid gap-3 text-sm text-muted">
              <div className="rounded-2xl border border-line bg-surface/65 px-4 py-3">Read the city summary before you start scanning details.</div>
              <div className="rounded-2xl border border-line bg-surface/65 px-4 py-3">Keep pricing, local tips, and signals visible without overwhelming the first screen.</div>
              <div className="rounded-2xl border border-line bg-surface/65 px-4 py-3">Let the product feel more intentional on mobile, not just compressed from desktop.</div>
            </div>
          </div>
        </ScrollReveal>

        <div className="space-y-5">
          <ul className="grid gap-5 md:grid-cols-3" role="list">
          {highlights.map(({ text, label, icon: Icon }, idx) => (
            <ScrollReveal key={label} animation="fade-up" staggerIndex={idx} staggerDelay={0.15}>
              <motion.li
                whileHover={{ y: -6 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className="group relative flex h-full flex-col gap-5 rounded-[1.8rem] border border-line bg-surface/70 p-5 transition-all duration-500 hover:border-accent/20 hover:shadow-lg md:p-6"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-background/50 transition-colors duration-300">
                  <Icon className="h-5 w-5 text-accent transition-colors" aria-hidden />
                </div>
                <div>
                  <h3 className="mb-2 text-lg leading-tight text-foreground">
                    {label}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted">
                    {text}
                  </p>
                </div>
              </motion.li>
            </ScrollReveal>
          ))}
          </ul>

          <ScrollReveal animation="fade-up">
            <div className="pt-4">
              <span className="mb-4 inline-block text-[11px] font-bold tracking-[0.25em] text-muted uppercase">
                The Difference
              </span>
              <h3 className="text-2xl text-foreground md:text-3xl">
                What this direction changes
              </h3>
              <p className="mt-3 max-w-xl text-sm text-muted md:text-base">
                The next layers of implementation will carry this same language into city detail pages, AI summaries, and cards with heavier interaction.
              </p>
            </div>
          </ScrollReveal>

          <ul className="grid gap-5 md:grid-cols-3" role="list">
            {uniqueFeatures.map(({ icon: Icon, title, description }, idx) => (
              <ScrollReveal key={title} animation="fade-up" staggerIndex={idx} staggerDelay={0.15}>
                <motion.li
                  whileHover={{ y: -6 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className="group flex h-full flex-col gap-5 rounded-[1.8rem] border border-line bg-background/35 p-5 transition-all duration-500 hover:border-accent/18 hover:shadow-lg md:p-6"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-surface/70 transition-all duration-300">
                    <Icon className="h-5 w-5 text-accent transition-colors" aria-hidden />
                  </div>
                  <div>
                    <h4 className="mb-2 text-lg leading-tight text-foreground">
                      {title}
                    </h4>
                    <p className="text-sm leading-relaxed text-muted">
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

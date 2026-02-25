"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useInView, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  Globe2,
  Radar,
  Shield,
  Sparkles,
  Heart,
  BookOpen,
  ArrowRight,
  Database,
} from "lucide-react";
import ScrollProgress from "@/components/ui/ScrollProgress";
import ScrollReveal from "@/components/ui/ScrollReveal";
import Hotspot from "@/components/ui/Hotspot";
import InteractiveButton from "@/components/ui/InteractiveButton";

const trustPrinciples = [
  {
    title: "No paywalls.",
    description: "All city guides and the free Top 50 list are available without sign-up.",
    tip: "We believe travel information should be accessible to everyone, regardless of budget. Knowledge about cities shouldn't be locked behind subscription walls.",
  },
  {
    title: "No dark patterns.",
    description: "We don't use countdown timers, fake scarcity, or manipulative CTAs.",
    tip: "You'll never see fake \"only 2 left!\" messages or pressure tactics here. We respect your decision-making process.",
  },
  {
    title: "Transparent data.",
    description: "We clearly state what we track and how we curate; this page explains it.",
    tip: "Every metric you see has a clear source. We don't hide our methodology because we have nothing to hide.",
  },
  {
    title: "Ethical AI.",
    description: "AI is used only to add context and summaries; core data comes from verified sources.",
    tip: "AI helps us write summaries and provide context, but all factual data comes from verified third-party sources like official statistics and established databases.",
  },
];

const howWeWork = [
  {
    title: "Global Coverage",
    description:
      "A continuously refined map of world cities with fresh demographics and geography.",
    icon: Globe2,
    tip: "Our database includes over 10,000 cities worldwide, updated regularly with the latest census data and geographic information.",
  },
  {
    title: "Live Signals",
    description:
      "Climate, activity, and travel indicators are refreshed to reflect real-world shifts.",
    icon: Radar,
    tip: "Weather data updates hourly. Events and activities refresh daily. We pull from multiple APIs to ensure accuracy.",
  },
  {
    title: "Responsible Intelligence",
    description:
      "We prioritize privacy and transparency when blending AI insights with source data.",
    icon: Shield,
    tip: "We never sell your data. Analytics are aggregated and anonymized. Your browsing history stays yours.",
  },
];

const whatWeTrack = [
  "Population momentum and regional influence",
  "Climate comfort, air quality, and seasonal patterns",
  "Landmark density, cultural signals, and local momentum",
];

const howWeCurate = [
  "Blend AI context with verified data sources",
  "Filter for credibility, recency, and relevance",
  "Continuously learn from traveler behavior",
];

const dataSources = [
  {
    name: "Google Places API",
    description: "Landmarks, restaurants, hotels, ratings, and reviews from Google\u2019s global point-of-interest database.",
  },
  {
    name: "OpenWeather & Weather APIs",
    description: "Real-time weather conditions, forecasts, air quality (PM2.5), and climate comfort indices.",
  },
  {
    name: "Public Census & Demographics",
    description: "Population figures, administrative regions, and geographic coordinates from open government datasets.",
  },
  {
    name: "Google Gemini AI",
    description: "AI-generated city briefings and summaries. These are clearly marked as AI content and are not presented as editorial opinions.",
  },
];

export default function AboutPageContent() {
  const shouldReduceMotion = useReducedMotion();
  const heroRef = useRef<HTMLDivElement>(null);
  const heroInView = useInView(heroRef, { once: true, amount: 0.3 });

  return (
    <>
      <ScrollProgress />

      <main
        id="main-content"
        className="min-h-screen bg-transparent font-sans text-foreground"
      >
        <div
          className="container-gutter mx-auto max-w-5xl px-4 py-12 sm:px-6"
          style={{ paddingTop: "max(3rem, calc(env(safe-area-inset-top, 0px) + 4rem))" }}
        >
          {/* Navigation */}
          <ScrollReveal animation="fade-down" delay={0.1}>
            <nav className="mb-10 md:mb-14" aria-label="Breadcrumb">
              <Link
                href="/"
                className="group nav-link touch-target inline-flex min-h-[var(--touch-target-min)] items-center gap-3 text-foreground/45 transition-colors duration-300 hover:text-foreground md:gap-4 py-2"
              >
                <motion.div
                  whileHover={shouldReduceMotion ? {} : { scale: 1.05 }}
                  whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-foreground/[0.06] bg-foreground/[0.02] transition-all duration-300 group-hover:border-purple-500/30 group-hover:bg-purple-500/10 md:h-11 md:w-11"
                >
                  <ArrowLeft className="h-4 w-4 md:h-[18px] md:w-[18px] transition-transform duration-300 group-hover:-translate-x-0.5" />
                </motion.div>
                <span className="text-[11px] md:text-xs font-semibold tracking-[0.15em] uppercase">
                  Return to Explorer
                </span>
              </Link>
            </nav>
          </ScrollReveal>

          {/* Hero Header */}
          <header ref={heroRef} className="relative space-y-6 overflow-visible py-6 md:py-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={heroInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
              className="absolute -top-20 -right-10 -z-10 h-64 w-64 rounded-full bg-purple-600/[0.06] blur-[150px]"
            />

            <ScrollReveal animation="fade-up" delay={0.2}>
              <div className="flex items-center gap-3 text-[11px] font-semibold tracking-[0.3em] text-purple-400/60 uppercase">
                <motion.div
                  animate={shouldReduceMotion ? {} : { rotate: [0, 360] }}
                  transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles className="h-4 w-4" />
                </motion.div>
                Atlas // Index 02
              </div>
            </ScrollReveal>

            <ScrollReveal animation="fade-up" delay={0.3}>
              <h1 className="text-4xl leading-[1.08] font-bold tracking-[-0.03em] text-foreground md:text-6xl lg:text-7xl">
                <motion.span
                  initial={{ opacity: 0, y: 20 }}
                  animate={heroInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="inline-block"
                >
                  About
                </motion.span>{" "}
                <motion.span
                  initial={{ opacity: 0, y: 20 }}
                  animate={heroInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.8, delay: 0.5 }}
                  className="inline-block bg-gradient-to-r from-purple-400 via-violet-400 to-purple-300 bg-clip-text text-transparent"
                >
                  Best City Spots
                </motion.span>
              </h1>
            </ScrollReveal>

            <ScrollReveal animation="blur" delay={0.5}>
              <p className="max-w-2xl text-base md:text-lg leading-relaxed text-foreground/50">
                We combine trusted data sources, spatial intelligence, and human curation to help
                travelers find cities that fit their mood, budget, and rhythm. The goal is simple:
                make discovering your next destination feel effortless — with{" "}
                <strong className="text-foreground/80">no paywalls</strong> and{" "}
                <strong className="text-foreground/80">no dark patterns</strong>.
              </p>
            </ScrollReveal>
          </header>

          {/* Chapter 1: Trust Principles */}
          <div className="chapter-divider mt-20">
            <ScrollReveal animation="scale">
              <span className="text-[10px] font-semibold tracking-[0.3em] text-purple-400/50 uppercase">
                Chapter 01
              </span>
            </ScrollReveal>
          </div>

          <ScrollReveal animation="fade-up">
            <section
              className="mt-8 rounded-2xl border border-foreground/[0.06] bg-foreground/[0.015] p-7 md:rounded-3xl md:p-10 interactive-card"
              aria-labelledby="trust-principles-heading"
            >
              <h2
                id="trust-principles-heading"
                className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground/40"
              >
                <motion.div
                  animate={shouldReduceMotion ? {} : { scale: [1, 1.15, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                >
                  <Heart className="h-4 w-4 text-purple-400/70" aria-hidden />
                </motion.div>
                Why we&apos;re different
              </h2>

              <ul className="mt-8 grid gap-5 md:grid-cols-2" role="list">
                {trustPrinciples.map((principle, index) => (
                  <ScrollReveal
                    key={principle.title}
                    animation="fade-left"
                    staggerIndex={index}
                    staggerDelay={0.12}
                  >
                    <li className="flex gap-3.5 text-sm text-foreground/55">
                      <motion.span
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 + index * 0.1, type: "spring" }}
                        className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-purple-500/10 text-[10px] text-purple-400"
                        aria-hidden
                      >
                        ✓
                      </motion.span>
                      <span>
                        <strong className="text-foreground/80">{principle.title}</strong>{" "}
                        {principle.description}
                        <Hotspot tip={principle.tip} position="bottom" />
                      </span>
                    </li>
                  </ScrollReveal>
                ))}
              </ul>
            </section>
          </ScrollReveal>

          {/* Chapter 2: How We Work */}
          <div className="chapter-divider mt-20">
            <ScrollReveal animation="scale">
              <span className="text-[10px] font-semibold tracking-[0.3em] text-purple-400/50 uppercase">
                Chapter 02
              </span>
            </ScrollReveal>
          </div>

          <section className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8" aria-labelledby="how-we-work-heading">
            <h2 id="how-we-work-heading" className="sr-only">
              How we work
            </h2>
            {howWeWork.map((item, index) => (
              <ScrollReveal
                key={item.title}
                animation="fade-up"
                staggerIndex={index}
                staggerDelay={0.15}
              >
                <motion.div
                  whileHover={shouldReduceMotion ? {} : { y: -6 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className="group city-card-glow flex flex-col gap-5 rounded-2xl border border-foreground/[0.05] bg-foreground/[0.015] p-7 md:rounded-3xl md:p-8 h-full transition-all duration-500 hover:border-purple-500/12 hover:shadow-xl"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/[0.06] transition-colors duration-300 group-hover:bg-purple-500/10">
                    <item.icon className="h-5 w-5 text-purple-400/70 transition-colors group-hover:text-purple-400" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold tracking-tight text-foreground">
                      {item.title}
                    </span>
                    <Hotspot tip={item.tip} position="right" size="sm" />
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/45">{item.description}</p>
                </motion.div>
              </ScrollReveal>
            ))}
          </section>

          {/* Chapter 3: Data Sources */}
          <div className="chapter-divider mt-20">
            <ScrollReveal animation="scale">
              <span className="text-[10px] font-semibold tracking-[0.3em] text-purple-400/50 uppercase">
                Chapter 03
              </span>
            </ScrollReveal>
          </div>

          <ScrollReveal animation="fade-up">
            <section
              className="mt-8 rounded-2xl border border-foreground/[0.06] bg-foreground/[0.015] p-7 md:rounded-3xl md:p-10 interactive-card"
              aria-labelledby="data-sources-heading"
            >
              <h2
                id="data-sources-heading"
                className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground/40"
              >
                <Database className="h-4 w-4 text-purple-400/70" aria-hidden />
                Data Sources &amp; Methodology
              </h2>

              <p className="mt-5 text-sm leading-relaxed text-foreground/50">
                Every metric on Best City Spots comes from a verifiable source. We believe in full transparency so you can cross-check any data point we present.
              </p>

              <ul className="mt-8 grid gap-5 md:grid-cols-2" role="list">
                {dataSources.map((source, index) => (
                  <ScrollReveal
                    key={source.name}
                    animation="fade-left"
                    staggerIndex={index}
                    staggerDelay={0.12}
                  >
                    <li className="flex gap-3.5 text-sm text-foreground/55">
                      <motion.span
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 + index * 0.1, type: "spring" }}
                        className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-purple-500/10 text-[10px] text-purple-400"
                        aria-hidden
                      >
                        ✓
                      </motion.span>
                      <span>
                        <strong className="text-foreground/80">{source.name}.</strong>{" "}
                        {source.description}
                      </span>
                    </li>
                  </ScrollReveal>
                ))}
              </ul>

              <p className="mt-8 text-xs leading-relaxed text-foreground/30">
                AI-generated content is always labeled. We do not fabricate reviews or testimonials. All ratings and reviews shown are sourced directly from Google Places.
              </p>
            </section>
          </ScrollReveal>

          {/* Chapter 4: Our Mission */}
          <div className="chapter-divider mt-20">
            <ScrollReveal animation="scale">
              <span className="text-[10px] font-semibold tracking-[0.3em] text-purple-400/50 uppercase">
                Chapter 04
              </span>
            </ScrollReveal>
          </div>

          <section className="mt-8 space-y-10" aria-labelledby="mission-heading">
            <ScrollReveal animation="fade-up">
              <div className="space-y-5">
                <h2
                  id="mission-heading"
                  className="flex items-center gap-4 text-[11px] font-semibold tracking-[0.3em] text-foreground/35 uppercase"
                >
                  Our Mission <span className="h-px flex-1 bg-foreground/[0.04]" />
                </h2>
                <p className="text-base md:text-lg leading-relaxed text-foreground/55">
                  Best City Spots exists to guide confident travel decisions. We highlight places that
                  match your preferences, reduce time spent comparing scattered sources, and surface
                  insights that travelers can actually use — without gatekeeping or manipulation.
                </p>
              </div>
            </ScrollReveal>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
              <ScrollReveal animation="fade-right">
                <motion.div
                  whileHover={shouldReduceMotion ? {} : { x: -3 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className="rounded-2xl border border-foreground/[0.05] bg-foreground/[0.015] p-7 md:rounded-3xl md:p-8 h-full"
                >
                  <h3 className="text-[11px] font-semibold tracking-[0.25em] text-purple-400/60 uppercase">
                    What We Track
                  </h3>
                  <ul className="mt-6 space-y-4 text-sm text-foreground/50">
                    {whatWeTrack.map((item, index) => (
                      <ScrollReveal
                        key={item}
                        animation="fade-left"
                        staggerIndex={index}
                        staggerDelay={0.1}
                      >
                        <li className="flex items-start gap-3">
                          <motion.span
                            initial={{ width: 0 }}
                            whileInView={{ width: "0.5rem" }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.3 + index * 0.1 }}
                            className="mt-2 h-0.5 flex-shrink-0 rounded-full bg-purple-400/40"
                          />
                          {item}
                        </li>
                      </ScrollReveal>
                    ))}
                  </ul>
                </motion.div>
              </ScrollReveal>

              <ScrollReveal animation="fade-left">
                <motion.div
                  whileHover={shouldReduceMotion ? {} : { x: 3 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className="rounded-2xl border border-foreground/[0.05] bg-foreground/[0.015] p-7 md:rounded-3xl md:p-8 h-full"
                >
                  <h3 className="text-[11px] font-semibold tracking-[0.25em] text-purple-400/60 uppercase">
                    How We Curate
                  </h3>
                  <ul className="mt-6 space-y-4 text-sm text-foreground/50">
                    {howWeCurate.map((item, index) => (
                      <ScrollReveal
                        key={item}
                        animation="fade-right"
                        staggerIndex={index}
                        staggerDelay={0.1}
                      >
                        <li className="flex items-start gap-3">
                          <motion.span
                            initial={{ width: 0 }}
                            whileInView={{ width: "0.5rem" }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.3 + index * 0.1 }}
                            className="mt-2 h-0.5 flex-shrink-0 rounded-full bg-violet-400/40"
                          />
                          {item}
                        </li>
                      </ScrollReveal>
                    ))}
                  </ul>
                </motion.div>
              </ScrollReveal>
            </div>
          </section>

          {/* Final CTA */}
          <div className="chapter-divider mt-20">
            <ScrollReveal animation="scale">
              <span className="text-[10px] font-semibold tracking-[0.3em] text-purple-400/50 uppercase">
                Ready?
              </span>
            </ScrollReveal>
          </div>

          <ScrollReveal animation="fade-up">
            <section
              className="noise-overlay mt-8 rounded-2xl border border-purple-500/15 bg-gradient-to-br from-purple-500/[0.06] via-purple-500/[0.03] to-transparent p-8 md:rounded-3xl md:p-12 relative overflow-hidden"
              aria-labelledby="cta-heading"
            >
              <motion.div
                animate={shouldReduceMotion ? {} : {
                  scale: [1, 1.15, 1],
                  opacity: [0.08, 0.15, 0.08],
                }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-purple-500/15 blur-[100px]"
              />

              <h2
                id="cta-heading"
                className="relative text-[11px] font-semibold tracking-[0.25em] text-purple-300/70 uppercase"
              >
                Ready to Explore
              </h2>

              <div className="relative mt-6 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="max-w-xl text-base md:text-lg leading-relaxed text-foreground/70">
                    Dive into the atlas to compare cities, uncover hidden gems, and plan your next
                    journey with confidence.
                  </p>
                  <p className="mt-3 text-sm text-foreground/45">
                    Try our free{" "}
                    <Link
                      href="/resources/top-cities"
                      className="font-semibold text-purple-300 underline underline-offset-3 hover:text-purple-200 transition-colors"
                    >
                      Top 50 Cities guide
                    </Link>
                    &nbsp;&mdash; no sign-up required.
                  </p>
                </div>

                <div className="flex flex-shrink-0 flex-wrap gap-3">
                  <InteractiveButton
                    href="/resources/top-cities"
                    variant="secondary"
                    icon={<BookOpen className="h-4 w-4" />}
                  >
                    Free Guide
                  </InteractiveButton>
                  <InteractiveButton
                    href="/"
                    variant="primary"
                    iconAfter={<ArrowRight className="h-4 w-4" />}
                  >
                    Start Exploring
                  </InteractiveButton>
                </div>
              </div>
            </section>
          </ScrollReveal>
        </div>
      </main>
    </>
  );
}

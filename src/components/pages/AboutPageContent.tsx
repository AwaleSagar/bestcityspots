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
        className="min-h-screen bg-transparent font-sans text-foreground selection:bg-purple-500/30 selection:text-purple-200"
      >
        <div
          className="container-gutter mx-auto max-w-5xl px-4 py-12 sm:px-6"
          style={{ paddingTop: "max(3rem, calc(env(safe-area-inset-top, 0px) + 4rem))" }}
        >
          {/* Navigation */}
          <ScrollReveal animation="fade-down" delay={0.1}>
            <nav className="mb-8 md:mb-12" aria-label="Breadcrumb">
              <Link
                href="/"
                className="group touch-target inline-flex min-h-[var(--touch-target-min)] items-center gap-3 text-foreground/50 transition-colors duration-100 hover:text-foreground md:gap-4 py-2"
              >
                <motion.div
                  whileHover={shouldReduceMotion ? {} : { scale: 1.1 }}
                  whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
                  className="liquid-glass flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-foreground/10 bg-foreground/[0.03] transition-colors duration-100 group-hover:border-purple-500/40 group-hover:bg-purple-500/20 md:h-12 md:w-12"
                >
                  <ArrowLeft className="h-4 w-4 md:h-5 md:w-5 transition-transform group-hover:-translate-x-1" />
                </motion.div>
                <span className="text-[10px] md:text-xs font-black tracking-[0.2em] uppercase">
                  Return to Explorer
                </span>
              </Link>
            </nav>
          </ScrollReveal>

          {/* Hero Header */}
          <header ref={heroRef} className="relative space-y-6 overflow-visible py-6">
            {/* Animated background glow */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={heroInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
              className="absolute -top-16 -right-10 -z-10 h-56 w-56 rounded-full bg-purple-600/10 blur-[120px]"
            />

            <ScrollReveal animation="fade-up" delay={0.2}>
              <div className="flex items-center gap-3 text-[10px] font-black tracking-[0.4em] text-purple-400 uppercase">
                <motion.div
                  animate={shouldReduceMotion ? {} : { rotate: [0, 360] }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles className="h-4 w-4" />
                </motion.div>
                Atlas // Index 02
              </div>
            </ScrollReveal>

            <ScrollReveal animation="fade-up" delay={0.3}>
              <h1 className="text-5xl leading-[1.1] font-black tracking-tighter text-foreground md:text-7xl">
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
                  className="inline-block bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent"
                >
                  Best City Spots
                </motion.span>
              </h1>
            </ScrollReveal>

            <ScrollReveal animation="blur" delay={0.5}>
              <p className="max-w-2xl text-base md:text-lg leading-loose text-foreground/70">
                We combine trusted data sources, spatial intelligence, and human curation to help
                travelers find cities that fit their mood, budget, and rhythm. The goal is simple:
                make discovering your next destination feel effortless—with{" "}
                <strong className="text-foreground/90">no paywalls</strong> and{" "}
                <strong className="text-foreground/90">no dark patterns</strong>.
              </p>
            </ScrollReveal>
          </header>

          {/* Chapter 1: Trust Principles */}
          <div className="chapter-divider mt-16">
            <ScrollReveal animation="scale">
              <span className="text-[10px] font-black tracking-[0.4em] text-purple-400/60 uppercase">
                Chapter 01
              </span>
            </ScrollReveal>
          </div>

          <ScrollReveal animation="fade-up">
            <section
              className="mt-8 rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-6 sm:rounded-[2rem] sm:p-8 interactive-card"
              aria-labelledby="trust-principles-heading"
            >
              <h2
                id="trust-principles-heading"
                className="flex items-center gap-3 text-sm font-black uppercase tracking-[0.2em] text-foreground/50"
              >
                <motion.div
                  animate={shouldReduceMotion ? {} : { scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Heart className="h-4 w-4 text-purple-400" aria-hidden />
                </motion.div>
                Why we&apos;re different
              </h2>

              <ul className="mt-6 grid gap-4 sm:grid-cols-2" role="list">
                {trustPrinciples.map((principle, index) => (
                  <ScrollReveal
                    key={principle.title}
                    animation="fade-left"
                    staggerIndex={index}
                    staggerDelay={0.15}
                  >
                    <li className="flex gap-3 text-sm text-foreground/70">
                      <motion.span
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 + index * 0.1, type: "spring" }}
                        className="text-purple-400 flex-shrink-0"
                        aria-hidden
                      >
                        ✓
                      </motion.span>
                      <span>
                        <strong className="text-foreground/90">{principle.title}</strong>{" "}
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
          <div className="chapter-divider mt-16">
            <ScrollReveal animation="scale">
              <span className="text-[10px] font-black tracking-[0.4em] text-purple-400/60 uppercase">
                Chapter 02
              </span>
            </ScrollReveal>
          </div>

          <section className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3" aria-labelledby="how-we-work-heading">
            <h2 id="how-we-work-heading" className="sr-only">
              How we work
            </h2>
            {howWeWork.map((item, index) => (
              <ScrollReveal
                key={item.title}
                animation="fade-up"
                staggerIndex={index}
                staggerDelay={0.2}
              >
                <motion.div
                  whileHover={shouldReduceMotion ? {} : { y: -8, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="liquid-glass city-card-glow flex flex-col gap-4 rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6 shadow-2xl sm:rounded-[2.5rem] sm:p-8 h-full"
                >
                  <motion.div
                    whileHover={shouldReduceMotion ? {} : { rotate: 360 }}
                    transition={{ duration: 0.6 }}
                  >
                    <item.icon className="h-5 w-5 text-purple-300" />
                  </motion.div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black tracking-tight text-foreground">
                      {item.title}
                    </span>
                    <Hotspot tip={item.tip} position="right" size="sm" />
                  </div>
                  <p className="text-sm leading-loose text-foreground/60">{item.description}</p>
                </motion.div>
              </ScrollReveal>
            ))}
          </section>

          {/* Chapter 3: Data Sources */}
          <div className="chapter-divider mt-16">
            <ScrollReveal animation="scale">
              <span className="text-[10px] font-black tracking-[0.4em] text-purple-400/60 uppercase">
                Chapter 03
              </span>
            </ScrollReveal>
          </div>

          <ScrollReveal animation="fade-up">
            <section
              className="mt-8 rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-6 sm:rounded-[2rem] sm:p-8 interactive-card"
              aria-labelledby="data-sources-heading"
            >
              <h2
                id="data-sources-heading"
                className="flex items-center gap-3 text-sm font-black uppercase tracking-[0.2em] text-foreground/50"
              >
                <Database className="h-4 w-4 text-purple-400" aria-hidden />
                Data Sources &amp; Methodology
              </h2>

              <p className="mt-4 text-sm leading-relaxed text-foreground/60">
                Every metric on Best City Spots comes from a verifiable source. We believe in full transparency so you can cross-check any data point we present.
              </p>

              <ul className="mt-6 grid gap-4 sm:grid-cols-2" role="list">
                {dataSources.map((source, index) => (
                  <ScrollReveal
                    key={source.name}
                    animation="fade-left"
                    staggerIndex={index}
                    staggerDelay={0.15}
                  >
                    <li className="flex gap-3 text-sm text-foreground/70">
                      <motion.span
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 + index * 0.1, type: "spring" }}
                        className="text-purple-400 flex-shrink-0"
                        aria-hidden
                      >
                        ✓
                      </motion.span>
                      <span>
                        <strong className="text-foreground/90">{source.name}.</strong>{" "}
                        {source.description}
                      </span>
                    </li>
                  </ScrollReveal>
                ))}
              </ul>

              <p className="mt-6 text-xs leading-relaxed text-foreground/40">
                AI-generated content is always labeled. We do not fabricate reviews or testimonials. All ratings and reviews shown are sourced directly from Google Places.
              </p>
            </section>
          </ScrollReveal>

          {/* Chapter 4: Our Mission */}
          <div className="chapter-divider mt-16">
            <ScrollReveal animation="scale">
              <span className="text-[10px] font-black tracking-[0.4em] text-purple-400/60 uppercase">
                Chapter 04
              </span>
            </ScrollReveal>
          </div>

          <section className="mt-8 space-y-10" aria-labelledby="mission-heading">
            <ScrollReveal animation="fade-up">
              <div className="space-y-4">
                <h2
                  id="mission-heading"
                  className="flex items-center gap-4 text-sm font-black tracking-[0.4em] text-foreground/40 uppercase"
                >
                  Our Mission <span className="h-px flex-1 bg-foreground/5" />
                </h2>
                <p className="text-base md:text-lg leading-loose text-foreground/70">
                  Best City Spots exists to guide confident travel decisions. We highlight places that
                  match your preferences, reduce time spent comparing scattered sources, and surface
                  insights that travelers can actually use—without gatekeeping or manipulation.
                </p>
              </div>
            </ScrollReveal>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <ScrollReveal animation="fade-right">
                <motion.div
                  whileHover={shouldReduceMotion ? {} : { x: -4 }}
                  className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6 sm:rounded-[2.5rem] sm:p-8 h-full"
                >
                  <h3 className="text-xs font-black tracking-[0.3em] text-purple-300 uppercase">
                    What We Track
                  </h3>
                  <ul className="mt-6 space-y-4 text-sm text-foreground/70">
                    {whatWeTrack.map((item, index) => (
                      <ScrollReveal
                        key={item}
                        animation="fade-left"
                        staggerIndex={index}
                        staggerDelay={0.1}
                      >
                        <li className="flex items-start gap-2">
                          <motion.span
                            initial={{ width: 0 }}
                            whileInView={{ width: "0.5rem" }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.3 + index * 0.1 }}
                            className="mt-2 h-0.5 flex-shrink-0 rounded-full bg-purple-400/50"
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
                  whileHover={shouldReduceMotion ? {} : { x: 4 }}
                  className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6 sm:rounded-[2.5rem] sm:p-8 h-full"
                >
                  <h3 className="text-xs font-black tracking-[0.3em] text-purple-300 uppercase">
                    How We Curate
                  </h3>
                  <ul className="mt-6 space-y-4 text-sm text-foreground/70">
                    {howWeCurate.map((item, index) => (
                      <ScrollReveal
                        key={item}
                        animation="fade-right"
                        staggerIndex={index}
                        staggerDelay={0.1}
                      >
                        <li className="flex items-start gap-2">
                          <motion.span
                            initial={{ width: 0 }}
                            whileInView={{ width: "0.5rem" }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.3 + index * 0.1 }}
                            className="mt-2 h-0.5 flex-shrink-0 rounded-full bg-blue-400/50"
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
          <div className="chapter-divider mt-16">
            <ScrollReveal animation="scale">
              <span className="text-[10px] font-black tracking-[0.4em] text-purple-400/60 uppercase">
                Ready?
              </span>
            </ScrollReveal>
          </div>

          <ScrollReveal animation="fade-up">
            <section
              className="mt-8 rounded-2xl border border-purple-500/20 bg-purple-500/10 p-6 sm:rounded-[2.5rem] sm:p-10 relative overflow-hidden"
              aria-labelledby="cta-heading"
            >
              {/* Animated background */}
              <motion.div
                animate={shouldReduceMotion ? {} : { 
                  scale: [1, 1.2, 1],
                  opacity: [0.1, 0.2, 0.1],
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-purple-500/20 blur-[80px]"
              />

              <h2
                id="cta-heading"
                className="relative text-xs font-black tracking-[0.3em] text-purple-200 uppercase"
              >
                Ready to Explore
              </h2>

              <div className="relative mt-6 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="max-w-xl text-base md:text-lg leading-relaxed text-foreground/80">
                    Dive into the atlas to compare cities, uncover hidden gems, and plan your next
                    journey with confidence.
                  </p>
                  <p className="mt-3 text-sm text-foreground/60">
                    Try our free{" "}
                    <Link
                      href="/resources/top-cities"
                      className="font-semibold text-purple-300 underline underline-offset-2 hover:text-purple-200 transition-colors"
                    >
                      Top 50 Cities guide
                    </Link>
                    —no sign-up required.
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

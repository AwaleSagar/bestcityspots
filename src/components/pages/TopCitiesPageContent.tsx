"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion, useInView } from "framer-motion";
import { ArrowLeft, MapPin, Sparkles, Trophy, Star, Gem, ArrowRight, PartyPopper } from "lucide-react";
import ScrollProgress from "@/components/ui/ScrollProgress";
import ScrollReveal from "@/components/ui/ScrollReveal";
import InteractiveButton from "@/components/ui/InteractiveButton";
import { formatPopulation } from "@/lib/format";

interface City {
  id: number;
  city: string;
  country: string;
  lat: number;
  lng: number;
  population: number;
}

interface TopCitiesPageContentProps {
  cities: City[];
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const CONFETTI_PARTICLES = Array.from({ length: 50 }).map((_, i) => ({
  left: seededRandom(i * 1) * 100,
  duration: 2 + seededRandom(i * 2) * 2,
  xOffset: (seededRandom(i * 3) - 0.5) * 200,
  rotate: seededRandom(i * 4) * 720 - 360,
  width: 8 + seededRandom(i * 5) * 8,
  height: 8 + seededRandom(i * 6) * 8,
  isRound: seededRandom(i * 7) > 0.5,
}));

const chapters = [
  {
    id: "elite",
    title: "The Elite",
    subtitle: "Top 10 Global Destinations",
    description: "The world's most iconic cities — cultural powerhouses that define modern travel.",
    icon: Trophy,
    range: [0, 10],
    color: "from-amber-400 to-orange-500",
  },
  {
    id: "rising",
    title: "Rising Stars",
    subtitle: "Ranks 11-25",
    description: "Cities gaining momentum — vibrant destinations on every traveler's radar.",
    icon: Star,
    range: [10, 25],
    color: "from-purple-400 to-pink-500",
  },
  {
    id: "gems",
    title: "Hidden Gems",
    subtitle: "Ranks 26-50",
    description: "Discover the unexpected — cities brimming with untold stories and local charm.",
    icon: Gem,
    range: [25, 50],
    color: "from-blue-400 to-cyan-500",
  },
];

function ConfettiParticle({
  delay,
  color,
  randomValues
}: {
  delay: number;
  color: string;
  randomValues: {
    left: number;
    duration: number;
    xOffset: number;
    rotate: number;
    width: number;
    height: number;
    isRound: boolean;
  };
}) {
  return (
    <motion.div
      initial={{ y: -20, x: 0, opacity: 1, rotate: 0 }}
      animate={{
        y: "100vh",
        x: randomValues.xOffset,
        opacity: [1, 1, 0],
        rotate: randomValues.rotate,
      }}
      transition={{ duration: randomValues.duration, delay, ease: "easeIn" }}
      className="confetti-particle"
      style={{
        left: `${randomValues.left}%`,
        width: randomValues.width,
        height: randomValues.height,
        backgroundColor: color,
        borderRadius: randomValues.isRound ? "50%" : "2px",
      }}
    />
  );
}

function CityCard({
  city,
  index,
  formatPopulation: formatPop,
  onVisible,
}: {
  city: City;
  index: number;
  formatPopulation: (pop: number) => string;
  onVisible: (index: number) => void;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (isInView) {
      onVisible(index);
    }
  }, [isInView, index, onVisible]);

  return (
    <motion.li
      ref={ref}
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
      animate={
        isInView
          ? { opacity: 1, y: 0 }
          : shouldReduceMotion
          ? { opacity: 1 }
          : { opacity: 0, y: 16 }
      }
      transition={{
        duration: 0.5,
        delay: shouldReduceMotion ? 0 : Math.min(index * 0.03, 0.3),
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      <Link
        href={`/cities/${city.id}?lat=${city.lat}&lng=${city.lng}`}
        className="group city-card-glow flex min-h-[var(--touch-target-min)] items-center gap-3 rounded-xl border border-foreground/[0.04] bg-foreground/[0.01] px-4 py-3.5 transition-all duration-400 hover:border-foreground/[0.08] hover:bg-foreground/[0.025] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:min-h-[56px] sm:gap-4 sm:px-5 sm:py-4 md:rounded-2xl"
      >
        <motion.span
          initial={shouldReduceMotion ? {} : { scale: 0 }}
          animate={isInView ? { scale: 1 } : {}}
          transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border text-xs font-semibold ${
            index < 10
              ? "border-amber-500/25 bg-amber-500/8 text-amber-400"
              : index < 25
              ? "border-purple-500/25 bg-purple-500/8 text-purple-400"
              : "border-blue-500/25 bg-blue-500/8 text-blue-400"
          }`}
          aria-hidden
        >
          {index + 1}
        </motion.span>
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center text-foreground/30">
          <MapPin className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1 font-medium text-foreground/80 group-hover:text-foreground transition-colors">{city.city}</span>
        <span className="text-sm text-foreground/40">{city.country}</span>
        <span className="text-right text-sm font-medium text-foreground/30">
          {formatPop(city.population)}
        </span>
      </Link>
    </motion.li>
  );
}

function ChapterHeader({ index }: { index: number }) {
  return (
    <div className="chapter-divider mt-14 first:mt-0">
      <ScrollReveal animation="scale">
        <span className="text-[10px] font-semibold tracking-[0.3em] text-foreground/25 uppercase">
          Chapter {String(index + 1).padStart(2, "0")}
        </span>
      </ScrollReveal>
    </div>
  );
}

export default function TopCitiesPageContent({ cities }: TopCitiesPageContentProps) {
  const shouldReduceMotion = useReducedMotion();
  const [visibleCount, setVisibleCount] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiTriggered, setConfettiTriggered] = useState(false);
  const completionRef = useRef<HTMLDivElement>(null);
  const completionInView = useInView(completionRef, { once: true, amount: 0.5 });

  const handleCityVisible = useCallback((index: number) => {
    setVisibleCount((prev) => Math.max(prev, index + 1));
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect -- valid pattern for one-time triggered animation */
  useEffect(() => {
    if (completionInView && visibleCount >= 45 && !confettiTriggered) {
      setConfettiTriggered(true);
      setShowConfetti(true);
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [completionInView, visibleCount, confettiTriggered]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const confettiColors = [
    "rgb(147, 51, 234)",
    "rgb(59, 130, 246)",
    "rgb(212, 168, 67)",
    "rgb(236, 72, 153)",
    "rgb(34, 197, 94)",
  ];

  return (
    <>
      <ScrollProgress />

      <AnimatePresence>
        {showConfetti && !shouldReduceMotion && (
          <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
            {CONFETTI_PARTICLES.map((randomValues, i) => (
              <ConfettiParticle
                key={i}
                delay={i * 0.05}
                color={confettiColors[i % confettiColors.length]}
                randomValues={randomValues}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="progress-counter"
      >
        <motion.span
          key={visibleCount}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          className="text-purple-400 font-bold"
        >
          {visibleCount}
        </motion.span>
        <span className="text-foreground/40">of</span>
        <span>{cities.length}</span>
        <span className="text-foreground/40">explored</span>
      </motion.div>

      <main id="main-content" className="min-h-screen bg-transparent font-sans text-foreground">
        <div
          className="container-gutter mx-auto max-w-3xl px-4 py-12 sm:px-6"
          style={{ paddingTop: "max(3rem, calc(env(safe-area-inset-top, 0px) + 4rem))" }}
        >
          <ScrollReveal animation="fade-down" delay={0.1}>
            <nav className="mb-10 md:mb-14" aria-label="Breadcrumb">
              <Link
                href="/"
                className="group nav-link touch-target inline-flex min-h-[var(--touch-target-min)] items-center gap-3 text-foreground/45 transition-colors duration-300 hover:text-foreground py-2"
              >
                <motion.span
                  whileHover={shouldReduceMotion ? {} : { scale: 1.05 }}
                  whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-foreground/[0.06] bg-foreground/[0.02] transition-all duration-300 group-hover:border-purple-500/30 group-hover:bg-purple-500/10"
                >
                  <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" aria-hidden />
                </motion.span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em]">
                  Back to Explorer
                </span>
              </Link>
            </nav>
          </ScrollReveal>

          <header className="mb-14 md:mb-18">
            <ScrollReveal animation="fade-up" delay={0.2}>
              <div className="flex items-center gap-3 text-[11px] font-semibold tracking-[0.3em] text-purple-400/60 uppercase mb-5">
                <motion.div
                  animate={shouldReduceMotion ? {} : { rotate: [0, 360] }}
                  transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles className="h-4 w-4" />
                </motion.div>
                Interactive Guide
              </div>
            </ScrollReveal>

            <ScrollReveal animation="fade-up" delay={0.3}>
              <h1 className="text-4xl font-bold tracking-[-0.02em] text-foreground md:text-5xl">
                <span className="bg-gradient-to-r from-purple-400 via-violet-400 to-purple-300 bg-clip-text text-transparent">
                  Top 50 Cities
                </span>{" "}
                to Explore
              </h1>
            </ScrollReveal>

            <ScrollReveal animation="blur" delay={0.4}>
              <p className="mt-5 text-base leading-relaxed text-foreground/50 md:text-lg">
                Scroll through our curated collection of world cities. Each one reveals as you
                explore — making discovery feel like an adventure.{" "}
                <strong className="text-foreground/80">No sign-up required.</strong>
              </p>
            </ScrollReveal>
          </header>

          <section aria-labelledby="cities-list-heading">
            <h2 id="cities-list-heading" className="sr-only">
              List of top 50 cities with links to city guides
            </h2>

            {chapters.map((chapter, chapterIndex) => {
              const chapterCities = cities.slice(chapter.range[0], chapter.range[1]);
              const Icon = chapter.icon;

              return (
                <div key={chapter.id}>
                  <ChapterHeader index={chapterIndex} />

                  <ScrollReveal animation="fade-up" delay={0.1}>
                    <div className="mt-6 mb-6 rounded-2xl border border-foreground/[0.06] bg-foreground/[0.015] p-6 md:p-7">
                      <div className="flex items-start gap-4">
                        <motion.div
                          whileHover={shouldReduceMotion ? {} : { rotate: 10, scale: 1.05 }}
                          className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${chapter.color} text-white shadow-lg`}
                        >
                          <Icon className="h-6 w-6" />
                        </motion.div>
                        <div>
                          <h3 className="text-xl font-bold tracking-tight text-foreground">
                            {chapter.title}
                          </h3>
                          <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-foreground/35 mt-1">
                            {chapter.subtitle}
                          </p>
                          <p className="text-sm text-foreground/45 mt-2">{chapter.description}</p>
                        </div>
                      </div>
                    </div>
                  </ScrollReveal>

                  <ol className="space-y-2" start={chapter.range[0] + 1}>
                    {chapterCities.map((city, index) => (
                      <CityCard
                        key={city.id}
                        city={city}
                        index={chapter.range[0] + index}
                        formatPopulation={formatPopulation}
                        onVisible={handleCityVisible}
                      />
                    ))}
                  </ol>
                </div>
              );
            })}
          </section>

          <div ref={completionRef} className="chapter-divider mt-20">
            <ScrollReveal animation="scale">
              <span className="text-[10px] font-semibold tracking-[0.3em] text-purple-400/50 uppercase">
                Journey Complete
              </span>
            </ScrollReveal>
          </div>

          <ScrollReveal animation="fade-up">
            <section
              className="noise-overlay mt-8 rounded-2xl border border-purple-500/15 bg-gradient-to-br from-purple-500/[0.06] via-purple-500/[0.03] to-transparent p-8 md:p-10 relative overflow-hidden"
              aria-labelledby="cta-heading"
            >
              <motion.div
                animate={
                  shouldReduceMotion
                    ? {}
                    : {
                        scale: [1, 1.2, 1],
                        opacity: [0.08, 0.18, 0.08],
                      }
                }
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-purple-500/15 blur-[100px]"
              />

              <div className="relative">
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                  className="flex items-center gap-3 mb-4"
                >
                  <PartyPopper className="h-6 w-6 text-purple-300/80" />
                  <h2
                    id="cta-heading"
                    className="text-[11px] font-semibold uppercase tracking-[0.2em] text-purple-300/70"
                  >
                    You explored all 50 cities!
                  </h2>
                </motion.div>

                <p className="mt-2 text-foreground/60 max-w-xl leading-relaxed">
                  Each city has a full guide with metrics, AI briefings, and experiences. Click any city
                  above to dive deeper, or start fresh from the homepage.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <InteractiveButton href="/" variant="primary" iconAfter={<ArrowRight className="h-4 w-4" />}>
                    Go to Explorer
                  </InteractiveButton>
                  <InteractiveButton
                    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                    variant="secondary"
                  >
                    Back to Top
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

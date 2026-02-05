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

// Pre-generate confetti random values at module level to maintain React purity
// Using a simple seeded random for deterministic but varied values
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

// Chapter definitions
const chapters = [
  {
    id: "elite",
    title: "The Elite",
    subtitle: "Top 10 Global Destinations",
    description: "The world's most iconic cities—cultural powerhouses that define modern travel.",
    icon: Trophy,
    range: [0, 10],
    color: "from-amber-400 to-orange-500",
  },
  {
    id: "rising",
    title: "Rising Stars",
    subtitle: "Ranks 11-25",
    description: "Cities gaining momentum—vibrant destinations on every traveler's radar.",
    icon: Star,
    range: [10, 25],
    color: "from-purple-400 to-pink-500",
  },
  {
    id: "gems",
    title: "Hidden Gems",
    subtitle: "Ranks 26-50",
    description: "Discover the unexpected—cities brimming with untold stories and local charm.",
    icon: Gem,
    range: [25, 50],
    color: "from-blue-400 to-cyan-500",
  },
];

// Confetti particle component - uses pre-computed random values for React purity
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

// City card component
function CityCard({
  city,
  index,
  formatPopulation,
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
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20, scale: 0.95 }}
      animate={
        isInView
          ? { opacity: 1, y: 0, scale: 1 }
          : shouldReduceMotion
          ? { opacity: 1 }
          : { opacity: 0, y: 20, scale: 0.95 }
      }
      transition={{
        duration: 0.5,
        delay: shouldReduceMotion ? 0 : Math.min(index * 0.03, 0.3),
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      <Link
        href={`/cities/${city.id}?lat=${city.lat}&lng=${city.lng}`}
        className="liquid-glass city-card-glow flex min-h-[var(--touch-target-min)] items-center gap-3 rounded-2xl border border-foreground/5 px-4 py-3 transition-all duration-300 hover:border-foreground/15 hover:bg-foreground/[0.04] hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:min-h-[56px] sm:gap-4 sm:px-5 sm:py-4"
      >
        <motion.span
          initial={shouldReduceMotion ? {} : { scale: 0 }}
          animate={isInView ? { scale: 1 } : {}}
          transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border text-xs font-bold ${
            index < 10
              ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
              : index < 25
              ? "border-purple-500/30 bg-purple-500/10 text-purple-400"
              : "border-blue-500/30 bg-blue-500/10 text-blue-400"
          }`}
          aria-hidden
        >
          {index + 1}
        </motion.span>
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center text-foreground/40">
          <MapPin className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1 font-semibold text-foreground">{city.city}</span>
        <span className="text-sm text-foreground/50">{city.country}</span>
        <span className="text-right text-sm font-medium text-foreground/40">
          {formatPopulation(city.population)}
        </span>
      </Link>
    </motion.li>
  );
}

// Chapter header component
function ChapterHeader({ index }: { index: number }) {
  return (
    <div className="chapter-divider mt-12 first:mt-0">
      <ScrollReveal animation="scale">
        <span className="text-[10px] font-black tracking-[0.4em] text-foreground/30 uppercase">
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

  // Trigger confetti when user reaches the end
  /* eslint-disable react-hooks/set-state-in-effect -- valid pattern for one-time triggered animation */
  useEffect(() => {
    if (completionInView && visibleCount >= 45 && !confettiTriggered) {
      setConfettiTriggered(true);
      setShowConfetti(true);
      // Auto-hide confetti after animation
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [completionInView, visibleCount, confettiTriggered]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const confettiColors = [
    "rgb(147, 51, 234)", // purple
    "rgb(59, 130, 246)", // blue
    "rgb(251, 191, 36)", // amber
    "rgb(236, 72, 153)", // pink
    "rgb(34, 197, 94)", // green
  ];

  return (
    <>
      <ScrollProgress />

      {/* Confetti celebration */}
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

      {/* Progress counter */}
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
          className="text-purple-400 font-black"
        >
          {visibleCount}
        </motion.span>
        <span className="text-foreground/50">of</span>
        <span>{cities.length}</span>
        <span className="text-foreground/50">cities explored</span>
      </motion.div>

      <main id="main-content" className="min-h-screen bg-transparent font-sans text-foreground">
        <div
          className="container-gutter mx-auto max-w-3xl px-4 py-12 sm:px-6"
          style={{ paddingTop: "max(3rem, calc(env(safe-area-inset-top, 0px) + 4rem))" }}
        >
          {/* Navigation */}
          <ScrollReveal animation="fade-down" delay={0.1}>
            <nav className="mb-8 md:mb-12" aria-label="Breadcrumb">
              <Link
                href="/"
                className="group touch-target inline-flex min-h-[var(--touch-target-min)] items-center gap-3 text-foreground/50 transition-colors hover:text-foreground py-2"
              >
                <motion.span
                  whileHover={shouldReduceMotion ? {} : { scale: 1.1 }}
                  whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
                  className="liquid-glass flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-foreground/10 bg-foreground/[0.03] transition-colors group-hover:border-purple-500/40 group-hover:bg-purple-500/20"
                >
                  <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" aria-hidden />
                </motion.span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                  Back to Explorer
                </span>
              </Link>
            </nav>
          </ScrollReveal>

          {/* Header */}
          <header className="mb-12">
            <ScrollReveal animation="fade-up" delay={0.2}>
              <div className="flex items-center gap-3 text-[10px] font-black tracking-[0.4em] text-purple-400 uppercase mb-4">
                <motion.div
                  animate={shouldReduceMotion ? {} : { rotate: [0, 360] }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles className="h-4 w-4" />
                </motion.div>
                Interactive Guide
              </div>
            </ScrollReveal>

            <ScrollReveal animation="fade-up" delay={0.3}>
              <h1 className="text-4xl font-black tracking-tight text-foreground md:text-5xl">
                <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                  Top 50 Cities
                </span>{" "}
                to Explore
              </h1>
            </ScrollReveal>

            <ScrollReveal animation="blur" delay={0.4}>
              <p className="mt-4 text-base leading-relaxed text-foreground/70 md:text-lg">
                Scroll through our curated collection of world cities. Each one reveals as you
                explore—making discovery feel like an adventure.{" "}
                <strong className="text-foreground/90">No sign-up required.</strong>
              </p>
            </ScrollReveal>
          </header>

          {/* Cities by Chapter */}
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

                  {/* Chapter intro card */}
                  <ScrollReveal animation="fade-up" delay={0.1}>
                    <div className="mt-6 mb-6 rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-6">
                      <div className="flex items-start gap-4">
                        <motion.div
                          whileHover={shouldReduceMotion ? {} : { rotate: 15, scale: 1.1 }}
                          className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${chapter.color} text-white shadow-lg`}
                        >
                          <Icon className="h-6 w-6" />
                        </motion.div>
                        <div>
                          <h3 className="text-xl font-black tracking-tight text-foreground">
                            {chapter.title}
                          </h3>
                          <p className="text-xs font-bold uppercase tracking-widest text-foreground/40 mt-1">
                            {chapter.subtitle}
                          </p>
                          <p className="text-sm text-foreground/60 mt-2">{chapter.description}</p>
                        </div>
                      </div>
                    </div>
                  </ScrollReveal>

                  {/* Cities list */}
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

          {/* Completion celebration */}
          <div ref={completionRef} className="chapter-divider mt-16">
            <ScrollReveal animation="scale">
              <span className="text-[10px] font-black tracking-[0.4em] text-purple-400/60 uppercase">
                Journey Complete
              </span>
            </ScrollReveal>
          </div>

          <ScrollReveal animation="fade-up">
            <section
              className="mt-8 rounded-2xl border border-purple-500/20 bg-purple-500/10 p-8 relative overflow-hidden"
              aria-labelledby="cta-heading"
            >
              {/* Animated background */}
              <motion.div
                animate={
                  shouldReduceMotion
                    ? {}
                    : {
                        scale: [1, 1.3, 1],
                        opacity: [0.1, 0.25, 0.1],
                      }
                }
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-purple-500/20 blur-[80px]"
              />

              <div className="relative">
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                  className="flex items-center gap-3 mb-4"
                >
                  <PartyPopper className="h-6 w-6 text-purple-300" />
                  <h2
                    id="cta-heading"
                    className="text-sm font-black uppercase tracking-[0.2em] text-purple-300"
                  >
                    You explored all 50 cities!
                  </h2>
                </motion.div>

                <p className="mt-2 text-foreground/80 max-w-xl">
                  Each city has a full guide with metrics, AI briefings, and experiences. Click any city
                  above to dive deeper, or start fresh from the homepage.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
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

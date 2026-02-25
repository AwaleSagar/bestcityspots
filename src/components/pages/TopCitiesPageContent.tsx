"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, ArrowUpRight, Globe2, Users, BarChart3, MapPin } from "lucide-react";
import ScrollProgress from "@/components/ui/ScrollProgress";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { formatPopulation } from "@/lib/format";

interface City {
  id: number;
  city: string;
  country: string;
  iso3?: string;
  admin_name?: string;
  capital?: string;
  lat: number;
  lng: number;
  population: number;
}

interface TopCitiesPageContentProps {
  cities: City[];
}

const tiers = [
  {
    id: "tier-1",
    label: "1 — 10",
    title: "Global Leaders",
    range: [0, 10] as const,
  },
  {
    id: "tier-2",
    label: "11 — 25",
    title: "Major Hubs",
    range: [10, 25] as const,
  },
  {
    id: "tier-3",
    label: "26 — 50",
    title: "Emerging Destinations",
    range: [25, 50] as const,
  },
];

function FeaturedCityCard({ city, rank }: { city: City; rank: number }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      whileHover={shouldReduceMotion ? {} : { y: -4 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
    >
      <Link
        href={`/cities/${city.id}?lat=${city.lat}&lng=${city.lng}`}
        className="group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-foreground/[0.05] bg-foreground/[0.015] p-6 transition-all duration-500 hover:border-purple-500/15 hover:shadow-xl md:rounded-3xl md:p-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40"
      >
        {/* Rank */}
        <div className="mb-6 flex items-start justify-between">
          <span className="text-5xl font-bold tracking-[-0.04em] text-foreground/[0.06] md:text-6xl">
            {String(rank).padStart(2, "0")}
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-foreground/[0.06] bg-foreground/[0.02] text-foreground/30 transition-all duration-300 group-hover:border-purple-500/25 group-hover:bg-purple-500/8 group-hover:text-purple-400">
            <ArrowUpRight className="h-4 w-4" />
          </div>
        </div>

        {/* City info */}
        <div className="space-y-3">
          <h3 className="text-xl font-bold tracking-[-0.01em] text-foreground transition-colors group-hover:text-foreground md:text-2xl">
            {city.city}
          </h3>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-foreground/40">
            <span>{city.country}</span>
            {city.admin_name && (
              <>
                <span className="text-foreground/15">·</span>
                <span className="text-foreground/30">{city.admin_name}</span>
              </>
            )}
          </div>
        </div>

        {/* Data row */}
        <div className="mt-6 flex items-center gap-4 border-t border-foreground/[0.04] pt-5">
          <div>
            <div className="text-lg font-bold tracking-tight text-foreground">
              {formatPopulation(city.population)}
            </div>
            <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-foreground/30">
              Population
            </div>
          </div>
          {city.capital === "primary" && (
            <div className="ml-auto rounded-md border border-amber-500/20 bg-amber-500/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-400/80">
              Capital
            </div>
          )}
          {city.iso3 && (
            <div className={`${city.capital === "primary" ? "" : "ml-auto"} font-mono text-xs text-foreground/20`}>
              {city.iso3}
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

function CityRow({ city, rank }: { city: City; rank: number }) {
  return (
    <Link
      href={`/cities/${city.id}?lat=${city.lat}&lng=${city.lng}`}
      className="group flex items-center gap-4 rounded-xl border border-transparent px-4 py-3.5 transition-all duration-300 hover:border-foreground/[0.05] hover:bg-foreground/[0.015] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40 sm:px-5 sm:py-4 md:gap-5"
    >
      {/* Rank */}
      <span className="w-8 flex-shrink-0 text-right font-mono text-sm text-foreground/20 md:w-10">
        {rank}
      </span>

      {/* City */}
      <span className="min-w-0 flex-1 font-medium text-foreground/75 transition-colors group-hover:text-foreground">
        {city.city}
      </span>

      {/* Country */}
      <span className="hidden text-sm text-foreground/35 sm:block">
        {city.country}
      </span>

      {/* Region */}
      <span className="hidden text-sm text-foreground/20 md:block md:w-32 md:text-right">
        {city.admin_name || "—"}
      </span>

      {/* Capital badge */}
      <span className="hidden w-16 text-center md:block">
        {city.capital === "primary" ? (
          <span className="rounded-md border border-amber-500/15 bg-amber-500/[0.04] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-400/70">
            Capital
          </span>
        ) : (
          <span className="text-foreground/10">—</span>
        )}
      </span>

      {/* Population */}
      <span className="w-16 text-right font-mono text-sm text-foreground/30 sm:w-20">
        {formatPopulation(city.population)}
      </span>

      {/* Arrow */}
      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-foreground/15 transition-all duration-300 group-hover:bg-foreground/[0.04] group-hover:text-foreground/40">
        <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}

function TierDivider({ label, title }: { label: string; title: string }) {
  return (
    <ScrollReveal animation="fade-up">
      <div className="flex items-center gap-5 pb-2 pt-6 md:gap-6 md:pt-8">
        <span className="font-mono text-xs text-foreground/20">{label}</span>
        <div className="h-px flex-1 bg-foreground/[0.04]" />
        <span className="text-xs font-medium text-foreground/25">{title}</span>
      </div>
    </ScrollReveal>
  );
}

export default function TopCitiesPageContent({ cities }: TopCitiesPageContentProps) {
  const stats = useMemo(() => {
    const countries = new Set(cities.map((c) => c.country));
    const capitals = cities.filter((c) => c.capital === "primary").length;
    const totalPop = cities.reduce((sum, c) => sum + (c.population || 0), 0);
    return { countries: countries.size, capitals, totalPop };
  }, [cities]);

  return (
    <>
      <ScrollProgress />

      <main id="main-content" className="min-h-screen bg-transparent font-sans text-foreground">
        <div
          className="container-gutter mx-auto max-w-5xl px-4 py-12 sm:px-6"
          style={{ paddingTop: "max(3rem, calc(env(safe-area-inset-top, 0px) + 4rem))" }}
        >
          {/* Back nav */}
          <ScrollReveal animation="fade-down" delay={0.1}>
            <nav className="mb-12 md:mb-16" aria-label="Breadcrumb">
              <Link
                href="/"
                className="group nav-link touch-target inline-flex min-h-[var(--touch-target-min)] items-center gap-3 text-foreground/40 transition-colors duration-300 hover:text-foreground py-2"
              >
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-foreground/[0.06] bg-foreground/[0.02] transition-all duration-300 group-hover:border-purple-500/25 group-hover:bg-purple-500/8">
                  <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" aria-hidden />
                </span>
                <span className="text-[11px] font-medium uppercase tracking-[0.15em]">
                  Back to Explorer
                </span>
              </Link>
            </nav>
          </ScrollReveal>

          {/* ─── HERO ─── */}
          <header className="mb-16 md:mb-20">
            <ScrollReveal animation="fade-up" delay={0.2}>
              <span className="mb-5 inline-block text-[11px] font-medium tracking-[0.3em] text-foreground/25 uppercase">
                Reference Index — Updated {new Date().getFullYear()}
              </span>
            </ScrollReveal>

            <ScrollReveal animation="fade-up" delay={0.3}>
              <h1 className="text-4xl font-bold tracking-[-0.03em] text-foreground md:text-5xl lg:text-6xl">
                The Global 50
              </h1>
            </ScrollReveal>

            <ScrollReveal animation="fade-up" delay={0.4}>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-foreground/45 md:text-lg">
                A curated ranking of the world&apos;s most significant urban centers,
                ordered by metropolitan population. Each city links to a full guide with
                AI-powered insights, real-time weather, and curated local experiences.
              </p>
            </ScrollReveal>

            {/* Key stats strip */}
            <ScrollReveal animation="fade-up" delay={0.5}>
              <div className="mt-10 flex flex-wrap items-center gap-6 border-t border-foreground/[0.04] pt-8 md:gap-10">
                <div className="flex items-center gap-2.5">
                  <BarChart3 className="h-4 w-4 text-foreground/20" />
                  <span className="text-sm font-medium text-foreground/50">
                    <strong className="text-foreground/75">{cities.length}</strong> Cities
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Globe2 className="h-4 w-4 text-foreground/20" />
                  <span className="text-sm font-medium text-foreground/50">
                    <strong className="text-foreground/75">{stats.countries}</strong> Countries
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <MapPin className="h-4 w-4 text-foreground/20" />
                  <span className="text-sm font-medium text-foreground/50">
                    <strong className="text-foreground/75">{stats.capitals}</strong> Capitals
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Users className="h-4 w-4 text-foreground/20" />
                  <span className="text-sm font-medium text-foreground/50">
                    <strong className="text-foreground/75">{formatPopulation(stats.totalPop)}</strong> Combined Pop.
                  </span>
                </div>
              </div>
            </ScrollReveal>

            {/* Methodology note */}
            <ScrollReveal animation="fade-up" delay={0.55}>
              <div className="mt-8 rounded-xl border border-foreground/[0.04] bg-foreground/[0.01] px-5 py-4 md:px-6">
                <p className="text-xs leading-relaxed text-foreground/35">
                  <strong className="text-foreground/50">Methodology.</strong>{" "}
                  Cities are ranked by metropolitan population using data from public census
                  databases and verified geographic sources. All data is refreshable and
                  cross-referenced — see{" "}
                  <Link href="/about" className="text-purple-400/60 underline underline-offset-2 decoration-purple-400/20 hover:text-purple-400 transition-colors">
                    our data sources
                  </Link>{" "}
                  for full transparency. Rankings reflect urban scale; individual city
                  guides layer in climate, culture, and AI-curated insights for a
                  complete picture.
                </p>
              </div>
            </ScrollReveal>
          </header>

          {/* ─── RANKINGS ─── */}
          <section aria-labelledby="cities-list-heading">
            <h2 id="cities-list-heading" className="sr-only">
              Ranked list of top 50 cities
            </h2>

            {tiers.map((tier) => {
              const tierCities = cities.slice(tier.range[0], tier.range[1]);
              const isFeaturedTier = tier.id === "tier-1";

              return (
                <div key={tier.id} className="mb-12 md:mb-16">
                  <TierDivider label={tier.label} title={tier.title} />

                  {isFeaturedTier ? (
                    /* Featured grid for the top 10 */
                    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5">
                      {tierCities.map((city, idx) => (
                        <ScrollReveal
                          key={city.id}
                          animation="fade-up"
                          staggerIndex={idx}
                          staggerDelay={0.06}
                        >
                          <FeaturedCityCard
                            city={city}
                            rank={tier.range[0] + idx + 1}
                          />
                        </ScrollReveal>
                      ))}
                    </div>
                  ) : (
                    /* Compact rows for 11-50 */
                    <div className="mt-4">
                      {/* Column labels */}
                      <div className="mb-1 flex items-center gap-4 px-4 py-2 text-[10px] font-medium uppercase tracking-[0.12em] text-foreground/20 sm:px-5 md:gap-5">
                        <span className="w-8 text-right md:w-10">#</span>
                        <span className="flex-1">City</span>
                        <span className="hidden sm:block">Country</span>
                        <span className="hidden md:block md:w-32 md:text-right">Region</span>
                        <span className="hidden w-16 text-center md:block">Status</span>
                        <span className="w-16 text-right sm:w-20">Pop.</span>
                        <span className="w-7" />
                      </div>

                      <ol
                        className="divide-y divide-foreground/[0.03]"
                        start={tier.range[0] + 1}
                      >
                        {tierCities.map((city, idx) => (
                          <ScrollReveal
                            key={city.id}
                            animation="fade-up"
                            staggerIndex={idx}
                            staggerDelay={0.03}
                          >
                            <li>
                              <CityRow
                                city={city}
                                rank={tier.range[0] + idx + 1}
                              />
                            </li>
                          </ScrollReveal>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              );
            })}
          </section>

          {/* ─── FOOTER CTA ─── */}
          <ScrollReveal animation="fade-up">
            <div className="mt-8 flex flex-col items-center gap-6 border-t border-foreground/[0.04] pt-14 text-center md:pt-16">
              <p className="max-w-md text-sm leading-relaxed text-foreground/40">
                Each city above links to a full guide with AI briefings, real-time
                weather, curated landmarks, dining, and stays. Explore any city to
                start planning.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link href="/" className="btn-primary">
                  Go to Explorer
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <button
                  type="button"
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  className="btn-secondary"
                >
                  Back to Top
                </button>
              </div>
              <p className="mt-4 text-[11px] text-foreground/20">
                All data sourced from public census databases · Google Places API · Google Gemini AI
              </p>
            </div>
          </ScrollReveal>
        </div>
      </main>
    </>
  );
}

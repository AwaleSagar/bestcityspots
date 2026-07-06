"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Globe2, MapPinned, Users } from "lucide-react";
import ScrollProgress from "@/components/ui/ScrollProgress";
import ScrollReveal from "@/components/ui/ScrollReveal";
import PrioritiesMixer from "@/components/features/mixer/PrioritiesMixer";
import { formatPopulation } from "@/lib/format";
import { cityHref } from "@/lib/cities";

interface City {
  id: number;
  city: string;
  country: string;
  iso3?: string;
  admin_name?: string;
  capital?: string;
  slug?: string;
  lat: number;
  lng: number;
  population: number;
}

interface TopCitiesPageContentProps {
  cities: City[];
}

const bands = [
  {
    label: "01-10",
    title: "Global anchors",
    cities: (items: City[]) => items.slice(0, 10),
  },
  {
    label: "11-25",
    title: "Major hubs",
    cities: (items: City[]) => items.slice(10, 25),
  },
  {
    label: "26-50",
    title: "Scale with momentum",
    cities: (items: City[]) => items.slice(25, 50),
  },
];

function CityCard({ city, rank }: { city: City; rank: number }) {
  return (
    <Link
      href={cityHref(city, { lat: city.lat, lng: city.lng })}
      className="atlas-panel interactive-card flex h-full flex-col justify-between rounded-xl p-4 sm:rounded-2xl sm:p-5 md:rounded-3xl md:p-6"
    >
      <div>
        <p className="text-muted font-mono text-xs tracking-[0.24em] uppercase">
          Rank {String(rank).padStart(2, "0")}
        </p>
        <h3 className="text-foreground mt-3 text-[2.2rem] leading-none">{city.city}</h3>
        <p className="text-muted-strong mt-2 text-sm tracking-[0.14em] uppercase">
          {city.country}
          {city.admin_name ? ` / ${city.admin_name}` : ""}
        </p>
      </div>

      <div className="border-line mt-6 flex items-end justify-between gap-4 border-t pt-4">
        <div>
          <p className="text-foreground text-lg font-semibold">
            {formatPopulation(city.population)}
          </p>
          <p className="text-muted text-xs tracking-[0.22em] uppercase">Population</p>
        </div>
        <div className="flex items-center gap-2">
          {city.capital === "primary" ? <span className="badge-featured">Capital</span> : null}
          <ArrowRight className="text-accent h-4 w-4" aria-hidden />
        </div>
      </div>
    </Link>
  );
}

function CityRow({ city, rank }: { city: City; rank: number }) {
  return (
    <Link
      href={cityHref(city, { lat: city.lat, lng: city.lng })}
      className="group hover:border-line hover:bg-background/55 flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 transition-colors duration-300 sm:gap-4 sm:rounded-xl sm:px-4 sm:py-3"
    >
      <span className="text-muted w-8 shrink-0 font-mono text-xs sm:w-10 sm:text-sm">
        {String(rank).padStart(2, "0")}
      </span>
      <span className="text-foreground min-w-0 flex-1 truncate text-sm font-semibold sm:text-base">
        {city.city}
      </span>
      <span className="text-muted-strong hidden text-sm tracking-[0.12em] uppercase sm:block">
        {city.country}
      </span>
      <span className="text-muted hidden text-sm md:block">
        {city.admin_name || "Regional center"}
      </span>
      <span className="text-muted-strong w-16 text-right text-xs font-semibold sm:w-20 sm:text-sm">
        {formatPopulation(city.population)}
      </span>
      <ArrowRight className="text-accent h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1" />
    </Link>
  );
}

export default function TopCitiesPageContent({ cities }: TopCitiesPageContentProps) {
  const stats = useMemo(() => {
    const countries = new Set(cities.map((city) => city.country)).size;
    const capitals = cities.filter((city) => city.capital === "primary").length;
    const combinedPopulation = cities.reduce((total, city) => total + city.population, 0);

    return {
      countries,
      capitals,
      combinedPopulation,
    };
  }, [cities]);

  const featuredCities = cities.slice(0, 6);

  const scrollToTop = () => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  return (
    <>
      <ScrollProgress />

      <main id="main-content" className="text-foreground min-h-screen bg-transparent">
        <div
          className="container-gutter mx-auto max-w-6xl px-4 py-12 sm:px-6"
          style={{ paddingTop: "max(3rem, calc(env(safe-area-inset-top, 0px) + 4rem))" }}
        >
          <ScrollReveal animation="fade-down" delay={0.1}>
            <nav className="mb-10" aria-label="Breadcrumb">
              <Link
                href="/"
                className="border-line bg-background/65 text-muted-strong hover:text-foreground inline-flex items-center gap-3 rounded-full border px-4 py-3 text-xs font-bold tracking-[0.18em] uppercase transition-colors duration-300"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Back to explorer
              </Link>
            </nav>
          </ScrollReveal>

          <header className="atlas-frame rounded-2xl p-5 sm:rounded-3xl md:rounded-4xl md:p-8 lg:p-10">
            <ScrollReveal animation="fade-up">
              <span className="eyebrow">The Global 50</span>
            </ScrollReveal>
            <ScrollReveal animation="fade-up" delay={0.1}>
              <h1 className="page-title text-foreground mt-6 max-w-4xl">
                Fifty cities to start from when the trip is still wide open.
              </h1>
            </ScrollReveal>
            <ScrollReveal animation="fade-up" delay={0.2}>
              <p className="lede mt-5 max-w-3xl">
                This ranking is a fast editorial index of urban scale. Use it when you want a strong
                first shortlist, then open individual city guides for weather, briefings, places,
                and saved planning notes.
              </p>
            </ScrollReveal>

            <ScrollReveal animation="fade-up" delay={0.3}>
              <div className="mt-8 grid gap-3 md:grid-cols-3">
                <div className="atlas-panel rounded-lg p-4 sm:rounded-xl md:rounded-2xl">
                  <div className="text-muted flex items-center gap-2 text-xs font-bold tracking-[0.22em] uppercase">
                    <Globe2 className="text-accent h-4 w-4" aria-hidden />
                    Countries
                  </div>
                  <p className="text-foreground mt-3 text-3xl leading-none">{stats.countries}</p>
                </div>
                <div className="atlas-panel rounded-2xl p-4">
                  <div className="text-muted flex items-center gap-2 text-xs font-bold tracking-[0.22em] uppercase">
                    <MapPinned className="text-accent h-4 w-4" aria-hidden />
                    Capitals
                  </div>
                  <p className="text-foreground mt-3 text-3xl leading-none">{stats.capitals}</p>
                </div>
                <div className="atlas-panel rounded-2xl p-4">
                  <div className="text-muted flex items-center gap-2 text-xs font-bold tracking-[0.22em] uppercase">
                    <Users className="text-accent h-4 w-4" aria-hidden />
                    Combined population
                  </div>
                  <p className="text-foreground mt-3 text-3xl leading-none">
                    {formatPopulation(stats.combinedPopulation)}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          </header>

          {/* Priorities Mixer (innovation proposal Idea 3): private,
              client-side re-ranking over the public metrics cache. */}
          <ScrollReveal animation="fade-up">
            <PrioritiesMixer cities={cities} />
          </ScrollReveal>

          <section className="mt-12">
            <div className="labelled-rule">Featured Cities</div>
            <ScrollReveal animation="fade-up">
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {featuredCities.map((city, index) => (
                  <CityCard key={city.id} city={city} rank={index + 1} />
                ))}
              </div>
            </ScrollReveal>
          </section>

          <section className="mt-16" aria-labelledby="cities-list-heading">
            <h2 id="cities-list-heading" className="sr-only">
              Ranked list of top 50 cities
            </h2>

            {bands.map((band) => {
              const bandCities = band.cities(cities);
              const startRank = cities.indexOf(bandCities[0]) + 1;

              return (
                <ScrollReveal key={band.label} animation="fade-up">
                  <div className="mt-10">
                    <div className="labelled-rule">
                      {band.label} / {band.title}
                    </div>
                    <div className="atlas-frame mt-4 rounded-xl p-3 sm:rounded-2xl md:rounded-3xl md:p-4">
                      <div className="text-muted mb-2 hidden items-center gap-4 px-4 py-2 text-xs font-bold tracking-[0.2em] uppercase sm:flex">
                        <span className="w-10">Rank</span>
                        <span className="flex-1">City</span>
                        <span>Country</span>
                        <span className="hidden md:block">Region</span>
                        <span className="w-20 text-right">Population</span>
                        <span className="w-4" />
                      </div>

                      <div className="divide-line/80 divide-y">
                        {bandCities.map((city, index) => (
                          <CityRow key={city.id} city={city} rank={startRank + index} />
                        ))}
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              );
            })}
          </section>

          <ScrollReveal animation="fade-up">
            <section className="atlas-panel-strong mt-16 rounded-2xl p-5 sm:rounded-3xl md:rounded-3xl md:p-8">
              <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                <p className="text-muted-strong max-w-2xl text-base leading-8 md:text-lg">
                  Every city above links to a full guide with AI briefings, live weather, curated
                  places, and a personal save flow for trip planning.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link href="/" className="btn-primary">
                    Go to explorer
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <button
                    type="button"
                    onClick={scrollToTop}
                    className="btn-secondary"
                  >
                    Back to top
                  </button>
                </div>
              </div>
            </section>
          </ScrollReveal>
        </div>
      </main>
    </>
  );
}

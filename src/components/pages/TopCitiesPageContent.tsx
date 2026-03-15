"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Globe2, MapPinned, Users } from "lucide-react";
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
      href={`/cities/${city.id}?lat=${city.lat}&lng=${city.lng}`}
      className="atlas-panel interactive-card flex h-full flex-col justify-between rounded-[1.2rem] p-4 sm:rounded-[1.5rem] sm:p-5 md:rounded-[1.8rem] md:p-6"
    >
      <div>
        <p className="font-mono text-[0.72rem] uppercase tracking-[0.24em] text-muted">
          Rank {String(rank).padStart(2, "0")}
        </p>
        <h3 className="mt-3 text-[2.2rem] leading-none text-foreground">{city.city}</h3>
        <p className="mt-2 text-sm uppercase tracking-[0.14em] text-muted-strong">
          {city.country}
          {city.admin_name ? ` / ${city.admin_name}` : ""}
        </p>
      </div>

      <div className="mt-6 flex items-end justify-between gap-4 border-t border-line pt-4">
        <div>
          <p className="text-lg font-semibold text-foreground">{formatPopulation(city.population)}</p>
          <p className="text-[0.68rem] uppercase tracking-[0.22em] text-muted">Population</p>
        </div>
        <div className="flex items-center gap-2">
          {city.capital === "primary" ? <span className="badge-featured">Capital</span> : null}
          <ArrowRight className="h-4 w-4 text-accent" aria-hidden />
        </div>
      </div>
    </Link>
  );
}

function CityRow({ city, rank }: { city: City; rank: number }) {
  return (
    <Link
      href={`/cities/${city.id}?lat=${city.lat}&lng=${city.lng}`}
      className="group flex items-center gap-3 rounded-[1rem] border border-transparent px-3 py-2.5 transition-colors duration-300 hover:border-line hover:bg-background/55 sm:gap-4 sm:px-4 sm:py-3 sm:rounded-[1.2rem]"
    >
      <span className="w-8 shrink-0 font-mono text-xs text-muted sm:w-10 sm:text-sm">{String(rank).padStart(2, "0")}</span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground sm:text-base">{city.city}</span>
      <span className="hidden text-sm uppercase tracking-[0.12em] text-muted-strong sm:block">
        {city.country}
      </span>
      <span className="hidden text-sm text-muted md:block">{city.admin_name || "Regional center"}</span>
      <span className="w-16 text-right text-xs font-semibold text-muted-strong sm:w-20 sm:text-sm">
        {formatPopulation(city.population)}
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-accent transition-transform duration-300 group-hover:translate-x-1" />
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

  return (
    <>
      <ScrollProgress />

      <main id="main-content" className="min-h-screen bg-transparent text-foreground">
        <div
          className="container-gutter mx-auto max-w-6xl px-4 py-12 sm:px-6"
          style={{ paddingTop: "max(3rem, calc(env(safe-area-inset-top, 0px) + 4rem))" }}
        >
          <ScrollReveal animation="fade-down" delay={0.1}>
            <nav className="mb-10" aria-label="Breadcrumb">
              <Link
                href="/"
                className="inline-flex items-center gap-3 rounded-full border border-line bg-background/65 px-4 py-3 text-[0.72rem] font-bold uppercase tracking-[0.18em] text-muted-strong transition-colors duration-300 hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Back to explorer
              </Link>
            </nav>
          </ScrollReveal>

          <header className="atlas-frame rounded-[1.6rem] p-5 sm:rounded-[2rem] md:rounded-[2.4rem] md:p-8 lg:p-10">
            <ScrollReveal animation="fade-up">
              <span className="eyebrow">The Global 50</span>
            </ScrollReveal>
            <ScrollReveal animation="fade-up" delay={0.1}>
              <h1 className="mt-6 max-w-4xl page-title text-foreground">
                Fifty cities to start from when the trip is still wide open.
              </h1>
            </ScrollReveal>
            <ScrollReveal animation="fade-up" delay={0.2}>
              <p className="mt-5 max-w-3xl lede">
                This ranking is a fast editorial index of urban scale. Use it when you want a strong
                first shortlist, then open individual city guides for weather, briefings, places, and
                saved planning notes.
              </p>
            </ScrollReveal>

            <ScrollReveal animation="fade-up" delay={0.3}>
              <div className="mt-8 grid gap-3 md:grid-cols-3">
                  <div className="atlas-panel rounded-[1.1rem] p-4 sm:rounded-[1.3rem] md:rounded-[1.5rem]">
                  <div className="flex items-center gap-2 text-[0.72rem] font-bold uppercase tracking-[0.22em] text-muted">
                    <Globe2 className="h-4 w-4 text-accent" aria-hidden />
                    Countries
                  </div>
                  <p className="mt-3 text-3xl leading-none text-foreground">{stats.countries}</p>
                </div>
                <div className="atlas-panel rounded-[1.5rem] p-4">
                  <div className="flex items-center gap-2 text-[0.72rem] font-bold uppercase tracking-[0.22em] text-muted">
                    <MapPinned className="h-4 w-4 text-accent" aria-hidden />
                    Capitals
                  </div>
                  <p className="mt-3 text-3xl leading-none text-foreground">{stats.capitals}</p>
                </div>
                <div className="atlas-panel rounded-[1.5rem] p-4">
                  <div className="flex items-center gap-2 text-[0.72rem] font-bold uppercase tracking-[0.22em] text-muted">
                    <Users className="h-4 w-4 text-accent" aria-hidden />
                    Combined population
                  </div>
                  <p className="mt-3 text-3xl leading-none text-foreground">
                    {formatPopulation(stats.combinedPopulation)}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          </header>

          <section className="mt-12">
            <div className="labelled-rule">Featured Cities</div>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {featuredCities.map((city, index) => (
                <ScrollReveal key={city.id} animation="fade-up" staggerIndex={index} staggerDelay={0.08}>
                  <CityCard city={city} rank={index + 1} />
                </ScrollReveal>
              ))}
            </div>
          </section>

          <section className="mt-16" aria-labelledby="cities-list-heading">
            <h2 id="cities-list-heading" className="sr-only">
              Ranked list of top 50 cities
            </h2>

            {bands.map((band) => {
              const bandCities = band.cities(cities);
              const startRank = cities.indexOf(bandCities[0]) + 1;

              return (
                <div key={band.label} className="mt-10">
                  <div className="labelled-rule">
                    {band.label} / {band.title}
                  </div>
                  <div className="atlas-frame mt-4 rounded-[1.2rem] p-3 sm:rounded-[1.5rem] md:rounded-[1.8rem] md:p-4">
                    <div className="mb-2 hidden items-center gap-4 px-4 py-2 text-[0.68rem] font-bold uppercase tracking-[0.2em] text-muted sm:flex">
                      <span className="w-10">Rank</span>
                      <span className="flex-1">City</span>
                      <span>Country</span>
                      <span className="hidden md:block">Region</span>
                      <span className="w-20 text-right">Population</span>
                      <span className="w-4" />
                    </div>

                    <div className="divide-y divide-line/80">
                      {bandCities.map((city, index) => (
                        <ScrollReveal key={city.id} animation="fade-up" staggerIndex={index} staggerDelay={0.03}>
                          <CityRow city={city} rank={startRank + index} />
                        </ScrollReveal>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </section>

          <ScrollReveal animation="fade-up">
            <section className="atlas-panel-strong mt-16 rounded-[1.4rem] p-5 sm:rounded-[1.8rem] md:rounded-[2.2rem] md:p-8">
              <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                <p className="max-w-2xl text-base leading-8 text-muted-strong md:text-lg">
                  Every city above links to a full guide with AI briefings, live weather, curated places,
                  and a personal save flow for trip planning.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link href="/" className="btn-primary">
                    Go to explorer
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
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

import { getCityById } from "@/lib/cities";
import { formatPopulation } from "@/lib/format";
import { getTopPlaces } from "@/lib/places";
import { getCityMetrics } from "@/lib/metrics";
import { getCityWeather } from "@/lib/weather";
import { cityIdSchema, coordinatesSchema } from "@/lib/validation";
import ExperiencesSection from "./ExperiencesSection";
import ExperiencesSkeleton from "./ExperiencesSkeleton";
import AIBriefingSection from "./AIBriefingSection";
import AIBriefingSkeleton from "./AIBriefingSkeleton";
import CityVitals from "@/components/features/city/CityVitals";
import {
  MapPin,
  Users,
  Navigation,
  ArrowLeft,
  Activity,
  Cloud as CloudIcon,
  ThermometerSun,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import React, { Suspense } from "react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

function CityVitalsFallback() {
  return (
    <div className="rounded-2xl border border-foreground/[0.05] bg-foreground/[0.015] p-7 md:rounded-3xl md:p-8">
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground/35">
        Live City Vitals
      </div>
      <p className="mt-4 text-sm text-foreground/45">
        Vitals unavailable right now. Please check back soon.
      </p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  unit,
  icon: Icon,
  source,
}: {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
  icon: React.ComponentType<{ className?: string }>;
  source?: string;
}) {
  const isEmpty = value === null || value === undefined || value === "";
  const debugId = label.replace(/[^a-z0-9]/gi, "").slice(0, 6).toUpperCase() || "METRIC";
  const display = isEmpty ? (
    <span className="text-foreground/25">N/A</span>
  ) : (
    <div className="flex flex-col items-start leading-tight">
      <span className="text-2xl font-bold tracking-tight text-foreground">
        {typeof value === "number" ? value.toLocaleString() : value}
      </span>
      {unit && (
        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-foreground/45">
          {unit}
        </span>
      )}
    </div>
  );

  return (
    <div className="group/metric relative overflow-hidden rounded-2xl border border-foreground/[0.05] bg-foreground/[0.015] p-5 flex flex-col gap-4 transition-all duration-500 hover:border-orange-500/10">
      <div className="pointer-events-none absolute inset-0 -z-0 opacity-0 transition-opacity duration-700 group-hover/metric:opacity-100">
        <div className="animate-scan absolute top-0 left-0 h-[2px] w-full bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />
      </div>

      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] transition-all duration-300 group-hover/metric:border-orange-500/20 group-hover/metric:bg-orange-500/[0.06]">
            <Icon className="h-5 w-5 text-orange-400/60 transition-colors duration-300 group-hover/metric:text-orange-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-foreground/35">
                {label}
              </div>
              <div className="hidden text-[8px] font-mono text-orange-400/25 group-hover/metric:block">
                ID_{debugId}
              </div>
            </div>
            {display}
          </div>
        </div>
      </div>
      <div className="relative z-10 flex items-center justify-between border-t border-foreground/[0.04] pt-3">
        <div className="text-[9px] font-semibold uppercase tracking-[0.15em] text-foreground/20">
          Data Source
        </div>
        <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-foreground/35 text-right max-w-[120px] leading-relaxed">
          {isEmpty ? "Pending Discovery" : source || "Live Satellite"}
        </div>
      </div>
    </div>
  );
}

async function ExperiencesWrapper({
  cityName,
  lat,
  lng,
}: {
  cityName: string;
  lat: number;
  lng: number;
}) {
  const [landmarks, restaurants, hotels] = await Promise.all([
    getTopPlaces(cityName, "landmarks", { lat, lng }),
    getTopPlaces(cityName, "restaurants", { lat, lng }),
    getTopPlaces(cityName, "hotels", { lat, lng }),
  ]);

  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <h2 className="flex items-center gap-4 text-[11px] font-semibold tracking-[0.3em] text-foreground/35 uppercase">
          Top Experiences <span className="h-px flex-1 bg-foreground/[0.04]" />
        </h2>
        <p className="text-sm text-foreground/40 tracking-wide max-w-lg">
          Curated landmarks, dining, and stays — ranked by traveler interest and local pulse.
        </p>
      </div>
      <ExperiencesSection
        cityName={cityName}
        landmarks={landmarks}
        restaurants={restaurants}
        hotels={hotels}
      />
    </div>
  );
}

function CityVitalsSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-foreground/[0.04] bg-foreground/[0.01] p-7 md:rounded-3xl md:p-8">
      <div className="h-2 w-32 rounded bg-foreground/[0.04]" />
      <div className="mt-4 h-6 w-24 rounded bg-foreground/[0.04]" />
      <div className="mt-6 h-10 w-full rounded bg-foreground/[0.04]" />
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = cityIdSchema.safeParse(id);
  if (!result.success) return { title: "City Not Found" };

  const city = await getCityById(result.data);
  if (!city) return { title: "City Not Found" };

  return {
    title: `${city.city}, ${city.country} - Travel Guide & Urban Data`,
    description: `Comprehensive data and AI-powered travel insights for ${city.city}, ${city.country}. Real-time weather, demographics, and top attractions at Best City Spots.`,
    openGraph: {
      title: `${city.city} | Best City Spots`,
      description: `Discover ${city.city} with AI insights and live urban data.`,
      type: "website",
    },
  };
}

export default async function CityPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lat?: string; lng?: string }>;
}) {
  const { id } = await params;
  const { lat, lng } = await searchParams;

  const idResult = cityIdSchema.safeParse(id);
  const coordsResult = coordinatesSchema.safeParse({ lat, lng });

  if (!idResult.success) {
    notFound();
  }

  if (!coordsResult.success) {
    console.warn("Invalid coordinates provided:", coordsResult.error);
  }

  const cityId = idResult.data;
  const validCoords = coordsResult.success ? coordsResult.data : {};

  const city = await getCityById(cityId);

  if (!city) {
    notFound();
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    name: city.city,
    description: `Detailed travel metrics and insights for ${city.city}, ${city.country}.`,
    geo: {
      "@type": "GeoCoordinates",
      latitude: city.lat,
      longitude: city.lng,
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: city.city,
      addressCountry: city.country,
    },
  };

  const finalLat = validCoords.lat ?? city.lat;
  const finalLng = validCoords.lng ?? city.lng;
  const [metrics, weather] = await Promise.all([
    getCityMetrics(city),
    getCityWeather(city),
  ]);

  return (
    <main
      id="main-content"
      className="min-h-screen bg-transparent font-sans text-foreground"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div
        className="container-gutter mx-auto max-w-5xl px-4 py-12 sm:px-6"
        style={{ paddingTop: "max(3rem, calc(env(safe-area-inset-top, 0px) + 4rem))" }}
      >
        <Breadcrumbs
          items={[
            { label: "Cities", href: "/" },
            { label: city.city },
          ]}
        />
        <nav className="mb-10 md:mb-14" aria-label="Breadcrumb">
          <Link
            href="/"
            className="group nav-link touch-target inline-flex min-h-[var(--touch-target-min)] items-center gap-3 text-foreground/45 transition-colors duration-300 hover:text-foreground md:gap-4 py-2"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-foreground/[0.06] bg-foreground/[0.02] transition-all duration-300 group-hover:border-orange-500/30 group-hover:bg-orange-500/10 md:h-11 md:w-11">
              <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5 md:h-[18px] md:w-[18px]" />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] md:text-xs">
              Return to Explorer
            </span>
          </Link>
        </nav>

        <div className="grid grid-cols-1 items-start gap-16 lg:grid-cols-12 lg:gap-20">
          {/* Main Info Column */}
          <div className="space-y-14 lg:col-span-8">
            <header className="relative space-y-5 py-4 md:space-y-6 md:py-6 overflow-visible">
              <div className="pointer-events-none absolute -top-20 -left-20 -z-10 h-72 w-72 rounded-full bg-orange-500/[0.05] blur-[150px] animate-pulse-glow" />
              <div className="flex items-center gap-4 text-[11px] font-semibold tracking-[0.3em] text-orange-400/60 uppercase">
                <Navigation className="h-4 w-4" />
                {city.iso3} <span className="text-foreground/15">/&#47;</span>{" "}
                {city.capital || "Urban Center"}
              </div>
              <h1 className="text-5xl leading-[1.05] font-bold tracking-[-0.03em] text-foreground md:text-7xl lg:text-8xl break-words block pb-2">
                {city.city}
              </h1>
              <div className="flex items-center gap-6">
                <p className="text-2xl font-bold tracking-tight text-foreground/30 md:text-4xl">
                  {city.country}
                </p>
                <div className="h-px flex-1 bg-gradient-to-r from-foreground/15 to-transparent" />
              </div>
            </header>

            <Suspense fallback={<AIBriefingSkeleton />}>
              <AIBriefingSection city={city} />
            </Suspense>

            <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8">
              <div className="group/card rounded-2xl border border-foreground/[0.05] bg-foreground/[0.015] p-8 md:rounded-3xl md:p-10 transition-all duration-500 hover:border-orange-500/10 hover:shadow-xl">
                <div className="mb-6 flex items-center gap-4 text-foreground/35">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/[0.06] transition-colors duration-300 group-hover/card:bg-orange-500/10">
                    <Users className="h-5 w-5 text-orange-400/70 transition-colors group-hover/card:text-orange-400" />
                  </div>
                  <span className="text-[11px] font-semibold tracking-[0.2em] uppercase">
                    Census Data
                  </span>
                </div>
                <div className="mb-2 text-4xl md:text-5xl font-bold tracking-[-0.02em] text-foreground">
                  {formatPopulation(city.population)}
                </div>
                <div className="text-[11px] font-medium tracking-[0.15em] text-foreground/35 uppercase">
                  Global Residents
                </div>
              </div>

              <div className="group/card rounded-2xl border border-foreground/[0.05] bg-foreground/[0.015] p-8 md:rounded-3xl md:p-10 transition-all duration-500 hover:border-orange-500/10 hover:shadow-xl">
                <div className="mb-6 flex items-center gap-4 text-foreground/35">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/[0.06] transition-colors group-hover/card:bg-orange-500/10">
                    <MapPin className="h-5 w-5 text-orange-400/70 transition-colors group-hover/card:text-orange-400" />
                  </div>
                  <span className="text-[11px] font-semibold tracking-[0.2em] uppercase">
                    Territory
                  </span>
                </div>
                <div className="mb-2 text-2xl md:text-3xl leading-tight font-bold tracking-tight text-foreground">
                  {city.admin_name || "Autonomous"}
                </div>
                <div className="text-[11px] font-medium tracking-[0.15em] text-foreground/35 uppercase">
                  Regional Hub
                </div>
              </div>
            </section>

            <section className="space-y-10">
              <h2 className="flex items-center gap-4 text-[11px] font-semibold tracking-[0.3em] text-foreground/35 uppercase">
                Structural Profile <span className="h-px flex-1 bg-foreground/[0.04]" />
              </h2>
              <Suspense fallback={<CityVitalsSkeleton />}>
                {weather ? <CityVitals data={weather} /> : <CityVitalsFallback />}
              </Suspense>
            </section>

            <section className="space-y-6">
              <h2 className="flex items-center gap-4 text-[11px] font-semibold tracking-[0.3em] text-foreground/35 uppercase">
                Travel Essentials <span className="h-px flex-1 bg-foreground/[0.04]" />
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5">
                {[
                  {
                    icon: MapPin,
                    title: "Best Neighborhoods",
                    text: city.admin_name
                      ? `Explore the diverse neighborhoods across the ${city.admin_name} region of ${city.city}. Browse landmarks below for specific areas.`
                      : `Explore the diverse neighborhoods of ${city.city}. Browse landmarks below for specific areas.`,
                  },
                  {
                    icon: Users,
                    title: "Budget Tips",
                    text: "Use the price filter in Dining and Stays below to find options matching your budget. Filter by $ to $$$$ to plan your trip spending.",
                  },
                  {
                    icon: Navigation,
                    title: "Getting Around",
                    text: `Open any listed spot in Maps for directions and transit options. Save places to build your personal itinerary for ${city.city}.`,
                  },
                  {
                    icon: Activity,
                    title: "Data Sources",
                    text: "All data sourced from Google Places API, public census databases, and AI-verified summaries. Metrics are refreshed regularly.",
                  },
                ].map(({ icon: ItemIcon, title, text }) => (
                  <div
                    key={title}
                    className="rounded-2xl border border-foreground/[0.04] bg-foreground/[0.01] p-5 transition-all duration-500 hover:border-foreground/[0.08]"
                  >
                    <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-foreground/40">
                      <ItemIcon className="h-4 w-4 text-orange-400/60" />
                      {title}
                    </div>
                    <p className="text-sm leading-relaxed text-foreground/45">{text}</p>
                  </div>
                ))}
              </div>
            </section>

            <Suspense fallback={<ExperiencesSkeleton />}>
              <ExperiencesWrapper cityName={city.city} lat={finalLat} lng={finalLng} />
            </Suspense>
          </div>

          {/* Sidebar */}
          <div className="space-y-8 lg:sticky lg:top-20 lg:col-span-4">
            <div className="relative space-y-8 rounded-2xl border border-foreground/[0.05] bg-foreground/[0.015] p-8 md:rounded-3xl md:p-10">
              <h3 className="text-2xl md:text-3xl leading-tight font-bold tracking-[-0.02em] text-foreground">
                Plan Your <br /> {city.city} Trip
              </h3>
              <p className="text-sm leading-relaxed text-foreground/45">
                Explore AI-powered briefings, live weather data, budget filters, and curated local experiences. Save your favorite spots to build a personal itinerary — all free, no sign-up required.
              </p>
              <Link
                href="/resources/top-cities"
                className="block w-full rounded-2xl border border-orange-500/25 bg-orange-500/10 py-5 md:py-6 text-center text-base font-semibold text-foreground transition-all duration-300 hover:bg-orange-500/15 hover:border-orange-500/35 hover:shadow-lg hover:shadow-orange-500/5"
              >
                Browse Free City Guide
              </Link>
            </div>

            <div className="space-y-8 rounded-2xl border border-foreground/[0.05] bg-foreground/[0.015] p-8 md:rounded-3xl md:p-10">
              <h4 className="text-[11px] font-semibold tracking-[0.25em] text-foreground/35 uppercase">
                Core Metrics
              </h4>
              <div className="grid grid-cols-1 gap-4">
                <MetricCard
                  icon={CloudIcon}
                  label="Pollution (PM2.5)"
                  value={metrics?.pollution_pm25}
                  unit="µg/m³"
                  source={metrics?.source?.pollution as string | undefined}
                />
                <MetricCard
                  icon={ThermometerSun}
                  label="Climate Comfort"
                  value={metrics?.climate_comfort}
                  source={metrics?.source?.climate as string | undefined}
                />
              </div>
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-foreground/25">
                <Activity className="h-3.5 w-3.5" />
                {metrics?.updated_at ? `Updated ${new Date(metrics.updated_at).toLocaleDateString()}` : "Pending data"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

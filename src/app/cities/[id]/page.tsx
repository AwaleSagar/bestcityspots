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
    <div className="liquid-glass rounded-[2rem] border border-foreground/5 p-6">
      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">
        Live City Vitals
      </div>
      <p className="mt-4 text-sm font-bold text-foreground/50">
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
    <span className="text-foreground/30">N/A</span>
  ) : (
    <div className="flex flex-col items-start leading-tight">
      <span className="text-2xl font-black tracking-tight text-foreground">
        {typeof value === "number" ? value.toLocaleString() : value}
      </span>
      {unit && (
        <span className="text-xs font-black uppercase tracking-widest text-foreground/60">
          {unit}
        </span>
      )}
    </div>
  );

  return (
    <div className="group/metric relative overflow-hidden rounded-[1.5rem] border border-foreground/5 bg-foreground/[0.02] p-5 flex flex-col gap-4">
      {/* Technical Scan Decoration */}
      <div className="pointer-events-none absolute inset-0 -z-0 opacity-0 transition-opacity duration-700 group-hover/metric:opacity-100">
        <div className="animate-scan absolute top-0 left-0 h-[2px] w-full bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
      </div>

      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-foreground/10 bg-foreground/[0.03] transition-colors duration-100 group-hover/metric:border-purple-500/30 group-hover/metric:bg-purple-500/10">
            <Icon className="h-5 w-5 text-purple-300 transition-colors duration-100 group-hover/metric:text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">
                {label}
              </div>
              <div className="hidden text-[8px] font-mono text-purple-500/30 group-hover/metric:block">
                ID_{debugId}
              </div>
            </div>
            {display}
          </div>
        </div>
      </div>
      <div className="relative z-10 flex items-center justify-between border-t border-foreground/5 pt-3">
        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-foreground/20">
          Data Source
        </div>
        <div className="text-[9px] font-black uppercase tracking-[0.1em] text-foreground/40 text-right max-w-[120px] leading-relaxed">
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
    <div className="space-y-8">
      <h2 className="flex items-center gap-4 text-sm font-black tracking-[0.4em] text-foreground/40 uppercase">
        Top Experiences <span className="h-px flex-1 bg-foreground/5" />
      </h2>
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
    <div className="animate-pulse rounded-[2rem] border border-foreground/5 bg-foreground/[0.01] p-6">
      <div className="h-2 w-32 rounded bg-foreground/5" />
      <div className="mt-4 h-6 w-24 rounded bg-foreground/5" />
      <div className="mt-6 h-10 w-full rounded bg-foreground/5" />
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

  // Validate Inputs (Security: Input Validation)
  const idResult = cityIdSchema.safeParse(id);
  const coordsResult = coordinatesSchema.safeParse({ lat, lng });

  if (!idResult.success) {
    notFound(); // Invalid ID format
  }

  if (!coordsResult.success) {
    // If coordinates are invalid (e.g. out of range or not numbers), just ignore them
    // and let the code fallback to city defaults below.
    console.warn("Invalid coordinates provided:", coordsResult.error);
  }

  const cityId = idResult.data;
  const validCoords = coordsResult.success ? coordsResult.data : {};

  const city = await getCityById(cityId);

  if (!city) {
    notFound();
  }

  // SEO: Structured Data for the city
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
  const metrics = await getCityMetrics(city);
  const weather = await getCityWeather(city);

  return (
    <main
      id="main-content"
      className="min-h-screen bg-transparent font-sans text-foreground selection:bg-purple-500/30 selection:text-purple-200"
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
        <nav className="mb-8 md:mb-12" aria-label="Breadcrumb">
          <Link
            href="/"
            className="group touch-target inline-flex min-h-[var(--touch-target-min)] items-center gap-3 text-foreground/50 transition-colors duration-100 hover:text-foreground md:gap-4 py-2"
          >
            <div className="liquid-glass flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-foreground/10 bg-foreground/[0.03] transition-colors duration-100 group-hover:border-purple-500/40 group-hover:bg-purple-500/20 md:h-12 md:w-12">
              <ArrowLeft className="h-4 w-4 transition-transform duration-100 group-hover:-translate-x-1 md:h-5 md:w-5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] md:text-xs">
              Return to Explorer
            </span>
          </Link>
        </nav>

        <div className="grid grid-cols-1 items-start gap-16 lg:grid-cols-12">
          {/* Main Info Column */}
          <div className="space-y-12 lg:col-span-8">
            <header className="relative space-y-4 py-4 md:space-y-6 md:py-6 overflow-visible">
              <div className="absolute -top-20 -left-20 -z-10 h-64 w-64 animate-pulse bg-purple-600/10 blur-[120px]" />
              <div className="flex items-center gap-4 text-[10px] font-black tracking-[0.4em] text-purple-400 uppercase">
                <Navigation className="h-4 w-4" />
                {city.iso3} <span className="text-foreground/20">/&#47;</span>{" "}
                {city.capital || "Urban Center"}
              </div>
              <h1 className="text-5xl leading-[1.1] font-black tracking-tighter text-foreground md:text-8xl break-words block pb-4">
                {city.city}
              </h1>
              <div className="flex items-center gap-6">
                <p className="text-3xl font-black tracking-tight text-foreground/40 italic md:text-5xl">
                  {city.country}
                </p>
                <div className="h-px flex-1 bg-gradient-to-r from-foreground/20 to-transparent" />
              </div>
            </header>

            <Suspense fallback={<AIBriefingSkeleton />}>
              <AIBriefingSection city={city} />
            </Suspense>

            <section className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="liquid-glass group/card rounded-[2.5rem] p-8 md:rounded-[3rem] md:p-10 shadow-2xl transition-colors duration-100 hover:bg-foreground/[0.05]">
                <div className="mb-6 flex items-center gap-4 text-foreground/40">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10 transition-colors duration-100 group-hover/card:bg-purple-500/20">
                    <Users className="h-5 w-5 text-purple-400" />
                  </div>
                  <span className="text-[11px] font-black tracking-[0.2em] uppercase">
                    Census Data
                  </span>
                </div>
                <div className="mb-2 text-4xl md:text-5xl font-black tracking-tighter text-foreground">
                  {formatPopulation(city.population)}
                </div>
                <div className="text-xs font-bold tracking-widest text-foreground/40 uppercase">
                  Global Residents
                </div>
              </div>

              <div className="liquid-glass group/card rounded-[2.5rem] p-8 md:rounded-[3rem] md:p-10 shadow-2xl transition-colors duration-100 hover:bg-foreground/[0.05]">
                <div className="mb-6 flex items-center gap-4 text-foreground/40">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10 transition-all group-hover/card:bg-purple-500/20">
                    <MapPin className="h-5 w-5 text-purple-400" />
                  </div>
                  <span className="text-[11px] font-black tracking-[0.2em] uppercase">
                    Territory
                  </span>
                </div>
                <div className="mb-2 text-2xl md:text-3xl leading-tight font-black tracking-tight text-foreground">
                  {city.admin_name || "Autonomous"}
                </div>
                <div className="text-xs font-bold tracking-widest text-foreground/40 uppercase">
                  Regional Hub
                </div>
              </div>
            </section>

            {/* Geographic Profile Section */}
            <section className="space-y-10">
              <h2 className="flex items-center gap-4 text-sm font-black tracking-[0.4em] text-foreground/40 uppercase">
                Structural Profile <span className="h-px flex-1 bg-foreground/5" />
              </h2>
              <Suspense fallback={<CityVitalsSkeleton />}>
                {weather ? <CityVitals data={weather} /> : <CityVitalsFallback />}
              </Suspense>
            </section>

            {/* Travel Essentials Section */}
            <section className="space-y-6">
              <h2 className="flex items-center gap-4 text-sm font-black tracking-[0.4em] text-foreground/40 uppercase">
                Travel Essentials <span className="h-px flex-1 bg-foreground/5" />
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-5">
                  <div className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-foreground/50">
                    <MapPin className="h-4 w-4 text-purple-300" />
                    Best Neighborhoods
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/60">
                    {city.admin_name
                      ? `The ${city.admin_name} region of ${city.city} features diverse neighborhoods worth exploring. Search for specific areas in the landmarks section below.`
                      : `${city.city} features diverse neighborhoods worth exploring. Search for specific areas in the landmarks section below.`}
                  </p>
                </div>
                <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-5">
                  <div className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-foreground/50">
                    <Users className="h-4 w-4 text-purple-300" />
                    Budget Tips
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/60">
                    Use the price filter in Dining and Stays below to find options matching your budget. Filter by $ to $$$$ to plan your trip spending.
                  </p>
                </div>
                <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-5">
                  <div className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-foreground/50">
                    <Navigation className="h-4 w-4 text-purple-300" />
                    Getting Around
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/60">
                    Open any listed spot in Maps for directions and transit options. Save places to build your personal itinerary for {city.city}.
                  </p>
                </div>
                <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-5">
                  <div className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-foreground/50">
                    <Activity className="h-4 w-4 text-purple-300" />
                    Data Sources
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/60">
                    All data sourced from Google Places API, public census databases, and AI-verified summaries. Metrics are refreshed regularly.
                  </p>
                </div>
              </div>
            </section>

            {/* Landmarks Section */}
            <Suspense fallback={<ExperiencesSkeleton />}>
              <ExperiencesWrapper cityName={city.city} lat={finalLat} lng={finalLng} />
            </Suspense>
          </div>

          {/* Sidebar / Quick Actions */}
          <div className="space-y-8 lg:sticky lg:top-20 lg:col-span-4">
            <div className="liquid-glass relative space-y-8 rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-10 shadow-2xl">
              <h3 className="text-2xl md:text-3xl leading-tight font-black tracking-tighter text-foreground">
                Plan Your <br /> {city.city} Trip
              </h3>
              <p className="text-sm leading-relaxed font-black tracking-wide text-foreground/60">
                Explore AI-powered briefings, live weather data, budget filters, and curated local experiences. Save your favorite spots to build a personal itinerary—all free, no sign-up required.
              </p>
              <Link
                href="/resources/top-cities"
                className="block w-full rounded-[2rem] border border-purple-400/40 bg-purple-500/20 py-5 md:py-6 text-center text-base md:text-lg font-black text-foreground transition-colors hover:bg-purple-500/30"
              >
                Browse Free City Guide
              </Link>
            </div>

            <div className="liquid-glass space-y-8 rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-10">
              <h4 className="text-[11px] font-black tracking-[0.3em] text-foreground/40 uppercase">
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
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30">
                <Activity className="h-4 w-4" />
                {metrics?.updated_at ? `Updated ${new Date(metrics.updated_at).toLocaleDateString()}` : "Pending data"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

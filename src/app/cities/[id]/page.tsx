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
    <div className="atlas-panel rounded-[1.8rem] p-7 md:p-8">
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
        Live City Vitals
      </div>
      <p className="mt-4 text-sm text-muted">
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
    <div className="atlas-panel group/metric rounded-[1.5rem] p-5 flex flex-col gap-4 transition-all duration-500 hover:border-accent/14">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[0.9rem] border border-line bg-background/55 transition-all duration-300 group-hover/metric:border-accent/20 group-hover/metric:bg-accent-soft/60">
            <Icon className="h-5 w-5 text-accent transition-colors duration-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">
                {label}
              </div>
              <div className="hidden text-[8px] font-mono text-accent/45 group-hover/metric:block">
                ID_{debugId}
              </div>
            </div>
            {display}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-line pt-3">
        <div className="text-[9px] font-semibold uppercase tracking-[0.15em] text-muted">
          Data Source
        </div>
        <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-strong text-right max-w-[120px] leading-relaxed">
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
        <h2 className="labelled-rule">Top Experiences</h2>
        <p className="max-w-lg text-sm tracking-wide text-muted">
          Curated landmarks, dining, and stays ranked by traveler interest and local pulse.
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
    <div className="atlas-panel animate-pulse rounded-[1.8rem] p-7 md:p-8">
      <div className="h-2 w-32 rounded bg-foreground/10" />
      <div className="mt-4 h-6 w-24 rounded bg-foreground/10" />
      <div className="mt-6 h-10 w-full rounded bg-foreground/10" />
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
            className="inline-flex items-center gap-3 rounded-full border border-line bg-background/65 px-4 py-3 text-[0.72rem] font-bold uppercase tracking-[0.18em] text-muted-strong transition-colors duration-300 hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to explorer
          </Link>
        </nav>

        <div className="grid grid-cols-1 items-start gap-16 lg:grid-cols-12 lg:gap-20">
          {/* Main Info Column */}
          <div className="space-y-14 lg:col-span-8">
            <header className="atlas-frame relative space-y-5 overflow-visible rounded-[2.4rem] p-6 md:space-y-6 md:p-8">
              <div className="pointer-events-none absolute -top-20 -left-20 -z-10 h-72 w-72 rounded-full bg-[color:var(--color-accent-soft)] blur-[150px] animate-pulse-glow" />
              <div className="flex flex-wrap items-center gap-3">
                <span className="eyebrow">
                  <Navigation className="h-3.5 w-3.5 text-accent" />
                  {city.iso3 || "CITY"}
                </span>
                <span className="atlas-chip">{city.capital || "Urban center"}</span>
              </div>
              <h1 className="text-[clamp(3.2rem,8vw,6.8rem)] leading-[0.88] text-foreground break-words block pb-2">
                {city.city}
              </h1>
              <div className="flex items-center gap-6">
                <p className="text-xl font-semibold uppercase tracking-[0.16em] text-muted-strong md:text-2xl">
                  {city.country}
                </p>
                <div className="h-px flex-1 bg-gradient-to-r from-line to-transparent" />
              </div>
            </header>

            <Suspense fallback={<AIBriefingSkeleton />}>
              <AIBriefingSection city={city} />
            </Suspense>

            <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8">
              <div className="atlas-panel interactive-card rounded-[1.8rem] p-8 md:p-10">
                <div className="mb-6 flex items-center gap-4 text-muted">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[0.9rem] bg-[color:var(--color-cat-stays-soft)] transition-colors duration-300">
                    <Users className="h-5 w-5 text-[color:var(--color-cat-stays)]" />
                  </div>
                  <span className="text-[11px] font-semibold tracking-[0.2em] uppercase">
                    Census Data
                  </span>
                </div>
                <div className="mb-2 text-4xl md:text-5xl font-bold tracking-[-0.02em] text-foreground">
                  {formatPopulation(city.population)}
                </div>
                <div className="text-[11px] font-medium tracking-[0.15em] text-muted uppercase">
                  Global Residents
                </div>
              </div>

              <div className="atlas-panel interactive-card rounded-[1.8rem] p-8 md:p-10">
                <div className="mb-6 flex items-center gap-4 text-muted">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[0.9rem] bg-[color:color-mix(in_oklab,var(--color-brand-accent)_14%,transparent)] transition-colors">
                    <MapPin className="h-5 w-5 text-[color:var(--color-brand-accent)]" />
                  </div>
                  <span className="text-[11px] font-semibold tracking-[0.2em] uppercase">
                    Territory
                  </span>
                </div>
                <div className="mb-2 text-2xl md:text-3xl leading-tight font-bold tracking-tight text-foreground">
                  {city.admin_name || "Autonomous"}
                </div>
                <div className="text-[11px] font-medium tracking-[0.15em] text-muted uppercase">
                  Regional Hub
                </div>
              </div>
            </section>

            <section className="space-y-10">
              <h2 className="labelled-rule">Structural Profile</h2>
              <Suspense fallback={<CityVitalsSkeleton />}>
                {weather ? <CityVitals data={weather} /> : <CityVitalsFallback />}
              </Suspense>
            </section>

            <section className="space-y-6">
              <h2 className="labelled-rule">Travel Essentials</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5">
                {[
                  {
                    icon: MapPin,
                    title: "Best Neighborhoods",
                    color: "text-[color:var(--color-cat-dining)]",
                    text: city.admin_name
                      ? `Explore the diverse neighborhoods across the ${city.admin_name} region of ${city.city}. Browse landmarks below for specific areas.`
                      : `Explore the diverse neighborhoods of ${city.city}. Browse landmarks below for specific areas.`,
                  },
                  {
                    icon: Users,
                    title: "Budget Tips",
                    color: "text-[color:var(--color-brand-accent)]",
                    text: "Use the price filter in Dining and Stays below to find options matching your budget. Filter by $ to $$$$ to plan your trip spending.",
                  },
                  {
                    icon: Navigation,
                    title: "Getting Around",
                    color: "text-[color:var(--color-brand-secondary)]",
                    text: `Open any listed spot in Maps for directions and transit options. Save places to build your personal itinerary for ${city.city}.`,
                  },
                  {
                    icon: Activity,
                    title: "Data Sources",
                    color: "text-accent",
                    text: "All data sourced from Google Places API, public census databases, and AI-verified summaries. Metrics are refreshed regularly.",
                  },
                ].map(({ icon: ItemIcon, title, text, color }) => (
                  <div
                    key={title}
                    className="atlas-panel rounded-[1.5rem] p-5 transition-all duration-500 hover:border-accent/12"
                  >
                    <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-muted">
                      <ItemIcon className={`h-4 w-4 ${color}`} />
                      {title}
                    </div>
                    <p className="text-sm leading-relaxed text-muted">{text}</p>
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
            <div className="atlas-panel-strong relative space-y-8 rounded-[2rem] p-8 md:p-10">
              <h3 className="text-2xl md:text-3xl leading-tight font-bold tracking-[-0.02em] text-foreground">
                Plan Your <br /> {city.city} Trip
              </h3>
              <p className="text-sm leading-relaxed text-muted">
                Explore AI-powered briefings, live weather data, budget filters, and curated local experiences. Save your favorite spots to build a personal itinerary — all free, no sign-up required.
              </p>
              <Link
                href="/resources/top-cities"
                className="btn-primary w-full"
              >
                Browse Free City Guide
              </Link>
            </div>

            <div className="atlas-panel rounded-[2rem] p-8 md:p-10">
              <h4 className="text-[11px] font-semibold tracking-[0.25em] text-muted uppercase">
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
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">
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

import { getCityById, getCityBySlug, getTopCities } from "@/lib/cities";
import { formatPopulation } from "@/lib/format";
import { getTopPlaces } from "@/lib/places";
import { getCityMetrics } from "@/lib/metrics";
import { getCityWeather } from "@/lib/weather";
import { getCityInsight } from "@/lib/intelligence";
import {
  cityIdSchema,
  citySlugSchema,
  coordinatesSchema,
  numericIdParam,
} from "@/lib/validation";
import { publicEnv } from "@/lib/env";
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
  Leaf,
  ShieldCheck,
  Clock3,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense, cache } from "react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import CityViewTracker from "@/components/analytics/CityViewTracker";
import {
  CityVitalsFallback,
  getArrivalMood,
  MetricCard,
} from "./city-page-parts";

// Enable ISR: regenerate pages at most once per hour. Cached responses still
// stream fresh metrics/places via the in-route Supabase caches; this just
// avoids re-running the full server component tree on every request.
export const revalidate = 3600;

// SEO Phase 1 (T2): pre-render the top cities at build time. Long-tail cities
// still render via ISR thanks to the default `dynamicParams = true`.
const STATIC_CITY_COUNT = 250;

export async function generateStaticParams() {
  try {
    const top = await getTopCities(STATIC_CITY_COUNT);
    return top
      .map((c) => c.slug)
      .filter((slug): slug is string => typeof slug === "string" && slug.length > 0)
      .map((slug) => ({ slug }));
  } catch (e) {
    console.warn("[cities/[slug]] generateStaticParams failed:", e);
    return [];
  }
}

// Request-scoped cache so generateMetadata + page body share one DB query.
const getCachedCityBySlug = cache(getCityBySlug);
const getCachedCityById = cache(getCityById);
const getCachedCityInsight = cache(getCityInsight);

const siteUrl =
  publicEnv().NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://bestcityspots.com";

function CoreMetricsSkeleton() {
  return (
    <div className="grid animate-pulse grid-cols-1 gap-4">
      <div className="atlas-panel h-[120px] rounded-[1.1rem] sm:rounded-[1.3rem]" />
      <div className="atlas-panel h-[120px] rounded-[1.1rem] sm:rounded-[1.3rem]" />
    </div>
  );
}

async function CoreMetricsCard({ city }: { city: Awaited<ReturnType<typeof getCityById>> }) {
  if (!city) return null;
  const metrics = await getCityMetrics(city);
  return (
    <>
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
      <div className="text-muted mt-4 flex items-center gap-2 text-[10px] font-semibold tracking-[0.15em] uppercase">
        <Activity className="h-3.5 w-3.5" />
        {metrics?.updated_at
          ? `Updated ${new Date(metrics.updated_at).toLocaleDateString()}`
          : "Pending data"}
      </div>
    </>
  );
}

async function WeatherSummaryCards({ city }: { city: Awaited<ReturnType<typeof getCityById>> }) {
  if (!city) return null;
  const weather = await getCityWeather(city);

  return (
    <>
      {[
        {
          icon: Leaf,
          label: "Arrival mood",
          value: getArrivalMood(weather?.temp),
        },
        {
          icon: Clock3,
          label: "Best next step",
          value: "Scan the AI briefing, then save places into a personal route.",
        },
        {
          icon: Activity,
          label: "Live context",
          value: weather
            ? `${Math.round(weather.temp)}°C now with ${weather.aqi_label.toLowerCase()} air quality.`
            : "Weather and air quality are checked when available.",
        },
      ].map(({ icon: ItemIcon, label, value }) => (
        <div key={label} className="border-line bg-surface/72 rounded-[1rem] border p-4">
          <div className="text-muted flex items-center gap-2 text-[10px] font-semibold tracking-[0.16em] uppercase">
            <ItemIcon className="text-accent h-3.5 w-3.5" />
            {label}
          </div>
          <p className="text-muted-strong mt-2 text-sm leading-relaxed">{value}</p>
        </div>
      ))}
    </>
  );
}

function WeatherSummaryFallback() {
  return (
    <>
      {["Arrival mood", "Best next step", "Live context"].map((label) => (
        <div key={label} className="border-line bg-surface/72 rounded-[1rem] border p-4">
          <div className="text-muted flex items-center gap-2 text-[10px] font-semibold tracking-[0.16em] uppercase">
            <Activity className="text-accent h-3.5 w-3.5" />
            {label}
          </div>
          <div className="bg-muted/15 mt-3 h-10 animate-pulse rounded-[0.8rem]" />
        </div>
      ))}
    </>
  );
}

async function CityVitalsSection({ city }: { city: Awaited<ReturnType<typeof getCityById>> }) {
  if (!city) return <CityVitalsFallback />;
  const weather = await getCityWeather(city);
  return weather ? <CityVitals data={weather} /> : <CityVitalsFallback />;
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
        <p className="text-muted max-w-lg text-sm tracking-wide">
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

/**
 * Resolve the unified `[slug]` route param.
 *
 * SEO Phase 1 (T1, T3): the route accepts both legacy numeric ids
 * (`/cities/123`) and canonical slugs (`/cities/lisbon-portugal`). When the
 * caller hits a numeric id we 308-redirect to the canonical slug URL so
 * external links and the previously-published sitemap entries continue to
 * resolve and consolidate into a single canonical URL.
 *
 * Returns the City row when the segment is a valid slug, or never returns
 * (redirects / 404s) for legacy ids and unknown values.
 */
async function resolveCityFromSegment(
  segment: string,
  searchSuffix: string
): Promise<Awaited<ReturnType<typeof getCityBySlug>>> {
  if (numericIdParam.test(segment)) {
    const idResult = cityIdSchema.safeParse(segment);
    if (!idResult.success) notFound();
    const legacyCity = await getCachedCityById(idResult.data);
    if (!legacyCity) notFound();
    if (legacyCity.slug && legacyCity.slug.length > 0) {
      // 308 (permanent) so search engines transfer link equity.
      redirect(`/cities/${legacyCity.slug}${searchSuffix}`);
    }
    // No slug yet on this row (pre-migration) — render at the legacy URL.
    return legacyCity;
  }

  const slugResult = citySlugSchema.safeParse(segment);
  if (!slugResult.success) notFound();
  return getCachedCityBySlug(slugResult.data);
}

function buildCanonicalUrl(city: { slug?: string; id: number }) {
  const segment = city.slug && city.slug.length > 0 ? city.slug : String(city.id);
  return `${siteUrl}/cities/${segment}`;
}

// Meta description sizing: Google generally truncates around 160 chars on
// desktop. We leave a small buffer and prefer cutting at word boundaries.
const META_DESC_MIN_LENGTH = 60;
const META_DESC_MAX_LENGTH = 158;
const META_DESC_TRUNCATE_AT = 155;
// Lower bound for the word-boundary backtrack — below this we'd produce a
// suspiciously short description, so just hard-cut at the character limit.
const META_DESC_WORD_BOUNDARY_FLOOR = 100;

/**
 * Trim and clamp the AI-generated intro to a meta-description-friendly
 * length. Falls back to a templated string when the cached insight is
 * missing or too short to be useful.
 */
function deriveCityDescription(
  insight: { intro?: string } | null,
  cityName: string,
  countryName: string
) {
  const raw = insight?.intro?.trim();
  if (raw && raw.length >= META_DESC_MIN_LENGTH) {
    if (raw.length <= META_DESC_MAX_LENGTH) return raw;
    const cut = raw.slice(0, META_DESC_TRUNCATE_AT);
    const lastSpace = cut.lastIndexOf(" ");
    const trimmed =
      lastSpace > META_DESC_WORD_BOUNDARY_FLOOR ? cut.slice(0, lastSpace) : cut;
    return `${trimmed.replace(/[.,;:\s]+$/, "")}…`;
  }
  return `${cityName} travel guide with live weather, neighborhoods, AI-assisted briefings, and curated places in ${countryName}.`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  // For metadata we only need to *read* the slug variant — for legacy ids
  // the page handler below performs the redirect. Returning a minimal
  // metadata object here keeps the legacy crawl path cheap and signals
  // noindex so search engines don't keep the numeric URL in the index.
  if (numericIdParam.test(slug)) {
    return { title: "Best City Spots", robots: { index: false, follow: true } };
  }

  const slugResult = citySlugSchema.safeParse(slug);
  if (!slugResult.success) return { title: "City Not Found" };

  const city = await getCachedCityBySlug(slugResult.data);
  if (!city) return { title: "City Not Found" };

  const insight = await getCachedCityInsight(city).catch(() => null);
  const description = deriveCityDescription(insight, city.city, city.country);
  const year = new Date().getFullYear();
  const title = `${city.city} Travel Guide: Live Weather, Neighborhoods & AI Insights (${year})`;
  const canonical = buildCanonicalUrl(city);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${city.city} Travel Guide | Best City Spots`,
      description,
      type: "article",
      url: canonical,
    },
    twitter: {
      card: "summary_large_image",
      title: `${city.city} Travel Guide | Best City Spots`,
      description,
    },
  };
}

export default async function CityPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lat?: string; lng?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const { lat, lng } = sp;

  const coordsResult = coordinatesSchema.safeParse({ lat, lng });
  if (!coordsResult.success) {
    console.warn("Invalid coordinates provided:", coordsResult.error);
  }
  const validCoords = coordsResult.success ? coordsResult.data : {};

  const searchSuffix =
    typeof lat === "string" && typeof lng === "string"
      ? `?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`
      : "";

  const city = await resolveCityFromSegment(slug, searchSuffix);
  if (!city) notFound();

  const canonical = buildCanonicalUrl(city);

  const touristJsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    name: city.city,
    url: canonical,
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
    containedInPlace: {
      "@type": "Country",
      name: city.country,
    },
  };

  // SEO Phase 1 (5.5): mirror the visual breadcrumbs as JSON-LD so search
  // engines can render rich breadcrumb chips on the SERP.
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: "Cities",
        item: `${siteUrl}/resources/top-cities`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: `${city.city}, ${city.country}`,
        item: canonical,
      },
    ],
  };

  const finalLat = validCoords.lat ?? city.lat;
  const finalLng = validCoords.lng ?? city.lng;
  return (
    <main id="main-content" className="text-foreground min-h-screen bg-transparent font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(touristJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <CityViewTracker cityId={city.id} />
      <div
        className="container-gutter mx-auto max-w-5xl px-4 py-12 sm:px-6"
        style={{ paddingTop: "max(3rem, calc(env(safe-area-inset-top, 0px) + 4rem))" }}
      >
        <Breadcrumbs
          items={[
            { label: "Cities", href: "/resources/top-cities" },
            { label: city.city },
          ]}
        />
        <nav className="mb-10 md:mb-14" aria-label="City navigation">
          <Link
            href="/"
            className="border-line bg-background/65 text-muted-strong hover:text-foreground inline-flex items-center gap-3 rounded-full border px-4 py-3 text-[0.72rem] font-bold tracking-[0.18em] uppercase transition-colors duration-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to explorer
          </Link>
        </nav>

        <div className="grid grid-cols-1 items-start gap-10 sm:gap-14 lg:grid-cols-12 lg:gap-20">
          {/* Main Info Column */}
          <div className="space-y-14 lg:col-span-8">
            <header className="organic-panel relative overflow-visible rounded-[1.6rem] p-5 sm:rounded-[2rem] md:rounded-[2.4rem] md:p-8">
              <div className="animate-pulse-glow pointer-events-none absolute -top-20 -left-20 -z-10 h-72 w-72 rounded-full bg-[color:var(--color-accent-soft)] blur-[150px]" />
              <div className="mb-3 flex flex-wrap items-center gap-3 md:mb-4">
                <span className="eyebrow">
                  <Navigation className="text-accent h-3.5 w-3.5" />
                  {city.iso3 || "CITY"}
                </span>
                <span className="atlas-chip">{city.capital || "Urban center"}</span>
                <span className="source-chip">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Public data
                </span>
              </div>
              <h1 className="text-foreground block text-[clamp(2.4rem,6vw,4.6rem)] leading-[0.95] break-words">
                {city.city}{" "}
                <span className="text-muted-strong text-[0.42em] tracking-[0.18em] uppercase">
                  Travel Guide
                </span>
              </h1>
              <div className="mt-3 flex items-center gap-6 md:mt-4">
                <p className="text-muted-strong text-xl font-semibold tracking-[0.16em] uppercase md:text-2xl">
                  {city.country}
                </p>
                <div className="from-line h-px flex-1 bg-gradient-to-r to-transparent" />
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-3 md:mt-7">
                <Suspense fallback={<WeatherSummaryFallback />}>
                  <WeatherSummaryCards city={city} />
                </Suspense>
              </div>
            </header>

            <Suspense fallback={<AIBriefingSkeleton />}>
              <AIBriefingSection city={city} />
            </Suspense>

            <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8">
              <div className="atlas-panel interactive-card rounded-[1.2rem] p-6 active:scale-[0.98] sm:rounded-[1.5rem] md:rounded-[1.8rem] md:p-8 lg:p-10">
                <div className="text-muted mb-6 flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[0.9rem] bg-[color:var(--color-cat-stays-soft)] transition-colors duration-300">
                    <Users className="h-5 w-5 text-[color:var(--color-cat-stays)]" />
                  </div>
                  <span className="text-[11px] font-semibold tracking-[0.2em] uppercase">
                    Census Data
                  </span>
                </div>
                <div className="text-foreground mb-2 text-4xl font-bold tracking-[-0.02em] md:text-5xl">
                  {formatPopulation(city.population)}
                </div>
                <div className="text-muted text-[11px] font-medium tracking-[0.15em] uppercase">
                  Global Residents
                </div>
              </div>

              <div className="atlas-panel interactive-card rounded-[1.2rem] p-6 active:scale-[0.98] sm:rounded-[1.5rem] md:rounded-[1.8rem] md:p-8 lg:p-10">
                <div className="text-muted mb-4 flex items-center gap-4 sm:mb-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[0.9rem] bg-[color:color-mix(in_oklab,var(--color-brand-accent)_14%,transparent)] transition-colors">
                    <MapPin className="h-5 w-5 text-[color:var(--color-brand-accent)]" />
                  </div>
                  <span className="text-[11px] font-semibold tracking-[0.2em] uppercase">
                    Territory
                  </span>
                </div>
                <div className="text-foreground mb-2 text-2xl leading-tight font-bold tracking-tight md:text-3xl">
                  {city.admin_name || "Autonomous"}
                </div>
                <div className="text-muted text-[11px] font-medium tracking-[0.15em] uppercase">
                  Regional Hub
                </div>
              </div>
            </section>

            <section className="space-y-10">
              <h2 className="labelled-rule">Structural Profile</h2>
              <Suspense fallback={<CityVitalsFallback />}>
                <CityVitalsSection city={city} />
              </Suspense>
            </section>

            <section className="space-y-6">
              <h2 className="labelled-rule">Travel Essentials</h2>
              <div className="flow-grid">
                {[
                  {
                    icon: MapPin,
                    title: "Neighborhood texture",
                    color: "text-[color:var(--color-cat-dining)]",
                    text: city.admin_name
                      ? `Use the ${city.admin_name} context as a starting layer, then let landmarks reveal the smaller local pockets.`
                      : `Start with landmarks, then use saved notes to build a more personal read of ${city.city}.`,
                  },
                  {
                    icon: Users,
                    title: "Budget transparency",
                    color: "text-[color:var(--color-brand-accent)]",
                    text: "Use Dining and Stays price filters to keep high-interest places grounded in realistic trip spending.",
                  },
                  {
                    icon: Navigation,
                    title: "On-trip handoff",
                    color: "text-[color:var(--color-brand-secondary)]",
                    text: `Open any listed spot in Maps for directions, then keep your personal ${city.city} shortlist in saved places.`,
                  },
                  {
                    icon: Activity,
                    title: "Source posture",
                    color: "text-accent",
                    text: "Google Places, public city data, weather providers, and AI-assisted summaries are labeled so the guide stays auditable.",
                  },
                ].map(({ icon: ItemIcon, title, text, color }) => (
                  <div
                    key={title}
                    className="intent-card rounded-[1.1rem] p-4 sm:rounded-[1.3rem] sm:p-5"
                  >
                    <div className="text-muted mb-3 flex items-center gap-2 text-[11px] font-semibold tracking-[0.15em] uppercase">
                      <ItemIcon className={`h-4 w-4 ${color}`} />
                      {title}
                    </div>
                    <p className="text-muted text-sm leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Mobile-only CTA - shown before experiences */}
            <div className="atlas-panel-strong relative space-y-6 rounded-[1.4rem] p-6 sm:rounded-[1.6rem] lg:hidden">
              <h3 className="text-foreground text-xl leading-tight font-bold tracking-[-0.02em] sm:text-2xl">
                Plan Your {city.city} Trip
              </h3>
              <p className="text-muted text-sm leading-relaxed">
                Explore AI-powered briefings, live weather data, budget filters, and curated local
                experiences — all free, no sign-up required.
              </p>
              <Link href="/resources/top-cities" className="btn-primary w-full">
                Browse Free City Guide
              </Link>
            </div>

            <Suspense fallback={<ExperiencesSkeleton />}>
              <ExperiencesWrapper cityName={city.city} lat={finalLat} lng={finalLng} />
            </Suspense>
          </div>

          {/* Sidebar */}
          <div className="hidden space-y-8 lg:sticky lg:top-20 lg:col-span-4 lg:block">
            <div className="atlas-panel-strong relative space-y-8 rounded-[1.6rem] p-6 sm:rounded-[2rem] md:p-10">
              <h3 className="text-foreground text-2xl leading-tight font-bold tracking-[-0.02em] md:text-3xl">
                Plan Your <br /> {city.city} Trip
              </h3>
              <p className="text-muted text-sm leading-relaxed">
                Explore AI-powered briefings, live weather data, budget filters, and curated local
                experiences. Save your favorite spots to build a personal itinerary — all free, no
                sign-up required.
              </p>
              <Link href="/resources/top-cities" className="btn-primary w-full">
                Browse Free City Guide
              </Link>
            </div>

            <div className="atlas-panel rounded-[1.6rem] p-6 sm:rounded-[2rem] md:p-10">
              <h4 className="text-muted text-[11px] font-semibold tracking-[0.25em] uppercase">
                Core Metrics
              </h4>
              <Suspense fallback={<CoreMetricsSkeleton />}>
                <CoreMetricsCard city={city} />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

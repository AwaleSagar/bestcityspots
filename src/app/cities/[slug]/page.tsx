import { getCityById, getCityBySlug, getTopCities, cityHref, type City } from "@/lib/cities";
import { haversineKm } from "@/lib/geo";
import { readCachedCityInsight } from "@/lib/intelligence";
import { readPlacesCache } from "@/platform/data-access/places-cache-repository";
import { formatPopulation } from "@/lib/format";
import { getTopPlaces } from "@/lib/places";
import { isPaidProviderEnabled } from "@/lib/cost-guard";
import { getCityMetrics } from "@/lib/metrics";
import { getCityWeather } from "@/lib/weather";
import { cityIdSchema, citySlugSchema, coordinatesSchema, numericIdParam } from "@/lib/validation";
import { publicEnv } from "@/lib/env";
import ExperiencesSection from "./ExperiencesSection";
import ExperiencesSkeleton from "./ExperiencesSkeleton";
import AIBriefingSection from "./AIBriefingSection";
import AIBriefingSkeleton from "./AIBriefingSkeleton";
import CityFAQSection from "./CityFAQSection";
import CityRelatedSection from "./CityRelatedSection";
import CityPlanningPanel from "./CityPlanningPanel";
import CityTravelEssentialsSection from "./CityTravelEssentialsSection";
import CityVitals from "@/components/features/city/CityVitals";
import CityMap from "@/components/features/city/CityMap";
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
import { CityVitalsFallback, getArrivalMood, MetricCard } from "./city-page-parts";
import { selectAvailableMetrics, shouldRenderMetricsPanel } from "@/lib/metrics-display";
import { getPlaceSaveTotals } from "@/lib/place-saves";
import type { ComponentType } from "react";

// Emergency cost guard: regenerate city pages at most once per day so crawler
// bursts don't repeatedly execute the full server component tree.
export const revalidate = 86400;

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
const getCachedCityWeather = cache(getCityWeather);

// US-01 (audit AF-3): a city is "warm" when at least one substantive cached
// layer exists (AI insight or places). Cache-only reads — this check can
// never trigger a paid provider call. Request-scoped so generateMetadata and
// the page body share one lookup.
const isCityWarm = cache(async (city: City): Promise<boolean> => {
  const [insight, places] = await Promise.all([
    readCachedCityInsight(city.id)
      .then((read) => read.insight)
      .catch(() => null),
    readPlacesCache(city.city, "landmarks").catch(() => null),
  ]);
  const warm = Boolean(insight || places);
  console.info(
    `[city-page] isCityWarm(${city.city}#${city.id}): insight=${Boolean(insight)} placesCache=${Boolean(places)} -> warm=${warm}`
  );
  return warm;
});

const siteUrl = publicEnv().NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://bestcityspots.com";

function CoreMetricsSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading city metrics"
      className="grid animate-pulse grid-cols-1 gap-4"
    >
      <div className="atlas-panel h-[120px] rounded-lg sm:rounded-xl" />
      <div className="atlas-panel h-[120px] rounded-lg sm:rounded-xl" />
    </div>
  );
}

// US-03 (audit AF-2): icons per metric key; the selection of which metrics
// render lives in src/lib/metrics-display.ts and is value-driven.
const METRIC_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  pollution_pm25: CloudIcon,
  climate_comfort: ThermometerSun,
  cost_index: Users,
  safety_score: ShieldCheck,
  connectivity_mbps: Activity,
  health_access_per_100k: Activity,
};

async function CoreMetricsCard({ city }: { city: Awaited<ReturnType<typeof getCityById>> }) {
  if (!city) return null;
  const metrics = await getCityMetrics(city);
  const rows = selectAvailableMetrics(metrics);

  // Fewer than two real metrics: the panel doesn't earn its space — the
  // live weather/AQI vitals section alone tells the story (US-03).
  if (!shouldRenderMetricsPanel(rows)) return null;

  return (
    <>
      <div className="grid grid-cols-1 gap-4">
        {rows.map((row) => (
          <MetricCard
            key={row.key}
            icon={METRIC_ICONS[row.key] ?? Activity}
            label={row.label}
            value={row.value}
            unit={row.unit}
            source={row.source}
          />
        ))}
      </div>
      {metrics?.updated_at ? (
        <div className="text-muted mt-4 flex items-center gap-2 text-xs font-semibold tracking-[0.15em] uppercase">
          <Activity className="h-3.5 w-3.5" />
          {/* SEO Phase 2.4 (audit 5.7): explicit "Last verified" wording so
              E-E-A-T cues are unambiguous to both readers and crawlers. */}
          {`Last verified ${new Date(metrics.updated_at).toLocaleDateString()}`}
        </div>
      ) : null}
    </>
  );
}

async function WeatherSummaryCards({
  city,
  reduced = false,
}: {
  city: Awaited<ReturnType<typeof getCityById>>;
  reduced?: boolean;
}) {
  if (!city) return null;
  const weather = await getCachedCityWeather(city);

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
          // US-01/US-04: the reduced profile has no AI briefing — don't
          // point at one.
          value: reduced
            ? "Check live conditions below, then jump to the nearest full guide."
            : "Scan the AI briefing, then save places into a personal route.",
        },
        {
          icon: Activity,
          label: "Live context",
          value: weather
            ? `${Math.round(weather.temp)}°C now with ${weather.aqi_label.toLowerCase()} air quality.`
            : "Weather and air quality are checked when available.",
        },
      ].map(({ icon: ItemIcon, label, value }) => (
        <div key={label} className="border-line bg-surface/72 rounded-lg border p-4">
          <div className="text-muted flex items-center gap-2 text-xs font-semibold tracking-[0.16em] uppercase">
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
        <div key={label} className="border-line bg-surface/72 rounded-lg border p-4">
          <div className="text-muted flex items-center gap-2 text-xs font-semibold tracking-[0.16em] uppercase">
            <Activity className="text-accent h-3.5 w-3.5" />
            {label}
          </div>
          <div className="bg-muted/15 mt-3 h-10 animate-pulse rounded-md" />
        </div>
      ))}
    </>
  );
}

async function CityVitalsSection({ city }: { city: Awaited<ReturnType<typeof getCityById>> }) {
  if (!city) return <CityVitalsFallback />;
  const weather = await getCachedCityWeather(city);
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
  // Opt into a live provider fetch on a cold/stale cache. This is only an
  // *opt-in*: the actual call is still gated by isPaidProviderEnabled()
  // (the GOOGLE_PLACES_LIVE_FETCH_ENABLED kill switch + daily budget), so
  // production with the flag off stays cache-only and spends nothing. On a
  // hit, the cache is served and a stale entry refreshes in the background.
  const fetchOpts = { lat, lng, allowProviderFetch: true } as const;
  const [landmarks, restaurants, hotels] = await Promise.all([
    getTopPlaces(cityName, "landmarks", fetchOpts),
    getTopPlaces(cityName, "restaurants", fetchOpts),
    getTopPlaces(cityName, "hotels", fetchOpts),
  ]);
  console.info(
    `[city-page] ExperiencesWrapper(${cityName}): landmarks=${landmarks.length} restaurants=${restaurants.length} hotels=${hotels.length}`
  );

  // US-12: anonymous aggregate save counts for the displayed places.
  const saveCounts = await getPlaceSaveTotals(
    [...landmarks, ...restaurants, ...hotels].map((place) => place.id)
  );

  // SEO Phase 2.2 (audit 5.5): emit `Place` + `AggregateRating` JSON-LD
  // for the top landmarks, restaurants, and hotels actually displayed in
  // the Experiences carousel. Sourced from the same Google Places data
  // that powers the visible cards so the structured data matches what
  // users see on the page (a Google requirement for rich results).
  const placeJsonLd = {
    "@context": "https://schema.org",
    "@graph": [...landmarks, ...restaurants, ...hotels]
      .filter(
        (place) =>
          typeof place.userRatingCount === "number" &&
          place.userRatingCount > 0 &&
          typeof place.rating === "number"
      )
      .slice(0, 15)
      .map((place) => ({
        "@type": "Place",
        name: place.displayName?.text,
        address: place.formattedAddress,
        ...(place.googleMapsUri ? { url: place.googleMapsUri } : {}),
        ...(place.location?.latitude && place.location?.longitude
          ? {
              geo: {
                "@type": "GeoCoordinates",
                latitude: place.location.latitude,
                longitude: place.location.longitude,
              },
            }
          : {}),
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: place.rating,
          reviewCount: place.userRatingCount,
          bestRating: 5,
          worstRating: 1,
        },
      })),
  };

  return (
    <div className="space-y-10">
      {placeJsonLd["@graph"].length > 0 ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(placeJsonLd) }}
        />
      ) : null}
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
        centerLat={lat}
        centerLng={lng}
        saveCounts={saveCounts}
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
    const trimmed = lastSpace > META_DESC_WORD_BOUNDARY_FLOOR ? cut.slice(0, lastSpace) : cut;
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

  // Keep metadata DB-only and deterministic under heavy crawl load.
  const description = deriveCityDescription(null, city.city, city.country);
  const year = new Date().getFullYear();
  const title = `${city.city} Travel Guide: Live Weather, Neighborhoods & AI Insights (${year})`;
  const canonical = buildCanonicalUrl(city);

  // US-01/US-02 (audit AF-3): un-warmed cities render the reduced template
  // and are kept out of the index ("fewer, stronger pages" — Google's
  // thin-content guidance). `follow` keeps link equity flowing to the
  // nearest covered city and country hubs.
  const warm = await isCityWarm(city);

  return {
    title,
    description,
    alternates: { canonical },
    ...(warm ? {} : { robots: { index: false, follow: true } }),
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

// US-01 (audit AF-3): point visitors of lightweight pages at the nearest city
// with a full guide. Computed against the warmed top-250 set with the
// existing haversine helper — one request-memoized DB read, no providers.
async function NearestCoveredCity({ city }: { city: City }) {
  const top = await getTopCities(250);
  let best: { candidate: City; km: number } | null = null;
  for (const candidate of top) {
    if (candidate.id === city.id) continue;
    if (typeof candidate.lat !== "number" || typeof candidate.lng !== "number") continue;
    const km = haversineKm(city.lat, city.lng, candidate.lat, candidate.lng);
    if (!best || km < best.km) best = { candidate, km };
  }
  if (!best) return null;

  return (
    <section aria-labelledby="nearest-covered-heading" className="space-y-6">
      <h2 id="nearest-covered-heading" className="labelled-rule">
        Nearest full guide
      </h2>
      <Link
        href={cityHref(best.candidate)}
        className="atlas-panel-strong interactive-card flex items-center justify-between gap-4 rounded-2xl p-6 md:p-8"
      >
        <div>
          <p className="text-foreground text-2xl font-bold tracking-tight">
            {best.candidate.city}, {best.candidate.country}
          </p>
          <p className="text-muted mt-2 text-sm leading-relaxed">
            About {Math.round(best.km).toLocaleString()} km away — full guide with AI briefing,
            curated places, and live city signals.
          </p>
        </div>
        <Navigation className="text-accent h-6 w-6 shrink-0" aria-hidden />
      </Link>
    </section>
  );
}

/**
 * US-01 (audit AF-3): honest reduced layout for cities without cached
 * substance. Shows only what is real — geo facts, live weather/AQI from the
 * free providers, the nearest fully covered city, and same-country links.
 * No AI briefing shell, no empty experiences, no "Generating…" stubs, and no
 * paid provider call can be triggered from this render path.
 */
function ReducedCityPage({
  city,
  touristJsonLd,
  breadcrumbJsonLd,
}: {
  city: City;
  touristJsonLd: object;
  breadcrumbJsonLd: object;
}) {
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
          items={[{ label: "Cities", href: "/resources/top-cities" }, { label: city.city }]}
        />
        <nav
          className="mb-10 flex flex-wrap items-center gap-3 md:mb-14"
          aria-label="City navigation"
        >
          <Link
            href="/"
            className="border-line bg-background/65 text-muted-strong hover:text-foreground inline-flex items-center gap-3 rounded-full border px-4 py-3 text-xs font-bold tracking-[0.18em] uppercase transition-colors duration-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to explorer
          </Link>
          {/* US-07: comparison entry point on the city page header. */}
          <Link
            href={city.slug ? `/compare?cities=${city.slug}` : "/compare"}
            className="border-line bg-background/65 text-muted-strong hover:text-foreground inline-flex items-center gap-3 rounded-full border px-4 py-3 text-xs font-bold tracking-[0.18em] uppercase transition-colors duration-300"
          >
            Compare this city
          </Link>
        </nav>

        <div className="mx-auto max-w-3xl space-y-14">
          <header className="organic-panel relative overflow-visible rounded-2xl p-5 sm:rounded-3xl md:rounded-4xl md:p-8">
            <div className="mb-3 flex flex-wrap items-center gap-3 md:mb-4">
              <span className="eyebrow">
                <Navigation className="text-accent h-3.5 w-3.5" />
                {city.iso3 || "CITY"}
              </span>
              <span className="atlas-chip">{city.capital || "Urban center"}</span>
              <span className="source-chip">
                <ShieldCheck className="h-3.5 w-3.5" />
                Lightweight profile
              </span>
            </div>
            <h1 className="text-foreground block text-[clamp(2.4rem,6vw,4.6rem)] leading-[0.95] break-words">
              {city.city}{" "}
              <span className="text-muted-strong text-[0.42em] tracking-[0.18em] uppercase">
                City Profile
              </span>
            </h1>
            <div className="mt-3 flex items-center gap-6 md:mt-4">
              <p className="text-muted-strong text-xl font-semibold tracking-[0.16em] uppercase md:text-2xl">
                {city.country}
              </p>
              <div className="from-line h-px flex-1 bg-gradient-to-r to-transparent" />
            </div>
            <p className="text-muted mt-5 max-w-2xl text-sm leading-relaxed">
              This is a lightweight data profile: verified facts and live conditions, without the
              full editorial guide. Our complete guides currently cover the most-visited cities.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3 md:mt-7">
              <Suspense fallback={<WeatherSummaryFallback />}>
                <WeatherSummaryCards city={city} reduced />
              </Suspense>
            </div>
          </header>

          <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8">
            <div className="atlas-panel rounded-xl p-6 sm:rounded-2xl md:p-8">
              <div className="text-muted mb-6 flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[color:var(--color-cat-stays-soft)]">
                  <Users className="h-5 w-5 text-[color:var(--color-cat-stays)]" />
                </div>
                <span className="text-xs font-semibold tracking-[0.2em] uppercase">
                  Census Data
                </span>
              </div>
              <div className="text-foreground mb-2 text-4xl font-bold tracking-[-0.02em] md:text-5xl">
                {formatPopulation(city.population)}
              </div>
              <div className="text-muted text-xs font-medium tracking-[0.15em] uppercase">
                Global Residents
              </div>
            </div>

            <div className="atlas-panel rounded-xl p-6 sm:rounded-2xl md:p-8">
              <div className="text-muted mb-4 flex items-center gap-4 sm:mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[color:color-mix(in_oklab,var(--color-brand-accent)_14%,transparent)]">
                  <MapPin className="h-5 w-5 text-[color:var(--color-brand-accent)]" />
                </div>
                <span className="text-xs font-semibold tracking-[0.2em] uppercase">Territory</span>
              </div>
              <div className="text-foreground mb-2 text-2xl leading-tight font-bold tracking-tight md:text-3xl">
                {city.admin_name || "Autonomous"}
              </div>
              <div className="text-muted text-xs font-medium tracking-[0.15em] uppercase">
                {typeof city.lat === "number" && typeof city.lng === "number"
                  ? `${city.lat.toFixed(2)}°, ${city.lng.toFixed(2)}°`
                  : "Regional Hub"}
              </div>
            </div>
          </section>

          <section className="space-y-10">
            <h2 className="labelled-rule">Live Conditions</h2>
            <Suspense fallback={<CityVitalsFallback />}>
              <CityVitalsSection city={city} />
            </Suspense>
          </section>

          {/* US-05: geography is the reduced profile's main content. */}
          <section className="space-y-6" aria-labelledby="reduced-map-heading">
            <h2 id="reduced-map-heading" className="labelled-rule">
              City Map
            </h2>
            <CityMap
              centerLat={city.lat}
              centerLng={city.lng}
              label={`Map of ${city.city}`}
              zoom={11}
            />
          </section>

          <NearestCoveredCity city={city} />

          <CityRelatedSection city={city} />
        </div>
      </div>
    </main>
  );
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

  // US-01 (audit AF-3): cold caches ⇒ honest reduced layout instead of a
  // full template of empty section shells. Cache-only check, shared with
  // generateMetadata (which adds noindex for the same condition).
  //
  // BOOTSTRAP FIX: a cold city would otherwise be stuck forever on the reduced
  // profile — the reduced page has no ExperiencesWrapper, and ExperiencesWrapper
  // is the only thing that fetches+caches places. So a cold cache could never
  // warm itself through a page view (chicken-and-egg). When live Places fetch
  // is enabled (dev, or prod with the kill switch on), render the full guide
  // even on a cold cache so the first view fetches and warms it. In prod with
  // live fetch off, behavior is unchanged: cold ⇒ reduced.
  const warm = await isCityWarm(city);
  const canFetchLive = isPaidProviderEnabled("google-places");
  console.info(
    `[city-page] render ${city.city}#${city.id}: warm=${warm} canFetchLive=${canFetchLive} -> ${
      warm || canFetchLive ? "FULL guide" : "REDUCED profile"
    }`
  );
  if (!warm && !canFetchLive) {
    return (
      <ReducedCityPage
        city={city}
        touristJsonLd={touristJsonLd}
        breadcrumbJsonLd={breadcrumbJsonLd}
      />
    );
  }

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
          items={[{ label: "Cities", href: "/resources/top-cities" }, { label: city.city }]}
        />
        <nav
          className="mb-10 flex flex-wrap items-center gap-3 md:mb-14"
          aria-label="City navigation"
        >
          <Link
            href="/"
            className="border-line bg-background/65 text-muted-strong hover:text-foreground inline-flex items-center gap-3 rounded-full border px-4 py-3 text-xs font-bold tracking-[0.18em] uppercase transition-colors duration-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to explorer
          </Link>
          {/* US-07: comparison entry point on the city page header. */}
          <Link
            href={city.slug ? `/compare?cities=${city.slug}` : "/compare"}
            className="border-line bg-background/65 text-muted-strong hover:text-foreground inline-flex items-center gap-3 rounded-full border px-4 py-3 text-xs font-bold tracking-[0.18em] uppercase transition-colors duration-300"
          >
            Compare this city
          </Link>
        </nav>

        <div className="grid grid-cols-1 items-start gap-10 sm:gap-14 lg:grid-cols-12 lg:gap-20">
          {/* Main Info Column */}
          <div className="space-y-14 lg:col-span-8">
            <header className="organic-panel relative overflow-visible rounded-2xl p-5 sm:rounded-3xl md:rounded-4xl md:p-8">
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
              <div className="atlas-panel interactive-card rounded-xl p-6 active:scale-[0.98] sm:rounded-2xl md:rounded-3xl md:p-8 lg:p-10">
                <div className="text-muted mb-6 flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[color:var(--color-cat-stays-soft)] transition-colors duration-300">
                    <Users className="h-5 w-5 text-[color:var(--color-cat-stays)]" />
                  </div>
                  <span className="text-xs font-semibold tracking-[0.2em] uppercase">
                    Census Data
                  </span>
                </div>
                <div className="text-foreground mb-2 text-4xl font-bold tracking-[-0.02em] md:text-5xl">
                  {formatPopulation(city.population)}
                </div>
                <div className="text-muted text-xs font-medium tracking-[0.15em] uppercase">
                  Global Residents
                </div>
              </div>

              <div className="atlas-panel interactive-card rounded-xl p-6 active:scale-[0.98] sm:rounded-2xl md:rounded-3xl md:p-8 lg:p-10">
                <div className="text-muted mb-4 flex items-center gap-4 sm:mb-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[color:color-mix(in_oklab,var(--color-brand-accent)_14%,transparent)] transition-colors">
                    <MapPin className="h-5 w-5 text-[color:var(--color-brand-accent)]" />
                  </div>
                  <span className="text-xs font-semibold tracking-[0.2em] uppercase">
                    Territory
                  </span>
                </div>
                <div className="text-foreground mb-2 text-2xl leading-tight font-bold tracking-tight md:text-3xl">
                  {city.admin_name || "Autonomous"}
                </div>
                <div className="text-muted text-xs font-medium tracking-[0.15em] uppercase">
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

            <CityTravelEssentialsSection
              cityName={city.city}
              adminName={city.admin_name}
              capital={city.capital}
              population={city.population}
            />

            {/* Mobile-only CTA - shown before experiences */}
            <CityPlanningPanel
              cityName={city.city}
              className="atlas-panel-strong relative space-y-6 rounded-2xl p-6 sm:rounded-2xl lg:hidden"
            />

            <Suspense fallback={<ExperiencesSkeleton />}>
              <ExperiencesWrapper cityName={city.city} lat={finalLat} lng={finalLng} />
            </Suspense>

            {/* SEO Phase 2.3 (audit 5.4): related cities turn the city page
                into a hub instead of a crawl dead end. Linked by country
                (closest semantic relationship we can compute without an
                editorial step). */}
            <CityRelatedSection city={city} />

            {/* SEO Phase 2.2 (audit 5.5): visible FAQ block paired with
                FAQPage + SpeakableSpecification JSON-LD. Lives below the
                experiences carousel where it answers the questions users
                still have after scanning the briefing. */}
            <CityFAQSection city={city} />
          </div>

          {/* Sidebar */}
          <div className="hidden space-y-8 lg:sticky lg:top-20 lg:col-span-4 lg:block">
            <CityPlanningPanel
              cityName={city.city}
              className="atlas-panel-strong relative space-y-8 rounded-2xl p-6 sm:rounded-3xl md:p-10"
            />

            <div className="atlas-panel rounded-2xl p-6 sm:rounded-3xl md:p-10">
              <h4 className="text-muted text-xs font-semibold tracking-[0.25em] uppercase">
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

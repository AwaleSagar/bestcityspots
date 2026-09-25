import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { City } from "@/lib/cities";
import { isPaidProviderEnabled } from "@/lib/cost-guard";
import { selectAvailableMetrics, shouldRenderMetricsPanel } from "@/lib/metrics-display";
import { citySlugSchema, coordinatesSchema, numericIdParam } from "@/lib/validation";
import { CityViewTracker } from "@/components/analytics/CityViewTracker";
import { AtAGlance, AtAGlanceSkeleton } from "@/components/city/AtAGlance";
import { BriefingOverview } from "@/components/city/briefing/BriefingOverview";
import { BriefingSeasons } from "@/components/city/briefing/BriefingSeasons";
import { InsightProvider } from "@/components/city/briefing/InsightProvider";
import { CityFaq } from "@/components/city/CityFaq";
import { CityHero } from "@/components/city/CityHero";
import { CityMap } from "@/components/city/CityMap";
import { CitySectionNav } from "@/components/city/CitySectionNav";
import {
  ConditionsPanel,
  ConditionsSkeleton,
  ConditionsUnavailable,
} from "@/components/city/ConditionsPanel";
import { MetricsSpec } from "@/components/city/MetricsSpec";
import { NearestGuide } from "@/components/city/NearestGuide";
import { PlacesSection, PlacesSkeleton } from "@/components/city/places/PlacesSection";
import { PlanSummary } from "@/components/city/places/PlanSummary";
import { RelatedCities } from "@/components/city/RelatedCities";
import { SeasonCalendar } from "@/components/city/SeasonCalendar";
import { TravelEssentials } from "@/components/city/TravelEssentials";
import { JsonLd } from "@/components/seo/JsonLd";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";
import {
  buildBreadcrumbJsonLd,
  buildCanonicalUrl,
  buildTouristJsonLd,
  deriveCityDescription,
  getCachedCityBySlug,
  getCachedCityMetrics,
  getCachedCityWeather,
  getCachedInsightRead,
  isCityWarm,
  resolveCityFromSegment,
} from "./city-data";

// Rendered per request. The guide reads `searchParams` (legacy `?lat&lng`
// links) and shows live conditions, so Next has always served it
// dynamically in production; the previous `revalidate` + `generateStaticParams`
// exports never produced cached pages. Declaring it explicitly keeps builds
// without database access (CI, placeholder env) from classifying the route as
// static, which made every city 500 with DYNAMIC_SERVER_USAGE at runtime.
// Provider spend stays protected by the cost guard (kill switches + daily
// budget) and the reduced profile for cold cities.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  // For metadata we only need to *read* the slug variant — for legacy ids
  // the page handler performs the redirect. A minimal noindex object keeps
  // the legacy crawl path cheap.
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
  // and are kept out of the index ("fewer, stronger pages"). `follow` keeps
  // link equity flowing to the nearest covered city and country hubs.
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

const FULL_SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "when", label: "When to go" },
  { id: "places", label: "Places" },
  { id: "conditions", label: "Conditions" },
  { id: "practical", label: "Practical" },
  { id: "faq", label: "FAQ" },
] as const;

async function Glance({ city }: { city: City }) {
  const weather = await getCachedCityWeather(city).catch(() => null);
  return <AtAGlance weather={weather} />;
}

async function Conditions({ city }: { city: City }) {
  const weather = await getCachedCityWeather(city).catch(() => null);
  return weather ? (
    <ConditionsPanel weather={weather} />
  ) : (
    <ConditionsUnavailable cityName={city.city} />
  );
}

async function KeyNumbers({ city }: { city: City }) {
  const metrics = await getCachedCityMetrics(city).catch(() => null);
  if (!shouldRenderMetricsPanel(selectAvailableMetrics(metrics))) return null;
  return (
    <section aria-labelledby="key-numbers-title">
      <h2 id="key-numbers-title" className="font-sans text-base font-semibold">
        Key numbers
      </h2>
      <div className="border-rule mt-2 border-t">
        <MetricsSpec metrics={metrics} />
      </div>
    </section>
  );
}

async function Faq({ city, intro }: { city: City; intro: string | null }) {
  const metrics = await getCachedCityMetrics(city).catch(() => null);
  return <CityFaq city={city} intro={intro} climateComfort={metrics?.climate_comfort ?? null} />;
}

/**
 * US-01 (audit AF-3): honest reduced layout for cities without cached
 * substance — geo facts, live conditions from the free providers, a map, the
 * nearest fully covered city and same-country links. No AI shell, no empty
 * places, and no paid provider call can be triggered from this path.
 */
function ReducedCityPage({ city, canonical }: { city: City; canonical: string }) {
  return (
    <main id="main-content">
      <JsonLd data={buildTouristJsonLd(city, canonical)} />
      <JsonLd data={buildBreadcrumbJsonLd(city, canonical)} />
      <CityViewTracker city={city} />
      <Container>
        <CityHero
          city={city}
          canonical={canonical}
          lightweight
          glance={
            <Suspense fallback={<AtAGlanceSkeleton />}>
              <Glance city={city} />
            </Suspense>
          }
        />
        <div className="space-y-16 py-12 pb-20 sm:space-y-20">
          <Section id="conditions" title="Live conditions">
            <Suspense fallback={<ConditionsSkeleton />}>
              <Conditions city={city} />
            </Suspense>
          </Section>
          <Section id="map" title="Map">
            <CityMap
              centerLat={city.lat}
              centerLng={city.lng}
              label={`Map of ${city.city}`}
              zoom={11}
              className="lg:aspect-[21/9]"
            />
          </Section>
          <Suspense fallback={null}>
            <NearestGuide city={city} />
          </Suspense>
          <Suspense fallback={null}>
            <RelatedCities city={city} />
          </Suspense>
        </div>
      </Container>
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
  const { lat, lng } = await searchParams;

  const coordsResult = coordinatesSchema.safeParse({ lat, lng });
  const validCoords = coordsResult.success ? coordsResult.data : {};
  const searchSuffix =
    typeof lat === "string" && typeof lng === "string"
      ? `?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`
      : "";

  const city = await resolveCityFromSegment(slug, searchSuffix);
  if (!city) notFound();
  const canonical = buildCanonicalUrl(city);

  // US-01 (audit AF-3): cold caches ⇒ honest reduced layout (noindex in
  // generateMetadata). BOOTSTRAP: when live Places fetch is enabled, render
  // the full guide even on a cold cache so the first view can warm it;
  // with live fetch off (production default) cold stays reduced.
  const warm = await isCityWarm(city);
  const canFetchLive = isPaidProviderEnabled("google-places");
  console.info(
    `[city-page] render ${city.city}#${city.id}: warm=${warm} canFetchLive=${canFetchLive} -> ${
      warm || canFetchLive ? "FULL guide" : "REDUCED profile"
    }`
  );
  if (!warm && !canFetchLive) return <ReducedCityPage city={city} canonical={canonical} />;

  const centerLat = validCoords.lat ?? city.lat;
  const centerLng = validCoords.lng ?? city.lng;
  const insightRead = await getCachedInsightRead(city.id).catch(() => null);
  const insight = insightRead?.insight ?? null;

  return (
    <main id="main-content">
      <JsonLd data={buildTouristJsonLd(city, canonical)} />
      <JsonLd data={buildBreadcrumbJsonLd(city, canonical)} />
      <CityViewTracker city={city} />
      <Container>
        <CityHero
          city={city}
          canonical={canonical}
          glance={
            <Suspense fallback={<AtAGlanceSkeleton />}>
              <Glance city={city} />
            </Suspense>
          }
        />
        <CitySectionNav sections={FULL_SECTIONS} />

        <InsightProvider
          cityId={city.id}
          initialInsight={insight}
          fresh={Boolean(insightRead?.fresh)}
          generatedAt={insightRead?.updatedAt ?? null}
        >
          <div className="grid gap-16 py-12 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-16 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="min-w-0 space-y-16">
              <Section id="overview" title="Overview">
                <BriefingOverview cityName={city.city} />
              </Section>
              <Section
                id="when"
                title="When to go"
                description="Seasons by month for this hemisphere. Pick a month to see where else is at its best."
              >
                <SeasonCalendar
                  cityName={city.city}
                  lat={city.lat}
                  currentMonth={new Date().getUTCMonth()}
                />
                <div className="mt-10">
                  <BriefingSeasons />
                </div>
              </Section>
            </div>
            <aside
              aria-label={`${city.city} at a glance`}
              className="space-y-6 lg:sticky lg:top-36 lg:self-start"
            >
              <Suspense
                fallback={
                  <LoadingRegion label="Loading key numbers" className="space-y-2">
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="h-40 w-full" />
                  </LoadingRegion>
                }
              >
                <KeyNumbers city={city} />
              </Suspense>
              <PlanSummary cityName={city.city} />
            </aside>
          </div>
        </InsightProvider>

        <div className="space-y-16 pb-20 sm:space-y-20">
          <Section
            id="places"
            title="Places"
            description="Top sights, food and stays, ordered by how many travelers reviewed them."
          >
            <Suspense fallback={<PlacesSkeleton />}>
              <PlacesSection
                cityId={city.id}
                cityName={city.city}
                lat={centerLat}
                lng={centerLng}
              />
            </Suspense>
          </Section>
          <Section id="conditions" title="Live conditions">
            <Suspense fallback={<ConditionsSkeleton />}>
              <Conditions city={city} />
            </Suspense>
          </Section>
          <Section id="practical" title="Practical notes">
            <TravelEssentials city={city} />
          </Section>
          <Section id="faq" title="Travelers frequently ask">
            <Suspense fallback={<Skeleton className="h-64 w-full" />}>
              <Faq city={city} intro={insight?.intro?.trim() ?? null} />
            </Suspense>
          </Section>
          <Suspense fallback={null}>
            <RelatedCities city={city} />
          </Suspense>
        </div>
      </Container>
    </main>
  );
}

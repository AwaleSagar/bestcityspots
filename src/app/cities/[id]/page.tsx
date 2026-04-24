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
  Users,
  Navigation,
  Activity,
  Cloud as CloudIcon,
  ThermometerSun,
} from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import {
  Container,
  Section,
  Stack,
  Row,
  Grid,
  Display,
  Caption,
  Text,
  MetricStat,
  Cover,
  Divider,
  FadeIn,
} from "@/components/atlas";

function CityVitalsFallback() {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-5">
      <Caption>Live city vitals</Caption>
      <Text size="sm" tone="muted" className="mt-3">
        Vitals unavailable right now. Please check back soon.
      </Text>
    </div>
  );
}

function CityVitalsSkeleton() {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-5">
      <div className="atlas-shimmer h-4 w-32 rounded" />
      <div className="atlas-shimmer mt-4 h-10 w-24 rounded" />
      <div className="atlas-shimmer mt-4 h-4 w-full rounded" />
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
    <ExperiencesSection
      cityName={cityName}
      landmarks={landmarks}
      restaurants={restaurants}
      hotels={hotels}
    />
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = cityIdSchema.safeParse(id);
  if (!result.success) return { title: "City not found" };

  const city = await getCityById(result.data);
  if (!city) return { title: "City not found" };

  return {
    title: `${city.city}, ${city.country} — travel guide`,
    description: `Research ${city.city}, ${city.country} with live weather, air quality, population data, and AI-assisted travel briefings.`,
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

  if (!idResult.success) notFound();
  if (!coordsResult.success) {
    console.warn("Invalid coordinates provided:", coordsResult.error);
  }

  const cityId = idResult.data;
  const validCoords = coordsResult.success ? coordsResult.data : {};

  const city = await getCityById(cityId);
  if (!city) notFound();

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
    <main id="main-content">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── Cover header ── */}
      <div className="relative h-[42vh] min-h-[280px] w-full sm:h-[50vh]">
        <Cover seed={city.id} src={null} priority>
          <Container className="text-white">
            <Stack gap={2} align="start">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-black/35 px-2.5 py-0.5 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-white/95 backdrop-blur">
                <Navigation className="h-3 w-3" aria-hidden />
                {city.iso3 || "City"}
              </span>
              <Display
                className="!text-white"
                style={{
                  viewTransitionName: `city-name-${city.id}`,
                } as React.CSSProperties}
              >
                {city.city}
              </Display>
              <p className="text-sm font-semibold uppercase tracking-[0.08em] text-white/85 sm:text-base">
                {city.country}
                {city.admin_name ? ` · ${city.admin_name}` : ""}
              </p>
            </Stack>
          </Container>
        </Cover>
      </div>

      <Container>
        <div className="py-6">
          <Breadcrumbs
            items={[{ label: "Cities", href: "/" }, { label: city.city }]}
          />
        </div>
      </Container>

      {/* ── Right now (weather/AQI) ── */}
      <Section size="sm" className="!pt-0" aria-labelledby="right-now-heading">
        <Container>
          <Stack gap={4}>
            <Caption id="right-now-heading">Right now</Caption>
            <Suspense fallback={<CityVitalsSkeleton />}>
              {weather ? <CityVitals data={weather} /> : <CityVitalsFallback />}
            </Suspense>
          </Stack>
        </Container>
      </Section>

      <Container>
        <Divider />
      </Container>

      {/* ── Vitals — population, territory ── */}
      <Section size="sm" aria-labelledby="vitals-heading">
        <Container>
          <Stack gap={4}>
            <Caption id="vitals-heading">Vitals</Caption>
            <Grid cols={{ base: 2, md: 4 }} gap={3}>
              <MetricStat
                icon={<Users className="h-3.5 w-3.5" aria-hidden />}
                label="Population"
                value={formatPopulation(city.population)}
                source="Census"
              />
              <MetricStat
                label="Region"
                value={city.admin_name || "Autonomous"}
              />
              <MetricStat
                icon={<CloudIcon className="h-3.5 w-3.5" aria-hidden />}
                label="Pollution (PM2.5)"
                value={metrics?.pollution_pm25 ?? null}
                unit="µg/m³"
                source={metrics?.source?.pollution as string | undefined}
              />
              <MetricStat
                icon={<ThermometerSun className="h-3.5 w-3.5" aria-hidden />}
                label="Climate comfort"
                value={metrics?.climate_comfort ?? null}
                source={metrics?.source?.climate as string | undefined}
              />
            </Grid>
            {metrics?.updated_at && (
              <Row gap={2} className="text-[color:var(--color-muted-soft)]">
                <Activity className="h-3 w-3" aria-hidden />
                <Caption>
                  Updated {new Date(metrics.updated_at).toLocaleDateString()}
                </Caption>
              </Row>
            )}
          </Stack>
        </Container>
      </Section>

      <Container>
        <Divider />
      </Container>

      {/* ── AI briefing ── */}
      <Section size="md">
        <Container>
          <FadeIn>
            <Suspense fallback={<AIBriefingSkeleton />}>
              <AIBriefingSection city={city} />
            </Suspense>
          </FadeIn>
        </Container>
      </Section>

      <Container>
        <Divider />
      </Container>

      {/* ── Top places ── */}
      <Section size="md">
        <Container>
          <FadeIn>
            <Suspense fallback={<ExperiencesSkeleton />}>
              <ExperiencesWrapper
                cityName={city.city}
                lat={finalLat}
                lng={finalLng}
              />
            </Suspense>
          </FadeIn>
        </Container>
      </Section>
    </main>
  );
}

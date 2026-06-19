import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Scale, Users, MapPin, X, Sparkles } from "lucide-react";
import { getCityBySlug, type City } from "@/lib/cities";
import { getCityWeather } from "@/lib/weather";
import { getCityMetrics } from "@/lib/metrics";
import { readCachedCityInsight } from "@/lib/intelligence";
import { selectAvailableMetrics, type DisplayMetric } from "@/lib/metrics-display";
import { formatPopulation } from "@/lib/format";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import ComparePicker from "./ComparePicker";

// US-07 (audit AF-4): side-by-side city comparison built entirely from the
// existing cache-first data layer. COST GUARD INVARIANT: this route must
// never trigger a paid provider call — insights are read cache-only, and
// weather/metrics use the free providers behind their own SWR caches.
export const revalidate = 3600;

// noindex until content quality is validated (US-07 AC); follow keeps
// equity flowing to the linked city pages.
export const metadata: Metadata = {
  title: "Compare Cities",
  description:
    "Compare up to three cities side-by-side: live weather, air quality, population, and verified metrics.",
  robots: { index: false, follow: true },
};

const MAX_CITIES = 3;

interface ComparisonColumn {
  city: City;
  slug: string;
  weather: Awaited<ReturnType<typeof getCityWeather>>;
  metrics: DisplayMetric[];
  insightIntro: string | null;
}

function parseSlugs(raw: string | undefined): string[] {
  if (!raw) return [];
  return [...new Set(raw.split(",").map((s) => s.trim().toLowerCase()))]
    .filter((s) => /^[a-z0-9-]{1,80}$/.test(s))
    .slice(0, MAX_CITIES);
}

async function loadColumn(slug: string): Promise<ComparisonColumn | null> {
  const city = await getCityBySlug(slug);
  if (!city) return null;

  const [weather, metrics, insightRead] = await Promise.all([
    getCityWeather(city),
    getCityMetrics(city),
    readCachedCityInsight(city.id).catch(() => ({ insight: null })),
  ]);

  return {
    city,
    slug,
    weather,
    metrics: selectAvailableMetrics(metrics),
    insightIntro: insightRead.insight?.intro?.slice(0, 180) ?? null,
  };
}

function removeHref(slugs: string[], slug: string): string {
  const rest = slugs.filter((s) => s !== slug);
  return rest.length > 0 ? `/compare?cities=${rest.join(",")}` : "/compare";
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ cities?: string }>;
}) {
  const { cities: raw } = await searchParams;
  const slugs = parseSlugs(raw);
  const columns = (await Promise.all(slugs.map(loadColumn))).filter(
    (column): column is ComparisonColumn => column !== null
  );
  const activeSlugs = columns.map((column) => column.slug);

  return (
    <main id="main-content" className="text-foreground min-h-screen bg-transparent">
      <div
        className="container-gutter mx-auto max-w-6xl px-4 py-12 sm:px-6"
        style={{ paddingTop: "max(3rem, calc(env(safe-area-inset-top, 0px) + 4rem))" }}
      >
        <Breadcrumbs items={[{ label: "Compare" }]} />

        <span className="eyebrow">
          <Scale className="text-accent h-3.5 w-3.5" aria-hidden />
          Side by side
        </span>
        <h1 className="page-title text-foreground mt-4">Compare cities</h1>
        <p className="lede mt-5 max-w-2xl">
          Up to three cities, one view: live weather and air quality, population scale, and every
          verified metric we hold. The URL is the comparison — share it as is.
        </p>

        <div className="mt-8">
          <ComparePicker current={activeSlugs} />
        </div>

        {columns.length === 0 ? (
          <div className="organic-panel mt-12 flex flex-col items-center gap-6 rounded-3xl p-8 text-center md:flex-row md:gap-10 md:p-12 md:text-left">
            <Image
              src="/illustrations/compare-empty.webp"
              alt="Two empty comparison cards waiting to be filled"
              width={600}
              height={480}
              className="w-full max-w-[16rem] shrink-0"
            />
            <div>
              <h2 className="text-foreground text-2xl font-bold tracking-tight">
                Start with any city
              </h2>
              <p className="text-muted mt-3 max-w-lg text-sm leading-relaxed">
                Search above, or jump in from{" "}
                <Link href="/resources/top-cities" className="text-link">
                  The Global 50
                </Link>{" "}
                — every city page has a Compare shortcut.
              </p>
            </div>
          </div>
        ) : (
          <div
            className={`mt-12 grid grid-cols-1 gap-6 ${
              columns.length === 2 ? "md:grid-cols-2" : columns.length >= 3 ? "md:grid-cols-3" : ""
            }`}
          >
            {columns.map((column) => (
              <article
                key={column.slug}
                className="atlas-frame flex flex-col gap-6 rounded-3xl p-6 md:p-8"
                aria-label={`${column.city.city} comparison column`}
              >
                <header className="flex items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/cities/${column.slug}`}
                      className="text-foreground hover:text-accent-strong text-2xl font-bold tracking-tight transition-colors"
                    >
                      {column.city.city}
                    </Link>
                    <p className="text-muted mt-1 flex items-center gap-1.5 text-xs font-semibold tracking-[0.15em] uppercase">
                      <MapPin className="h-3 w-3" aria-hidden />
                      {column.city.country}
                    </p>
                  </div>
                  <Link
                    href={removeHref(activeSlugs, column.slug)}
                    className="touch-target text-muted hover:text-foreground rounded-md transition-colors"
                    aria-label={`Remove ${column.city.city} from comparison`}
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </Link>
                </header>

                <dl className="space-y-4">
                  <div className="border-line flex items-baseline justify-between gap-4 border-b pb-3">
                    <dt className="text-muted text-xs font-semibold tracking-[0.15em] uppercase">
                      Right now
                    </dt>
                    <dd className="text-foreground text-right text-sm font-semibold">
                      {column.weather
                        ? `${Math.round(column.weather.temp)}°C · ${column.weather.aqi_label} air`
                        : "Live data unavailable"}
                    </dd>
                  </div>
                  <div className="border-line flex items-baseline justify-between gap-4 border-b pb-3">
                    <dt className="text-muted flex items-center gap-1.5 text-xs font-semibold tracking-[0.15em] uppercase">
                      <Users className="h-3 w-3" aria-hidden />
                      Population
                    </dt>
                    <dd className="text-foreground text-right text-sm font-semibold">
                      {formatPopulation(column.city.population)}
                    </dd>
                  </div>
                  {column.metrics.map((metric) => (
                    <div
                      key={metric.key}
                      className="border-line flex items-baseline justify-between gap-4 border-b pb-3"
                    >
                      <dt className="text-muted text-xs font-semibold tracking-[0.15em] uppercase">
                        {metric.label}
                      </dt>
                      <dd className="text-foreground text-right text-sm font-semibold">
                        {typeof metric.value === "number"
                          ? metric.value.toLocaleString()
                          : metric.value}
                        {metric.unit ? (
                          <span className="text-muted ml-1 text-xs">{metric.unit}</span>
                        ) : null}
                      </dd>
                    </div>
                  ))}
                </dl>

                {column.insightIntro ? (
                  <p className="text-muted text-sm leading-relaxed">
                    <Sparkles className="text-accent mr-1.5 inline h-3.5 w-3.5" aria-hidden />
                    <span className="text-muted-strong font-semibold">AI summary:</span>{" "}
                    {column.insightIntro}
                    {column.insightIntro.length >= 180 ? "…" : ""}
                  </p>
                ) : null}

                <Link href={`/cities/${column.slug}`} className="btn-secondary mt-auto">
                  Open full guide
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

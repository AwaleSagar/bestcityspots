import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Scale, Sparkles, X } from "lucide-react";
import { cityHref, getCityBySlug, getTopCities, type City } from "@/lib/cities";
import { capitalLabel, formatTemperature, regionLine } from "@/lib/city-display";
import { formatPopulation } from "@/lib/format";
import { readCachedCityInsight } from "@/lib/intelligence";
import { getCityMetrics } from "@/lib/metrics";
import { selectAvailableMetrics, type DisplayMetric } from "@/lib/metrics-display";
import { getCityWeather } from "@/lib/weather";
import { buttonClasses } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { AqiBadge } from "@/components/city/AqiBadge";
import { MAX_COMPARE } from "@/components/compare/compare-config";
import { ComparePicker } from "@/components/compare/ComparePicker";

// US-07 (audit AF-4): side-by-side comparison built entirely from the
// cache-first data layer. COST GUARD INVARIANT: this route must never
// trigger a paid provider call — insights are read cache-only, and
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
    .slice(0, MAX_COMPARE);
}

async function loadColumn(slug: string): Promise<ComparisonColumn | null> {
  const city = await getCityBySlug(slug);
  if (!city) return null;
  const [weather, metrics, insightRead] = await Promise.all([
    getCityWeather(city).catch(() => null),
    getCityMetrics(city).catch(() => null),
    readCachedCityInsight(city.id).catch(() => ({ insight: null })),
  ]);
  return {
    city,
    slug,
    weather,
    metrics: selectAvailableMetrics(metrics),
    insightIntro: insightRead.insight?.intro?.slice(0, 220) ?? null,
  };
}

function removeHref(slugs: string[], slug: string): string {
  const rest = slugs.filter((s) => s !== slug);
  return rest.length > 0 ? `/compare?cities=${rest.join(",")}` : "/compare";
}

function formatMetric(metric: DisplayMetric | undefined) {
  if (!metric)
    return (
      <span className="text-ink-muted">
        <span aria-hidden>—</span>
        <span className="sr-only">No data</span>
      </span>
    );
  const value =
    typeof metric.value === "number" ? metric.value.toLocaleString("en-US") : metric.value;
  return (
    <span className="tabular-nums">
      {value}
      {metric.unit ? <span className="text-ink-muted"> {metric.unit}</span> : null}
    </span>
  );
}

const ROW_HEADER =
  "sticky left-0 z-10 bg-paper py-4 pr-4 text-left align-top text-sm font-medium text-ink-muted";
const CELL = "min-w-[13rem] py-4 pr-6 align-top";

async function Suggestions({ exclude }: { exclude: string[] }) {
  const top = (await getTopCities(8)).filter((city) => city.slug && !exclude.includes(city.slug));
  if (top.length === 0) return null;
  return (
    <div className="mt-6">
      <p className="text-ink-muted text-sm">Or start with a popular city:</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {top.slice(0, 6).map((city) => (
          <li key={city.id}>
            <Link
              href={`/compare?cities=${[...exclude, city.slug].join(",")}`}
              className="border-rule bg-surface hover:border-rule-strong hover:text-accent inline-flex h-9 items-center rounded-full border px-3.5 text-sm pointer-coarse:h-11"
            >
              + {city.city}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
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
  const metricRows = [
    ...new Map(
      columns.flatMap((column) => column.metrics).map((metric) => [metric.key, metric.label])
    ).entries(),
  ];

  return (
    <main id="main-content">
      <Container>
        <PageHeader
          breadcrumbs={[{ label: "Home", href: "/" }, { label: "Compare" }]}
          title="Compare cities"
          lede="Up to three cities in one view: live conditions, size and every verified metric we hold. The address bar is the comparison — share it as is."
        >
          <ComparePicker
            current={activeSlugs}
            currentIds={columns.map((column) => column.city.id)}
          />
          {columns.length === 0 ? <Suggestions exclude={activeSlugs} /> : null}
        </PageHeader>

        <div className="py-12 pb-20">
          {columns.length === 0 ? (
            <EmptyState icon={<Scale aria-hidden />} title="Nothing to compare yet">
              Add two or three cities above to see them side by side.
            </EmptyState>
          ) : (
            <div className="relative -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <table className="w-full min-w-max border-collapse text-left">
                <caption className="sr-only">
                  Comparison of {columns.map((column) => column.city.city).join(", ")}
                </caption>
                <thead>
                  <tr className="border-rule-strong border-b">
                    <td className="bg-paper sticky left-0 z-10 w-36 sm:w-44" />
                    {columns.map((column) => (
                      <th key={column.slug} scope="col" className={`${CELL} pb-5 font-normal`}>
                        <Link
                          href={cityHref(column.city)}
                          className="font-display hover:text-accent text-2xl leading-tight"
                        >
                          {column.city.city}
                        </Link>
                        <span className="text-ink-muted mt-0.5 block text-sm">
                          {regionLine(column.city)}
                        </span>
                        <Link
                          href={removeHref(activeSlugs, column.slug)}
                          className="text-ink-muted hover:text-danger mt-3 inline-flex items-center gap-1 text-sm"
                        >
                          <X aria-hidden className="size-3.5" />
                          Remove<span className="sr-only"> {column.city.city}</span>
                        </Link>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-rule divide-y">
                  <tr>
                    <th scope="row" className={ROW_HEADER}>
                      Right now
                    </th>
                    {columns.map((column) => (
                      <td key={column.slug} className={CELL}>
                        {column.weather ? (
                          <>
                            <span className="text-lg font-medium tabular-nums">
                              {formatTemperature(column.weather.temp)}
                            </span>
                            <span className="text-ink-muted ml-2 text-sm first-letter:uppercase">
                              {column.weather.description}
                            </span>
                            <div className="mt-1 text-sm">
                              <AqiBadge aqi={column.weather.aqi} label={column.weather.aqi_label} />
                            </div>
                          </>
                        ) : (
                          <span className="text-ink-muted text-sm">Unavailable</span>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row" className={ROW_HEADER}>
                      Population
                    </th>
                    {columns.map((column) => (
                      <td key={column.slug} className={`${CELL} tabular-nums`}>
                        {formatPopulation(column.city.population)}
                        {capitalLabel(column.city.capital) ? (
                          <span className="text-ink-muted block text-sm">
                            {capitalLabel(column.city.capital)}
                          </span>
                        ) : null}
                      </td>
                    ))}
                  </tr>
                  {metricRows.map(([key, label]) => (
                    <tr key={key}>
                      <th scope="row" className={ROW_HEADER}>
                        {label}
                      </th>
                      {columns.map((column) => (
                        <td key={column.slug} className={CELL}>
                          {formatMetric(column.metrics.find((metric) => metric.key === key))}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr>
                    <th scope="row" className={ROW_HEADER}>
                      <span className="inline-flex items-center gap-1.5">
                        Overview
                        <Sparkles aria-label="AI-written" className="text-accent size-3.5" />
                      </span>
                    </th>
                    {columns.map((column) => (
                      <td key={column.slug} className={`${CELL} max-w-xs`}>
                        {column.insightIntro ? (
                          <p className="font-display text-base whitespace-normal">
                            {column.insightIntro}
                            {column.insightIntro.length >= 220 ? "…" : ""}
                          </p>
                        ) : (
                          <span className="text-ink-muted text-sm">No overview yet</span>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="bg-paper sticky left-0" />
                    {columns.map((column) => (
                      <td key={column.slug} className={CELL}>
                        <Link
                          href={cityHref(column.city)}
                          className={buttonClasses({ size: "sm" })}
                        >
                          Open {column.city.city} guide
                          <ArrowRight aria-hidden />
                        </Link>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Container>
    </main>
  );
}

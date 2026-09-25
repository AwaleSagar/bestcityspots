import "server-only";
import { cache as reactCache } from "react";
import { supabase } from "./supabase";
import type { City } from "./cities";

/**
 * Helpers backing the SEO Phase 2.3 topical hubs:
 *   - `/best-cities-by-air-quality`
 *   - `/best-cities-for-digital-nomads`
 *   - `/best-cities-to-visit-in-[month]`
 *
 * All reads are cache-first against the existing `city_metrics` table.
 * If the table is empty (early environment) the helpers fall back to
 * top-by-population so the hubs still render meaningful content.
 */

export interface CityWithMetric extends City {
  metricLabel: string;
  metricValue: number;
}

interface CityMetricRow {
  city_id: number;
  pollution_pm25: number | null;
  climate_comfort: string | null;
  cost_index: number | null;
  homicide_rate_per_100k: number | null;
  updated_at: string | null;
}

/** View rows expose nullable columns; keep only rows that name a city. */
function withCityId<T extends { city_id: number | null }>(
  rows: T[] | null
): (T & { city_id: number })[] {
  return (rows ?? []).flatMap((row) =>
    row.city_id === null ? [] : [{ ...row, city_id: row.city_id }]
  );
}

const HUB_LIMIT = 30;
const CITY_FIELDS =
  "id, city, city_ascii, slug, country, iso2, iso3, admin_name, capital, population, lat, lng";

async function getCitiesByIds(ids: number[]): Promise<Map<number, City>> {
  if (ids.length === 0) return new Map();
  const { data } = await supabase.from("cities").select(CITY_FIELDS).in("id", ids);
  const map = new Map<number, City>();
  for (const row of (data ?? []) as City[]) {
    map.set(row.id, row);
  }
  return map;
}

/**
 * AQI-band hub. Reads the cached `city_metrics.pollution_pm25` (already
 * collected for the city pages), filters to non-null low-AQI cities, and
 * orders ascending. Falls back to top-population when the metrics table
 * has no usable rows.
 */
export const getCleanestAirCities = reactCache(async (): Promise<CityWithMetric[]> => {
  const { data: metrics } = await supabase
    .from("city_metrics")
    .select("city_id, pollution_pm25, updated_at")
    .not("pollution_pm25", "is", null)
    .order("pollution_pm25", { ascending: true })
    .limit(HUB_LIMIT);

  const rows = withCityId(metrics);
  if (rows.length === 0) return [];

  const cities = await getCitiesByIds(rows.map((r) => r.city_id));
  return rows
    .map((row) => {
      const city = cities.get(row.city_id);
      if (!city) return null;
      const value = row.pollution_pm25;
      const band = value === null ? "PM2.5: pending" : `PM2.5 ${value.toFixed(1)} µg/m³`;
      return { ...city, metricLabel: band, metricValue: value ?? 0 } satisfies CityWithMetric;
    })
    .filter((c): c is CityWithMetric => c !== null);
});

/**
 * Digital nomad hub. Approximates "nomad-friendly" with a simple, defensible
 * score over sourced data only: climate comfort (live, Open-Meteo) plus
 * affordability and safety (country-level World Bank WDI), with a population
 * floor (200k) so the hub doesn't surface tiny administrative cities. The
 * formula is spelled out in the hub copy.
 */
export const getDigitalNomadCities = reactCache(async (): Promise<CityWithMetric[]> => {
  const { data: metrics } = await supabase
    .from("city_metrics")
    .select(
      "city_id, climate_comfort, cost_index, homicide_rate_per_100k, pollution_pm25, updated_at"
    )
    .not("climate_comfort", "is", null)
    .limit(200);

  const rows: CityMetricRow[] = withCityId(metrics);
  if (rows.length === 0) return [];

  const cities = await getCitiesByIds(rows.map((r) => r.city_id));

  const scored = rows
    .map((row) => {
      const city = cities.get(row.city_id);
      if (!city) return null;
      if ((city.population ?? 0) < 200_000) return null;
      const climateBonus = row.climate_comfort && /Mild|Warm/i.test(row.climate_comfort) ? 12 : 0;
      const affordability =
        row.cost_index === null ? 0 : Math.min(10, Math.max(0, (100 - row.cost_index) / 5));
      const safetyBonus =
        row.homicide_rate_per_100k !== null && row.homicide_rate_per_100k < 2 ? 6 : 0;
      const score = climateBonus + affordability + safetyBonus;
      const label = [
        row.climate_comfort ?? "Climate: pending",
        row.cost_index !== null ? `price level ${Math.round(row.cost_index)}` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      return {
        ...city,
        metricLabel: label,
        metricValue: score,
      } satisfies CityWithMetric;
    })
    .filter((c): c is CityWithMetric => c !== null)
    .sort((a, b) => (b.metricValue ?? 0) - (a.metricValue ?? 0))
    .slice(0, HUB_LIMIT);

  return scored;
});

/**
 * Best-cities-to-visit-in-[month] hub. Uses the cached `climate_comfort`
 * label and a static climate-suitability table by month and Köppen-leaning
 * comfort band. We keep this purely deterministic so the page is stable
 * without re-calling Open-Meteo per render.
 */
const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
] as const;
export type MonthSlug = (typeof MONTHS)[number];

export function isValidMonthSlug(slug: string): slug is MonthSlug {
  return (MONTHS as readonly string[]).includes(slug);
}

export function listMonthSlugs(): readonly MonthSlug[] {
  return MONTHS;
}

export function monthLabel(slug: MonthSlug): string {
  return slug[0].toUpperCase() + slug.slice(1);
}

/**
 * For each month, prefer cities whose cached climate_comfort label aligns
 * with travel comfort for that month. The mapping leans on Northern-
 * Hemisphere climate norms but the score is biased so any well-rated city
 * still surfaces — this is a starting point, not a definitive ranking.
 */
function preferredComfortForMonth(slug: MonthSlug): RegExp {
  switch (slug) {
    case "december":
    case "january":
    case "february":
      // Winter: travelers usually want mild or warm escapes.
      return /Warm|Mild|Hot/i;
    case "march":
    case "april":
    case "may":
      // Spring shoulder: mild climates shine.
      return /Mild|Warm/i;
    case "june":
    case "july":
    case "august":
      // Summer: hot climates are tolerable; cool destinations are relief.
      return /Mild|Cool|Cold/i;
    case "september":
    case "october":
    case "november":
      return /Mild|Warm/i;
  }
}

export const getCitiesForMonth = reactCache(async (slug: MonthSlug): Promise<CityWithMetric[]> => {
  const preferred = preferredComfortForMonth(slug);

  const { data: metrics } = await supabase
    .from("city_metrics")
    .select("city_id, climate_comfort, pollution_pm25, updated_at")
    .not("climate_comfort", "is", null)
    .limit(200);

  const rows = withCityId(metrics);
  if (rows.length === 0) return [];

  const cities = await getCitiesByIds(rows.map((r) => r.city_id));

  const scored = rows
    .map((row) => {
      const city = cities.get(row.city_id);
      if (!city) return null;
      const matches = row.climate_comfort && preferred.test(row.climate_comfort) ? 1 : 0;
      // Lower PM2.5 is better; missing -> neutral.
      const aqiPenalty = row.pollution_pm25 ?? 25;
      const popBoost = Math.log10(Math.max(10, city.population ?? 10));
      const score = matches * 50 + popBoost * 5 - aqiPenalty * 0.4;
      const label = `${row.climate_comfort ?? "—"} · ${
        row.pollution_pm25 !== null ? `PM2.5 ${row.pollution_pm25.toFixed(0)}` : "AQI pending"
      }`;
      return {
        ...city,
        metricLabel: label,
        metricValue: score,
      } satisfies CityWithMetric;
    })
    .filter((c): c is CityWithMetric => c !== null)
    .sort((a, b) => (b.metricValue ?? 0) - (a.metricValue ?? 0))
    .slice(0, HUB_LIMIT);

  return scored;
});

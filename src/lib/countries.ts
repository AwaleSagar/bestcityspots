import "server-only";
import { cache as reactCache } from "react";
import { supabase } from "./supabase";
import type { City } from "./cities";

/**
 * Helpers backing the SEO Phase 2.3 IA hubs (country pages, topical hubs,
 * `/cities` index). All reads are cached by React's `cache()` so a single
 * request that renders the hub plus a prerendered card can share one DB
 * round trip.
 *
 * These helpers intentionally read from the existing `cities` table; no new
 * provider dependencies. Filtering and ranking happen in-process so the
 * hubs are entirely powered by data we already collect.
 */

const COUNTRY_PAGE_LIMIT = 200;

export function slugifyCountry(country: string): string {
  return country
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export interface CountrySummary {
  country: string;
  iso2: string | null;
  iso3: string | null;
  cityCount: number;
  topPopulation: number;
  /** URL-safe slug derived from country name. */
  slug: string;
}

/**
 * Aggregate the `cities` table into one row per country. Used by
 * `/countries` and `/countries/[slug]` to produce a hub navigation surface.
 *
 * The query pulls a generous slice of the most populous cities and groups
 * client-side. This avoids a custom RPC for an ops-light feature and keeps
 * the hub's data shape easy to evolve.
 */
export const getCountrySummaries = reactCache(async (): Promise<CountrySummary[]> => {
  const { data, error } = await supabase
    .from("cities")
    .select("country, iso2, iso3, population")
    .order("population", { ascending: false, nullsFirst: false })
    .limit(5000);

  if (error || !data) {
    console.warn("[countries] failed to read country summaries", error);
    return [];
  }

  type Row = { country: string; iso2: string | null; iso3: string | null; population: number };
  const groups = new Map<string, { rows: Row[] }>();
  for (const row of data as Row[]) {
    if (!row.country) continue;
    const key = row.country;
    const bucket = groups.get(key);
    if (bucket) {
      bucket.rows.push(row);
    } else {
      groups.set(key, { rows: [row] });
    }
  }

  const summaries: CountrySummary[] = [];
  for (const [country, { rows }] of groups) {
    const slug = slugifyCountry(country);
    if (!slug) continue;
    const topPopulation = rows.reduce(
      (max, r) => (typeof r.population === "number" && r.population > max ? r.population : max),
      0
    );
    summaries.push({
      country,
      iso2: rows[0]?.iso2 ?? null,
      iso3: rows[0]?.iso3 ?? null,
      cityCount: rows.length,
      topPopulation,
      slug,
    });
  }

  summaries.sort((a, b) => b.topPopulation - a.topPopulation);
  return summaries;
});

/** Resolve a country by its slug — used by `/countries/[slug]`. */
export async function getCountryBySlug(slug: string): Promise<CountrySummary | null> {
  const all = await getCountrySummaries();
  return all.find((c) => c.slug === slug) ?? null;
}

/**
 * Cities in a given country, ordered by population. Capped to keep the hub
 * page render bounded — `/countries/[slug]` lists the top
 * COUNTRY_PAGE_LIMIT cities and links out to the city pages for the rest.
 */
export async function getCitiesByCountry(country: string): Promise<City[]> {
  const { data, error } = await supabase
    .from("cities")
    .select(
      "id, city, city_ascii, slug, country, iso2, iso3, admin_name, capital, population, lat, lng"
    )
    .eq("country", country)
    .order("population", { ascending: false, nullsFirst: false })
    .limit(COUNTRY_PAGE_LIMIT);

  if (error || !data) return [];
  return (data as City[]) ?? [];
}

/**
 * Cities in the same country, excluding `cityId`. Backs the related-cities
 * module (audit 5.4) so every city page emits a meaningful internal-link
 * surface instead of being a crawl dead end.
 */
export async function getRelatedCities(cityId: number, country: string, limit = 6): Promise<City[]> {
  const safeLimit = Math.max(1, Math.min(20, limit));
  const { data, error } = await supabase
    .from("cities")
    .select(
      "id, city, city_ascii, slug, country, iso2, iso3, admin_name, capital, population, lat, lng"
    )
    .eq("country", country)
    .neq("id", cityId)
    .order("population", { ascending: false, nullsFirst: false })
    .limit(safeLimit);

  if (error || !data) return [];
  return (data as City[]) ?? [];
}

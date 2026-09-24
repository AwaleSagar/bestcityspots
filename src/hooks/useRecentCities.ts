"use client";

import { useCallback } from "react";
import type { City } from "@/lib/cities";
import { useStoredValue } from "./useStoredValue";

/** Storage key kept from the previous frontend so history carries over. */
export const RECENT_CITIES_STORAGE_KEY = "atlas_recent_searches";
const MAX_RECENT = 8;
const EMPTY: City[] = [];

function isCity(value: unknown): value is City {
  if (!value || typeof value !== "object") return false;
  const city = value as Record<string, unknown>;
  return typeof city.id === "number" && typeof city.city === "string";
}

function parseRecent(raw: string | null): City[] {
  if (!raw) return EMPTY;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isCity).slice(0, MAX_RECENT) : EMPTY;
  } catch {
    return EMPTY;
  }
}

/** Only the fields the UI needs — never search ranking metadata. */
function toStoredCity(city: City): City {
  return {
    id: city.id,
    city: city.city,
    city_ascii: city.city_ascii,
    slug: city.slug,
    lat: city.lat,
    lng: city.lng,
    country: city.country,
    iso2: city.iso2,
    iso3: city.iso3,
    admin_name: city.admin_name,
    capital: city.capital,
    population: city.population,
  };
}

/** Cities the visitor searched for or opened, most recent first. */
export function useRecentCities() {
  const [recent, setRecent] = useStoredValue(RECENT_CITIES_STORAGE_KEY, parseRecent, EMPTY);

  const addRecent = useCallback(
    (city: City) =>
      setRecent((previous) =>
        [toStoredCity(city), ...previous.filter((c) => c.id !== city.id)].slice(0, MAX_RECENT)
      ),
    [setRecent]
  );

  const removeRecent = useCallback(
    (id: number) => setRecent((previous) => previous.filter((c) => c.id !== id)),
    [setRecent]
  );

  const clearRecent = useCallback(() => setRecent(EMPTY), [setRecent]);

  return { recent, addRecent, removeRecent, clearRecent };
}

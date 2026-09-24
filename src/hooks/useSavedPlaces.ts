"use client";

import { useCallback } from "react";
import { SAVED_PLACES_STORAGE_KEY, type SavedPlace } from "@/lib/saved-places";
import { useStoredValue } from "./useStoredValue";

const PLACE_TYPES = new Set(["landmarks", "restaurants", "hotels"]);
const EMPTY: SavedPlace[] = [];

function isSavedPlace(value: unknown): value is SavedPlace {
  if (!value || typeof value !== "object") return false;
  const place = value as Record<string, unknown>;
  return (
    typeof place.id === "string" &&
    typeof place.city === "string" &&
    typeof place.name === "string" &&
    typeof place.type === "string" &&
    PLACE_TYPES.has(place.type)
  );
}

function parseSavedPlaces(raw: string | null): SavedPlace[] {
  if (!raw) return EMPTY;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isSavedPlace) : EMPTY;
  } catch {
    return EMPTY;
  }
}

/**
 * Every saved place across all cities (localStorage `atlas_saved_places`).
 * Places are keyed by (id, city name) — the format predates the rebuild and
 * existing saves must keep working.
 */
export function useSavedPlaces() {
  const [places, setPlaces] = useStoredValue(SAVED_PLACES_STORAGE_KEY, parseSavedPlaces, EMPTY);

  const isSaved = useCallback(
    (id: string, city: string) => places.some((place) => place.id === id && place.city === city),
    [places]
  );

  const add = useCallback(
    (place: SavedPlace) =>
      setPlaces((previous) =>
        previous.some((p) => p.id === place.id && p.city === place.city)
          ? previous
          : [...previous, place]
      ),
    [setPlaces]
  );

  const remove = useCallback(
    (id: string, city: string) =>
      setPlaces((previous) => previous.filter((p) => !(p.id === id && p.city === city))),
    [setPlaces]
  );

  const setDay = useCallback(
    (id: string, city: string, day: number) =>
      setPlaces((previous) =>
        previous.map((p) =>
          p.id === id && p.city === city ? { ...p, day: day > 0 ? day : undefined } : p
        )
      ),
    [setPlaces]
  );

  const addMany = useCallback(
    (additions: SavedPlace[]) =>
      setPlaces((previous) => {
        const existing = new Set(previous.map((p) => `${p.city}::${p.id}`));
        const fresh = additions.filter((p) => !existing.has(`${p.city}::${p.id}`));
        return fresh.length > 0 ? [...previous, ...fresh] : previous;
      }),
    [setPlaces]
  );

  const clearCity = useCallback(
    (city: string) => setPlaces((previous) => previous.filter((p) => p.city !== city)),
    [setPlaces]
  );

  return { places, isSaved, add, remove, setDay, addMany, clearCity };
}

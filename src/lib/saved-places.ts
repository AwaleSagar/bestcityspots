import type { PlaceType } from "@/lib/places";

export const SAVED_PLACES_STORAGE_KEY = "atlas_saved_places";
export const PLACE_NOTES_STORAGE_KEY = "atlas_place_notes";

export type SavedPlace = {
  id: string;
  city: string;
  name: string;
  type: PlaceType;
  address?: string;
  googleMapsUri?: string;
  priceLevel?: string;
  rating?: number;
  /**
   * US-10: itinerary day bucket (1-based). Absent/0 = unassigned. Optional
   * by design — pre-itinerary localStorage payloads parse unchanged, which
   * is the versioned migration from the flat list.
   */
  day?: number;
};

/** US-10: highest assignable day (UI offers existing days + one new). */
export const MAX_ITINERARY_DAYS = 14;

/**
 * US-10: multi-stop Google Maps directions URL for one itinerary day.
 * Built per the Maps URLs spec (api=1; origin/destination + pipe-separated
 * waypoints). Mobile Maps honors at most ~9 waypoints, so stops are capped
 * at 11 total (origin + 9 + destination).
 */
export function buildDayDirectionsUrl(places: readonly SavedPlace[]): string | null {
  const stops = places
    .map((place) => `${place.name}, ${place.address || place.city}`)
    .slice(0, 11)
    .map(encodeURIComponent);

  if (stops.length === 0) return null;
  if (stops.length === 1) {
    return `https://www.google.com/maps/search/?api=1&query=${stops[0]}`;
  }

  const origin = stops[0];
  const destination = stops[stops.length - 1];
  const waypoints = stops.slice(1, -1).join("%7C");
  return (
    `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}` +
    (waypoints ? `&waypoints=${waypoints}` : "") +
    "&travelmode=walking"
  );
}

export type CityNotes = Record<string, string>;

const NOTE_KEY_PREFIX = "k_";

export const sanitizeKey = (key: string) =>
  key.startsWith(NOTE_KEY_PREFIX) ? key : `${NOTE_KEY_PREFIX}${encodeURIComponent(key)}`;

export const toNoteMap = (notes: CityNotes) => {
  const map = new Map<string, string>();
  Object.entries(notes).forEach(([key, value]) => {
    if (typeof value === "string") {
      // Keys in `CityNotes` are already sanitized on write and when read back
      // from storage. Re-sanitizing here causes destructive prefix stacking
      // (e.g. `k_...` -> `k_k_...`) and will make notes appear to “reset”.
      map.set(key, value);
    }
  });
  return map;
};

export const sanitizeNotes = (notes: CityNotes) =>
  Object.fromEntries(
    Object.entries(notes)
      .filter(([, value]) => typeof value === "string")
      .map(([key, value]) => [sanitizeKey(key), value as string])
  ) as CityNotes;

export const parseStoredNotes = (raw: string | null): Map<string, CityNotes> => {
  if (!raw) return new Map<string, CityNotes>();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return new Map<string, CityNotes>();
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return new Map<string, CityNotes>();
  }
  return new Map(
    Object.entries(parsed)
      .filter(([, value]) => value && typeof value === "object" && !Array.isArray(value))
      .map(([key, value]) => [sanitizeKey(key), sanitizeNotes(value as CityNotes)])
  );
};

export const getNeighborhood = (address?: string) => address?.split(",")[0]?.trim();

export const getAddressContext = (address?: string) => {
  if (!address) return null;
  const segments = address
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length === 0) return null;
  if (segments.length === 1) {
    return { primary: segments[0], secondary: null };
  }

  return {
    primary: segments[0],
    secondary: segments.slice(1, 3).join(" • "),
  };
};

export function topK<T>(arr: T[], k: number, getValue: (item: T) => number): T[] {
  if (arr.length <= k) {
    return [...arr].sort((a, b) => getValue(b) - getValue(a));
  }

  const topItems: T[] = [];

  for (const item of arr) {
    const value = getValue(item);

    if (topItems.length < k) {
      topItems.push(item);
      for (let i = topItems.length - 1; i > 0; i--) {
        // eslint-disable-next-line security/detect-object-injection
        if (getValue(topItems[i]) > getValue(topItems[i - 1])) {
          // eslint-disable-next-line security/detect-object-injection
          [topItems[i], topItems[i - 1]] = [topItems[i - 1], topItems[i]];
        } else {
          break;
        }
      }
    } else if (value > getValue(topItems[k - 1])) {
      topItems[k - 1] = item;
      for (let i = k - 1; i > 0; i--) {
        // eslint-disable-next-line security/detect-object-injection
        if (getValue(topItems[i]) > getValue(topItems[i - 1])) {
          // eslint-disable-next-line security/detect-object-injection
          [topItems[i], topItems[i - 1]] = [topItems[i - 1], topItems[i]];
        } else {
          break;
        }
      }
    }
  }

  return topItems;
}

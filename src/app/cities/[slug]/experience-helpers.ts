import type { Landmark, PlaceType } from "@/lib/places";

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
};

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

const LOCAL_PULSE_TAGS: Record<string, string[]> = {
  TOURIST_ATTRACTION: ["Must See Icon", "Historic Photo Spot", "Worth The Wait"],
  MUSEUM: ["Quiet Culture Escape", "Story Rich Halls", "Afternoon Slow Walk"],
  PARK: ["Sunset Picnic Spot", "Shaded Chill Loop", "Golden Hour Lawn"],
  AQUARIUM: ["Family Wonder Zone", "Rainy Day Win", "Calm Blue Glow"],
  RESTAURANT: ["Local Favorite Bites", "Crowded But Worth", "Chef Driven Menu"],
  CAFE: ["Slow Morning Sips", "Laptop Friendly Nook", "Pastry First Stop"],
  HOTEL: ["Sleep Well Base", "Walkable City Hub", "Late Night Quiet"],
};

const localPulseMap = new Map<string, string[]>(Object.entries(LOCAL_PULSE_TAGS));

export function getLocalPulseTags(place: Landmark) {
  const tags = new Set<string>();
  const primary = place.types?.at(0);
  if (primary) {
    const normalizedKey = primary.toUpperCase();
    const fallbacks = localPulseMap.get(normalizedKey) || localPulseMap.get(primary);
    fallbacks?.forEach((tag) => tags.add(tag));
  }

  const rating = place.rating ?? 0;
  const reviews = place.userRatingCount ?? 0;
  if (rating >= 4.6 && reviews >= 1000) tags.add("Crowded But Worth");
  if (rating >= 4.7 && reviews > 0 && reviews <= 200) tags.add("Hidden Gem Spot");
  if (reviews >= 500) tags.add("Always Lively Here");
  if (place.priceLevel === "PRICE_LEVEL_VERY_EXPENSIVE") tags.add("High End Treat");

  return Array.from(tags).slice(0, 3);
}

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

export const getInsiderTips = (place: Landmark) => {
  const tips: string[] = [];
  const name = place.displayName.text;
  const neighborhood = getNeighborhood(place.formattedAddress);
  const reviews = place.userRatingCount ?? 0;

  if (reviews >= 1000) {
    tips.push(`Arrive early at ${name} to beat the rush.`);
  } else {
    tips.push(`Quietest moments at ${name} are just after opening.`);
  }

  if (neighborhood) {
    tips.push(`Best entry is from the ${neighborhood} side.`);
  } else {
    tips.push(`Look for the calmer side entrance at ${name}.`);
  }

  if (
    place.types?.some((type) => {
      const normalized = type.toLowerCase();
      return normalized.includes("restaurant") || normalized.includes("food");
    })
  ) {
    tips.push(`Ask about the daily special at ${name}.`);
  }

  return tips.slice(0, 2);
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

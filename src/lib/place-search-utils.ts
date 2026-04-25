import { haversineKm } from "./geo";
import { rankingEngine } from "./ranking";
import type { Landmark, PlacePriceTier, PlaceSort } from "./places";

const PRICE_TIER_ORDER: PlacePriceTier[] = [
  "free",
  "inexpensive",
  "moderate",
  "expensive",
  "very_expensive",
];

function mapPriceLevel(priceLevel?: string): PlacePriceTier | null {
  switch (priceLevel) {
    case "PRICE_LEVEL_FREE":
      return "free";
    case "PRICE_LEVEL_INEXPENSIVE":
      return "inexpensive";
    case "PRICE_LEVEL_MODERATE":
      return "moderate";
    case "PRICE_LEVEL_EXPENSIVE":
      return "expensive";
    case "PRICE_LEVEL_VERY_EXPENSIVE":
      return "very_expensive";
    default:
      return null;
  }
}

export function isWithinMaxPriceTier(
  priceLevel: string | undefined,
  maxTier?: PlacePriceTier
): boolean {
  if (!maxTier) return true;

  const normalized = mapPriceLevel(priceLevel);
  if (!normalized) return true;

  return PRICE_TIER_ORDER.indexOf(normalized) <= PRICE_TIER_ORDER.indexOf(maxTier);
}

export function matchesQuery(place: Landmark, normalizedQuery: string): boolean {
  const haystack = [place.displayName?.text, place.formattedAddress, ...(place.types ?? [])]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

export function getDistanceKm(place: Landmark, lat?: number, lng?: number): number {
  const placeLat = place.location?.latitude;
  const placeLng = place.location?.longitude;

  if (typeof lat !== "number" || typeof lng !== "number") return Number.POSITIVE_INFINITY;
  if (typeof placeLat !== "number" || typeof placeLng !== "number") {
    return Number.POSITIVE_INFINITY;
  }

  return haversineKm(lat, lng, placeLat, placeLng);
}

export function sortPlaces(
  places: Landmark[],
  sortBy: PlaceSort,
  lat?: number,
  lng?: number
): Landmark[] {
  const sorted = [...places];

  if (sortBy === "distance" && typeof lat === "number" && typeof lng === "number") {
    return sorted.sort((a, b) => getDistanceKm(a, lat, lng) - getDistanceKm(b, lat, lng));
  }

  if (sortBy === "rating") {
    return sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  }

  if (sortBy === "reviews") {
    return sorted.sort((a, b) => (b.userRatingCount ?? 0) - (a.userRatingCount ?? 0));
  }

  return sorted.sort((a, b) => rankingEngine.getScore(b) - rankingEngine.getScore(a));
}

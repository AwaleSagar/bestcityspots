import type { Landmark, PlaceType } from "@/lib/places";
import type { SavedPlace } from "@/lib/saved-places";

export type PlaceTab = PlaceType;

export const PLACE_TABS: ReadonlyArray<{ id: PlaceTab; label: string; noun: string }> = [
  { id: "landmarks", label: "Sights", noun: "sights" },
  { id: "restaurants", label: "Food", noun: "places to eat" },
  { id: "hotels", label: "Stays", noun: "places to stay" },
];

export type PriceFilter =
  | "all"
  | "PRICE_LEVEL_INEXPENSIVE"
  | "PRICE_LEVEL_MODERATE"
  | "PRICE_LEVEL_EXPENSIVE"
  | "PRICE_LEVEL_VERY_EXPENSIVE";

export const PRICE_FILTERS: ReadonlyArray<{
  value: PriceFilter;
  label: string;
  ariaLabel: string;
}> = [
  { value: "all", label: "Any price", ariaLabel: "Any price" },
  { value: "PRICE_LEVEL_INEXPENSIVE", label: "$", ariaLabel: "Inexpensive" },
  { value: "PRICE_LEVEL_MODERATE", label: "$$", ariaLabel: "Moderate" },
  { value: "PRICE_LEVEL_EXPENSIVE", label: "$$$", ariaLabel: "Expensive" },
  { value: "PRICE_LEVEL_VERY_EXPENSIVE", label: "$$$$", ariaLabel: "Very expensive" },
];

/** How many places each tab shows (top by review count). */
export const PLACES_PER_TAB = 5;

/** Saved-place counter shown only once it is meaningful (US-12). */
export const MIN_VISIBLE_SAVES = 5;

export function toSavedPlace(place: Landmark, type: PlaceType, city: string): SavedPlace {
  return {
    id: place.id,
    city,
    name: place.displayName.text,
    type,
    address: place.formattedAddress,
    googleMapsUri: place.googleMapsUri,
    priceLevel: place.priceLevel,
    rating: place.rating,
  };
}

export function placeDomId(id: string) {
  return `place-${id.replace(/[^A-Za-z0-9_-]/g, "")}`;
}

export function tabNoun(type: PlaceType): string {
  return PLACE_TABS.find((tab) => tab.id === type)?.noun ?? "places";
}

export function tabLabel(type: PlaceType): string {
  return PLACE_TABS.find((tab) => tab.id === type)?.label ?? "Places";
}

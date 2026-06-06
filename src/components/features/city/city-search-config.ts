export const KEYBOARD_ANIMATION_DELAY = 300;
export const DROPDOWN_MAX_HEIGHT = "40vh";
export const transitionEase = [0.22, 1, 0.36, 1] as const;

export const PLACEHOLDER_HINTS = [
  "Where do you want to explore?",
  "Try 'NYC' or 'Bangkok'...",
  "Search 'beaches' or 'gastronomy'...",
  "Try 'Eiffel Tower' or 'Colosseum'...",
  "Search by city, country, or attraction...",
];

export const CITY_SEARCH_FILTERS = [
  { id: "megacity", label: "Megacities" },
  { id: "capital", label: "Capitals" },
] as const;

export type CitySearchFilter = (typeof CITY_SEARCH_FILTERS)[number]["id"];

export function sanitizeSearchInput(value: string): string {
  return value.replace(/[<>{}|\\^`[\]]/g, "");
}

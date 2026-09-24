/**
 * Pure helpers for the city search UI (inline field, ⌘K dialog, /search).
 * No browser APIs — unit-tested by scripts/test-search-utils.ts.
 */

export const MIN_QUERY_LENGTH = 2;
export const MAX_QUERY_LENGTH = 100;

/** Strip characters that have no place in a city name and cap the length. */
export function sanitizeSearchInput(value: string): string {
  return value.replace(/[<>{}|\\^`[\]]/g, "").slice(0, MAX_QUERY_LENGTH);
}

/** Normalized query or null when too short to search. */
export function searchableQuery(value: string): string | null {
  const trimmed = sanitizeSearchInput(value).trim();
  return trimmed.length >= MIN_QUERY_LENGTH ? trimmed : null;
}

export interface HighlightSegment {
  text: string;
  match: boolean;
}

/**
 * Split `text` into matched / unmatched segments for every case-insensitive
 * occurrence of `query`. Rendering (<mark>) is left to the caller.
 */
export function highlightSegments(text: string, query: string): HighlightSegment[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [{ text, match: false }];

  const haystack = text.toLowerCase();
  const segments: HighlightSegment[] = [];
  let cursor = 0;
  let index = haystack.indexOf(needle, cursor);
  while (index !== -1) {
    if (index > cursor) segments.push({ text: text.slice(cursor, index), match: false });
    segments.push({ text: text.slice(index, index + needle.length), match: true });
    cursor = index + needle.length;
    index = haystack.indexOf(needle, cursor);
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), match: false });
  return segments.length > 0 ? segments : [{ text, match: false }];
}

export interface SiteDestination {
  href: string;
  label: string;
  keywords: string;
}

/** Non-city jump targets offered by the search dialog. */
export const SITE_DESTINATIONS: readonly SiteDestination[] = [
  { href: "/cities", label: "All cities", keywords: "index list cities browse" },
  { href: "/countries", label: "Browse by country", keywords: "countries nations a-z" },
  { href: "/guides", label: "All guides", keywords: "guides hubs rankings themes" },
  {
    href: "/resources/top-cities",
    label: "The Top 250",
    keywords: "top cities ranking population priorities mixer",
  },
  {
    href: "/best-cities-by-air-quality",
    label: "Cleanest air",
    keywords: "air quality aqi pollution pm2.5",
  },
  {
    href: "/best-cities-for-digital-nomads",
    label: "For digital nomads",
    keywords: "remote work nomad wifi internet",
  },
  { href: "/compare", label: "Compare cities", keywords: "compare side by side versus vs" },
  { href: "/saved", label: "Saved places", keywords: "saved bookmarks plan itinerary passport" },
  { href: "/methodology", label: "Methodology", keywords: "sources data how ranking works" },
  { href: "/about", label: "About", keywords: "about project team story" },
  { href: "/accessibility", label: "Accessibility", keywords: "a11y wcag accessibility" },
];

/** Destinations whose label or keywords contain every word of the query. */
export function matchDestinations(query: string, limit = 4): SiteDestination[] {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  return SITE_DESTINATIONS.filter((destination) => {
    const haystack = `${destination.label} ${destination.keywords}`.toLowerCase();
    return words.every((word) => haystack.includes(word));
  }).slice(0, limit);
}

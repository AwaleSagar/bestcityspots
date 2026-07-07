/**
 * Cache pre-warming priority (Supabase insights + external research).
 *
 * Decides WHICH cities the nightly warmer spends its budget on, and makes the
 * landmark query for globally popular cities name their iconic POIs so the
 * Places response (and therefore the photo cache) is anchored on what
 * visitors actually look for.
 *
 * Priority order (deduped, all pure — tested in scripts/test-warm-priority.ts):
 *   1. Demand   — cities YOUR visitors viewed most (city_views_daily, 30d),
 *                 queried live at warm time so every run reflects real traffic.
 *   2. Predicted — curated globally-popular set below (Euromonitor Top City
 *                 Destinations 2025 via Wikipedia "List of cities by
 *                 international visitors"; attraction hints cross-checked
 *                 against TripAdvisor Travelers' Choice + U.S. News famous
 *                 landmarks, researched 2026-07-06).
 *   3. Reach    — population fallback (the previous behavior), so the list
 *                 always fills to the requested limit.
 *
 * The module is dependency-free; the warmer supplies the data.
 */

export interface PopularDestination {
  /** Matches `cities.city_ascii` (ILIKE) — keep ASCII. */
  city: string;
  /** Matches `cities.country` (ILIKE substring) to disambiguate. */
  country: string;
  /** Euromonitor 2025 international arrivals, millions (documentation). */
  arrivalsMillions?: number;
  /** Iconic POIs appended to the landmark warm query (relevance, not spend). */
  landmarkHints: string[];
}

export const POPULAR_DESTINATIONS: PopularDestination[] = [
  {
    city: "Bangkok",
    country: "Thailand",
    arrivalsMillions: 30.3,
    landmarkHints: ["Grand Palace", "Wat Arun", "Wat Pho"],
  },
  {
    city: "Hong Kong",
    country: "Hong Kong",
    arrivalsMillions: 23.2,
    landmarkHints: ["Victoria Peak", "Star Ferry", "Tian Tan Buddha"],
  },
  {
    city: "London",
    country: "United Kingdom",
    arrivalsMillions: 22.7,
    landmarkHints: ["Tower of London", "British Museum", "Buckingham Palace"],
  },
  {
    city: "Macau",
    country: "Macao",
    arrivalsMillions: 20.4,
    landmarkHints: ["Ruins of St. Paul's", "Senado Square"],
  },
  {
    city: "Istanbul",
    country: "Turkey",
    arrivalsMillions: 19.7,
    landmarkHints: ["Hagia Sophia", "Blue Mosque", "Topkapi Palace"],
  },
  {
    city: "Dubai",
    country: "United Arab Emirates",
    arrivalsMillions: 19.5,
    landmarkHints: ["Burj Khalifa", "Dubai Mall", "Palm Jumeirah"],
  },
  {
    city: "Antalya",
    country: "Turkey",
    arrivalsMillions: 18.6,
    landmarkHints: ["Kaleici Old Town", "Duden Waterfalls"],
  },
  {
    city: "Paris",
    country: "France",
    arrivalsMillions: 18.3,
    landmarkHints: ["Eiffel Tower", "Louvre Museum", "Notre-Dame Cathedral"],
  },
  {
    city: "Kuala Lumpur",
    country: "Malaysia",
    arrivalsMillions: 17.3,
    landmarkHints: ["Petronas Twin Towers", "Batu Caves"],
  },
  {
    city: "Barcelona",
    country: "Spain",
    landmarkHints: ["Sagrada Familia", "Park Guell", "La Rambla"],
  },
  {
    city: "Singapore",
    country: "Singapore",
    landmarkHints: ["Gardens by the Bay", "Marina Bay Sands", "Sentosa"],
  },
  {
    city: "Rome",
    country: "Italy",
    landmarkHints: ["Colosseum", "Trevi Fountain", "Pantheon"],
  },
  {
    city: "New York",
    country: "United States",
    landmarkHints: ["Statue of Liberty", "Central Park", "Times Square"],
  },
  {
    city: "Tokyo",
    country: "Japan",
    landmarkHints: ["Senso-ji Temple", "Tokyo Skytree", "Meiji Shrine"],
  },
  {
    city: "Sydney",
    country: "Australia",
    landmarkHints: ["Sydney Opera House", "Sydney Harbour Bridge", "Bondi Beach"],
  },
  {
    city: "Amsterdam",
    country: "Netherlands",
    landmarkHints: ["Rijksmuseum", "Anne Frank House", "Van Gogh Museum"],
  },
  {
    city: "Cairo",
    country: "Egypt",
    landmarkHints: ["Pyramids of Giza", "Egyptian Museum", "Khan el-Khalili"],
  },
  {
    city: "Rio de Janeiro",
    country: "Brazil",
    landmarkHints: ["Christ the Redeemer", "Sugarloaf Mountain", "Copacabana Beach"],
  },
  {
    city: "Prague",
    country: "Czech",
    landmarkHints: ["Charles Bridge", "Prague Castle", "Old Town Square"],
  },
  {
    city: "Agra",
    country: "India",
    landmarkHints: ["Taj Mahal", "Agra Fort"],
  },
];

/** Minimal city shape the merge needs — matches the warmer's City rows. */
export interface PriorityCity {
  id: number;
}

/**
 * Merge the three ranked sources into one deduped warm list of `limit` ids
 * preserving priority order: demand → predicted → reach.
 */
export function mergePriorityLists<T extends PriorityCity>(
  mostViewed: T[],
  curated: T[],
  byPopulation: T[],
  limit: number
): T[] {
  const seen = new Set<number>();
  const merged: T[] = [];
  for (const source of [mostViewed, curated, byPopulation]) {
    for (const city of source) {
      if (merged.length >= limit) return merged;
      if (seen.has(city.id)) continue;
      seen.add(city.id);
      merged.push(city);
    }
  }
  return merged;
}

/**
 * Landmark warm query: for curated cities, name their icons so Places (and
 * the photo cache) anchor on the POIs users actually search. Same request
 * count — pure relevance, zero extra spend.
 */
export function buildLandmarkQuery(cityName: string, hints: string[]): string {
  const base = `Top landmarks and attractions in ${cityName}`;
  if (hints.length === 0) return base;
  return `${base} including ${hints.slice(0, 4).join(", ")}`;
}

/** Case-insensitive hint lookup for a city name (+ optional country check). */
export function landmarkHintsFor(cityName: string, country?: string): string[] {
  const name = cityName.trim().toLowerCase();
  for (const destination of POPULAR_DESTINATIONS) {
    if (destination.city.toLowerCase() !== name) continue;
    if (country && !country.toLowerCase().includes(destination.country.toLowerCase())) continue;
    return destination.landmarkHints;
  }
  return [];
}

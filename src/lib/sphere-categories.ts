/**
 * Curated city categories for the landing page sphere
 *
 * These are iconic cities grouped by travel theme to create
 * visual diversity on the sphere instead of just population-based listing.
 */

export interface SphereCategory {
  id: string;
  label: string;
  emoji: string;
  cities: string[];
}

/**
 * Fisher-Yates shuffle algorithm - O(n) time, O(1) extra space (in-place)
 * Provides unbiased random permutation unlike sort(() => Math.random() - 0.5)
 */
function fisherYatesShuffle<T>(arr: T[]): T[] {
  const result = [...arr]; // Don't mutate original
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    // Indices i and j are bounded numeric loop variables - access is safe
    // eslint-disable-next-line security/detect-object-injection
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export const SPHERE_CATEGORIES: SphereCategory[] = [
  {
    id: "beaches",
    label: "Beach Destinations",
    emoji: "🏖️",
    cities: [
      "Bali",
      "Cancun",
      "Maldives",
      "Phuket",
      "Miami",
      "Santorini",
      "Maui",
      "Ibiza",
      "Rio de Janeiro",
      "Gold Coast",
      "Goa",
      "Zanzibar",
      "Seychelles",
      "Cabo San Lucas",
      "Crete",
    ],
  },
  {
    id: "mountains",
    label: "Mountain Escapes",
    emoji: "🏔️",
    cities: [
      "Zermatt",
      "Chamonix",
      "Banff",
      "Queenstown",
      "Aspen",
      "Innsbruck",
      "Interlaken",
      "Shimla",
      "Cusco",
      "Kathmandu",
      "Whistler",
      "St. Moritz",
      "Leh",
      "Darjeeling",
      "Manali",
    ],
  },
  {
    id: "nightlife",
    label: "Nightlife & Party",
    emoji: "🎉",
    cities: [
      "Las Vegas",
      "Bangkok",
      "Berlin",
      "Amsterdam",
      "Miami",
      "Barcelona",
      "New York",
      "Tokyo",
      "London",
      "Tel Aviv",
      "Buenos Aires",
      "Seoul",
      "Dubai",
      "Singapore",
      "Mykonos",
    ],
  },
  {
    id: "culture",
    label: "Cultural & Historic",
    emoji: "🏛️",
    cities: [
      "Rome",
      "Paris",
      "Kyoto",
      "Athens",
      "Cairo",
      "Istanbul",
      "Jerusalem",
      "Petra",
      "Varanasi",
      "Fez",
      "Prague",
      "Vienna",
      "Florence",
      "Agra",
      "Luxor",
    ],
  },
  {
    id: "adventure",
    label: "Adventure & Nature",
    emoji: "🌿",
    cities: [
      "Cape Town",
      "Reykjavik",
      "Queenstown",
      "Costa Rica",
      "Patagonia",
      "Machu Picchu",
      "Galápagos",
      "Safari",
      "Alaska",
      "Borneo",
      "New Zealand",
      "Norway",
      "Yellowstone",
      "Torres del Paine",
      "Kilimanjaro",
    ],
  },
  {
    id: "foodie",
    label: "Foodie Destinations",
    emoji: "🍜",
    cities: [
      "Tokyo",
      "Paris",
      "Bologna",
      "Bangkok",
      "Lima",
      "San Sebastián",
      "Singapore",
      "Lyon",
      "Osaka",
      "Mexico City",
      "Hong Kong",
      "Istanbul",
      "New Orleans",
      "Hanoi",
      "Copenhagen",
    ],
  },
  {
    id: "romantic",
    label: "Romantic Getaways",
    emoji: "💕",
    cities: [
      "Paris",
      "Venice",
      "Santorini",
      "Bora Bora",
      "Maldives",
      "Amalfi Coast",
      "Prague",
      "Bruges",
      "Kyoto",
      "Udaipur",
      "Florence",
      "Cinque Terre",
      "Positano",
      "Dubrovnik",
      "Hallstatt",
    ],
  },
  {
    id: "megacities",
    label: "World Megacities",
    emoji: "🌆",
    cities: [
      "Tokyo",
      "New York",
      "London",
      "Paris",
      "Shanghai",
      "Dubai",
      "Singapore",
      "Hong Kong",
      "Sydney",
      "Los Angeles",
      "Mumbai",
      "São Paulo",
      "Toronto",
      "Seoul",
      "Moscow",
    ],
  },
  {
    id: "emerging",
    label: "Emerging Hotspots",
    emoji: "🚀",
    cities: [
      "Lisbon",
      "Medellín",
      "Tbilisi",
      "Tulum",
      "Porto",
      "Marrakech",
      "Cape Town",
      "Cartagena",
      "Chiang Mai",
      "Split",
      "Ljubljana",
      "Oaxaca",
      "Da Nang",
      "Tirana",
      "Taipei",
    ],
  },
  {
    id: "trending_2026",
    label: "2026 Trending",
    emoji: "🔥",
    cities: [
      "Shimla",
      "Killarney",
      "Las Vegas",
      "Marbella",
      "Marrakech",
      "Naha",
      "Panama City",
      "Liberia",
      "Durango",
      "Malta",
    ],
  },
];

/**
 * Get a balanced mix of cities from all categories
 * Ensures diversity by taking cities from each category in rotation
 * Optimized: Uses Fisher-Yates O(n) shuffle instead of O(n log n) random sort
 */
export function getMixedCitiesFromCategories(limit: number = 120): string[] {
  const result: string[] = [];
  const usedCities = new Set<string>();

  // O(n) Fisher-Yates shuffle instead of O(n log n) random sort
  const shuffledCategories = fisherYatesShuffle(SPHERE_CATEGORIES);

  let categoryIndex = 0;
  const cityIndexPerCategory = new Map<string, number>();

  // Initialize city indices
  shuffledCategories.forEach((cat) => cityIndexPerCategory.set(cat.id, 0));

  // Maximum full rotations through all categories before stopping.
  // Each category has ~15 cities, so this ensures we exhaust all cities
  // before giving up, even if many are duplicates across categories.
  const ROTATIONS_PER_CATEGORY = 15;
  const maxCategoryRotations = shuffledCategories.length * ROTATIONS_PER_CATEGORY;

  while (result.length < limit) {
    const category = shuffledCategories[categoryIndex % shuffledCategories.length];
    const cityIdx = cityIndexPerCategory.get(category.id) || 0;

    if (cityIdx < category.cities.length) {
      // cityIdx is a bounded counter - array access is safe
      // eslint-disable-next-line security/detect-object-injection
      const city = category.cities[cityIdx];

      // Avoid duplicates (some cities appear in multiple categories)
      if (!usedCities.has(city.toLowerCase())) {
        result.push(city);
        usedCities.add(city.toLowerCase());
      }

      cityIndexPerCategory.set(category.id, cityIdx + 1);
    }

    categoryIndex++;

    // Break if we've exhausted all categories
    if (categoryIndex >= maxCategoryRotations) break;
  }

  // O(n) Fisher-Yates shuffle for visual randomness
  return fisherYatesShuffle(result);
}

// Pre-built Map for O(1) category lookup instead of O(c) Array.find()
const categoryMap = new Map<string, SphereCategory>(
  SPHERE_CATEGORIES.map(cat => [cat.id, cat])
);

/**
 * Get cities from a specific category
 * Optimized: O(1) Map lookup instead of O(c) Array.find()
 */
export function getCitiesFromCategory(categoryId: string): string[] {
  const category = categoryMap.get(categoryId);
  return category?.cities || [];
}

/**
 * Get all category IDs
 * Note: This is called infrequently, so O(c) is acceptable
 * Could cache if called frequently
 */
export function getCategoryIds(): string[] {
  return SPHERE_CATEGORIES.map((c) => c.id);
}

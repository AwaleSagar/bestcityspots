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
 */
export function getMixedCitiesFromCategories(limit: number = 120): string[] {
  const result: string[] = [];
  const usedCities = new Set<string>();

  // Shuffle categories for variety
  const shuffledCategories = [...SPHERE_CATEGORIES].sort(() => Math.random() - 0.5);

  let categoryIndex = 0;
  let cityIndexPerCategory = new Map<string, number>();

  // Initialize city indices
  shuffledCategories.forEach((cat) => cityIndexPerCategory.set(cat.id, 0));

  while (result.length < limit) {
    const category = shuffledCategories[categoryIndex % shuffledCategories.length];
    const cityIdx = cityIndexPerCategory.get(category.id) || 0;

    if (cityIdx < category.cities.length) {
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
    if (categoryIndex >= shuffledCategories.length * 15) break;
  }

  // Shuffle the final result for visual randomness
  return result.sort(() => Math.random() - 0.5);
}

/**
 * Get cities from a specific category
 */
export function getCitiesFromCategory(categoryId: string): string[] {
  const category = SPHERE_CATEGORIES.find((c) => c.id === categoryId);
  return category?.cities || [];
}

/**
 * Get all category IDs
 */
export function getCategoryIds(): string[] {
  return SPHERE_CATEGORIES.map((c) => c.id);
}

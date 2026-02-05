/**
 * 2026 Trending Destinations from American Express Travel
 *
 * These destinations are based on global Card Member bookings
 * and travel consultant insights for 2026.
 *
 * Each entry maps to a city name that can be found in the cities database.
 */
export interface TrendingDestination {
  name: string;
  country: string;
  region?: string;
  description: string;
}

export const TRENDING_2026: TrendingDestination[] = [
  {
    name: "Shimla",
    country: "India",
    region: "Indian Himalayas",
    description: "Scenic mountains and cultural richness",
  },
  {
    name: "Killarney",
    country: "Ireland",
    description: "Lakes, rugged landscapes, and the Ring of Kerry",
  },
  {
    name: "Las Vegas",
    country: "United States",
    description: "Iconic entertainment and vibrant city life",
  },
  {
    name: "Marbella",
    country: "Spain",
    description: "Coastal charm with stylish old towns and luxury vibes",
  },
  {
    name: "Marrakech",
    country: "Morocco",
    description: "Historic markets, palaces, and cultural experiences",
  },
  {
    name: "Naha",
    country: "Japan",
    region: "Okinawa Islands",
    description: "Tropical beaches, reefs, and island culture",
  },
  {
    name: "Panama City",
    country: "Panama",
    description: "Urban energy meets tropical surroundings",
  },
  {
    name: "Liberia",
    country: "Costa Rica",
    region: "Papagayo Peninsula",
    description: "Pristine beaches and nature adventures",
  },
  {
    name: "Durango",
    country: "United States",
    region: "San Juan Mountains",
    description: "Dramatic Rockies scenery, hiking, and skiing",
  },
  {
    name: "Saint Julian's",
    country: "Malta",
    description: "Mediterranean coastal town with lively nightlife and history",
  },
];

// Alternative city name mappings for database matching
export const CITY_ALIASES: Record<string, string[]> = {
  "Saint Julian's": ["St. Julian's", "San Giljan", "St Julian's"],
  Naha: ["Okinawa"],
  Liberia: ["Guanacaste"],
};

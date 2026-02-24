/**
 * 2026 Trending Destinations
 *
 * Curated from multiple authoritative sources:
 *  - Lonely Planet "Best in Travel 2026"
 *  - National Geographic "Best of the World 2026"
 *  - World Travel Market (WTM) 2026 Top Destinations
 *  - American Express Travel 2026 Trending Report
 *  - Actual site traffic from city_views_daily
 *
 * Each entry maps to a city name in the cities database.
 */
export interface TrendingDestination {
  name: string;
  country: string;
  region?: string;
  description: string;
  source: string;
}

export const TRENDING_2026: TrendingDestination[] = [
  // --- Lonely Planet Best in Travel 2026 ---
  { name: "Mexico City", country: "Mexico", description: "History, food, culture, art -- walkable and endlessly surprising", source: "Lonely Planet" },
  { name: "Marrakech", country: "Morocco", description: "Historic markets, Atlas Mountains, Agafay Desert", source: "Lonely Planet" },
  { name: "Cartagena", country: "Colombia", description: "Colonial walled city with Caribbean warmth", source: "Lonely Planet" },
  { name: "Istanbul", country: "Turkey", description: "Ancient ruins and Anatolian adventures from Istanbul to Cappadocia", source: "Lonely Planet" },
  { name: "Siem Reap", country: "Cambodia", description: "Gateway to Angkor Wat, rising cultural hub", source: "Lonely Planet" },
  { name: "Utrecht", country: "Netherlands", description: "Canal-lined city with vibrant culture scene", source: "Lonely Planet" },
  { name: "Jaffna", country: "Sri Lanka", description: "Low-key Buddhist city on the northern coast", source: "Lonely Planet" },
  { name: "Helsinki", country: "Finland", description: "Design capital, sauna culture, and northern lights", source: "Lonely Planet" },
  { name: "Jeju", country: "South Korea", region: "Jeju Island", description: "Volcanic island with unique culture and scenery", source: "Lonely Planet" },
  { name: "Cádiz", country: "Spain", description: "Ancient port city with Andalusian charm", source: "Lonely Planet" },

  // --- National Geographic Best of the World 2026 ---
  { name: "Suva", country: "Fiji", description: "South Pacific eco-travel gem: coral planting and forest conservation", source: "National Geographic" },
  { name: "Cape Town", country: "South Africa", description: "Wine country, Garden Route, and stunning coastline", source: "National Geographic" },
  { name: "Philadelphia", country: "United States", description: "2026 FIFA World Cup host city with four major events", source: "National Geographic" },

  // --- World Travel Market (WTM) 2026 ---
  { name: "Naxos", country: "Greece", description: "#1 WTM destination -- golden beaches, traditional villages", source: "WTM" },

  // --- 2026 Winter Olympics (Milan-Cortina) ---
  { name: "Milan", country: "Italy", description: "2026 Winter Olympics co-host, fashion and design capital", source: "Olympics 2026" },

  // --- American Express Travel 2026 ---
  { name: "Shimla", country: "India", region: "Indian Himalayas", description: "Scenic mountains and cultural richness", source: "AmEx Travel" },
  { name: "Killarney", country: "Ireland", description: "Lakes, rugged landscapes, and the Ring of Kerry", source: "AmEx Travel" },
  { name: "Las Vegas", country: "United States", description: "Iconic entertainment and vibrant city life", source: "AmEx Travel" },
  { name: "Marbella", country: "Spain", description: "Coastal charm with stylish old towns and luxury vibes", source: "AmEx Travel" },
  { name: "Naha", country: "Japan", region: "Okinawa Islands", description: "Tropical beaches, reefs, and island culture", source: "AmEx Travel" },
  { name: "Panama City", country: "Panama", description: "Urban energy meets tropical surroundings", source: "AmEx Travel" },

  // --- Perennial global megacities (high traffic on site) ---
  { name: "Tokyo", country: "Japan", description: "Golden Route: Tokyo, Kanazawa, Kyoto, and Fuji", source: "Traffic + LP" },
  { name: "Bangkok", country: "Thailand", description: "Healing Journey Thailand -- digital nomad and foodie hub", source: "Traffic + LP" },
  { name: "Barcelona", country: "Spain", description: "Architecture, beaches, and Mediterranean nightlife", source: "Traffic" },
  { name: "Lisbon", country: "Portugal", description: "Tiled streets, pastéis de nata, and Atlantic sunsets", source: "Traffic" },
  { name: "Singapore", country: "Singapore", description: "Garden city with world-class food and skyline", source: "Traffic" },
  { name: "Dubai", country: "United Arab Emirates", description: "Futuristic architecture and desert adventures", source: "Traffic" },
  { name: "Paris", country: "France", description: "Timeless art, cuisine, and romance", source: "Traffic" },
  { name: "London", country: "United Kingdom", description: "History, theatre, and cosmopolitan culture", source: "Traffic" },
  { name: "New York", country: "United States", description: "The city that never sleeps -- arts, food, everything", source: "Traffic" },
  { name: "Sydney", country: "Australia", description: "Harbour, beaches, and outdoor lifestyle", source: "Traffic" },
];

export const CITY_ALIASES: Record<string, string[]> = {
  "Saint Julian's": ["St. Julian's", "San Giljan", "St Julian's"],
  Naha: ["Okinawa"],
  Liberia: ["Guanacaste"],
  Jeju: ["Jeju City", "Cheju"],
  Naxos: ["Naxos Island"],
  Jaffna: ["Yāḻppāṇam"],
  "New York": ["New York City"],
};

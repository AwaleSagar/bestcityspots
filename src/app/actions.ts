"use server";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { getIntelligentTrendingCities } from "@/lib/intelligence";
import { getTopCities, City } from "@/lib/cities";

const fetchCachedTrendingDestinations = unstable_cache(
  async (): Promise<City[]> => {
    try {
      const aiCities = await getIntelligentTrendingCities();

      if (aiCities.length > 0) {
        return aiCities;
      }
    } catch (error) {
      console.warn("Failed to fetch AI trending destinations", error);
    }

    try {
      return getTopCities(5);
    } catch (error) {
      console.warn("Failed to fetch fallback trending destinations", error);
      return [];
    }
  },
  ["trending-destinations"],
  { revalidate: 3600, tags: ["trending"] }
);

// `cache()` still dedupes repeated calls within one render pass, while
// `unstable_cache()` persists the successful result across requests.
export const fetchTrendingDestinations = cache(async (): Promise<City[]> => {
  return fetchCachedTrendingDestinations();
});

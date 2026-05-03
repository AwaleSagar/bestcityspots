"use server";

import { cache } from "react";
import { getIntelligentTrendingCities } from "@/lib/intelligence";
import { getTopCities, City } from "@/lib/cities";

// `cache()` dedupes within a single request — multiple components calling
// fetchTrendingDestinations() now share one upstream resolution instead of
// firing parallel AI lookups.
export const fetchTrendingDestinations = cache(async (): Promise<City[]> => {
  // Try intelligent AI-based trending first
  const aiCities = await getIntelligentTrendingCities();

  if (aiCities.length > 0) {
    return aiCities;
  }

  // Fallback to population-based trending if AI fails or key is missing
  return await getTopCities(5);
});

"use server";

import { getIntelligentTrendingCities } from "@/lib/intelligence";
import { getTopCities, City } from "@/lib/cities";

export async function fetchTrendingDestinations(): Promise<City[]> {
  // Try intelligent AI-based trending first
  const aiCities = await getIntelligentTrendingCities();

  if (aiCities.length > 0) {
    return aiCities;
  }

  // Fallback to population-based trending if AI fails or key is missing
  return await getTopCities(5);
}

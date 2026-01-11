import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "./supabase";
import { City } from "./cities";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

/**
 * Uses Google Gemini AI to find currently trending global cities
 * and caches them in Supabase for 24 hours.
 */
export async function getIntelligentTrendingCities(): Promise<City[]> {
  if (!process.env.GOOGLE_GEMINI_API_KEY) {
    console.warn("GOOGLE_GEMINI_API_KEY not found, falling back to population-based trending.");
    return [];
  }

  try {
    // 1. Check Supabase Cache first
    const { data: cache } = await supabase
      .from("ai_trending_cache")
      .select("city_names, updated_at")
      .eq("id", 1)
      .maybeSingle();

    if (cache) {
      const updatedAt = new Date(cache.updated_at);
      const now = new Date();
      const hoursSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);

      // If cache is less than 24 hours old, use it!
      if (hoursSinceUpdate < 24) {
        return await matchCitiesInDb(cache.city_names);
      }
    }

    // 2. Cache expired or missing, call Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const prompt = `
      List 8 world cities that are currently trending for travelers in 2026. 
      Consider seasonal events, major sports, or emerging travel hotspots.
      Return ONLY a JSON array of strings containing just the city names.
      Example: ["Tokyo", "Paris", "Seoul"]
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse the AI response (clean up markdown if present)
    const cityNames: string[] = JSON.parse(text.replace(/```json|```/gi, "").trim());

    if (!Array.isArray(cityNames)) {
      return [];
    }

    // 3. Update Supabase Cache for the next 24 hours
    await supabase
      .from("ai_trending_cache")
      .upsert({ id: 1, city_names: cityNames, updated_at: new Date().toISOString() });

    return await matchCitiesInDb(cityNames);
  } catch (e) {
    console.error("Intelligent trending fetch failed:", e);
    return [];
  }
}

/**
 * Helper to match a list of names against our DB
 */
async function matchCitiesInDb(cityNames: string[]): Promise<City[]> {
  const { data: matchedCities, error } = await supabase
    .from("cities")
    .select("id, city, country, population, lat, lng")
    .in("city", cityNames)
    .order("population", { ascending: false })
    .limit(5);

  if (error) throw error;
  return (matchedCities as City[]) || [];
}

import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "./supabase";
import { City } from "./cities";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

/**
 * Uses Google Gemini AI to find currently trending global cities
 * and matches them against our database.
 */
export async function getIntelligentTrendingCities(): Promise<City[]> {
  if (!process.env.GOOGLE_GEMINI_API_KEY) {
    console.warn("GOOGLE_GEMINI_API_KEY not found, falling back to population-based trending.");
    return [];
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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

    if (!Array.isArray(cityNames)) return [];

    // Match AI names against our Supabase DB to get full data (ID, lat, lng, etc.)
    const { data: matchedCities, error } = await supabase
      .from("cities")
      .select("id, city, country, population, lat, lng")
      .in("city", cityNames)
      .order("population", { ascending: false })
      .limit(5);

    if (error) throw error;

    return (matchedCities as City[]) || [];
  } catch (e) {
    console.error("Intelligent trending fetch failed:", e);
    return [];
  }
}

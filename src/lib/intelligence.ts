import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase, supabaseServer } from "./supabase";
import { City } from "./cities";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

export interface CityInsight {
  intro: string;
  attractions: { name: string; why: string }[];
  seasons: { name: string; months: string; summary: string }[];
  weather: { season: string; tempC: string; notes: string }[];
}

function sanitizeJsonResponse(raw: string) {
  return raw.replace(/```json/gi, "").replace(/```/g, "").trim();
}

function isFresh(updated_at?: string, ttlDays = 365) {
  if (!updated_at) return false;
  const updated = new Date(updated_at);
  const now = new Date();
  const days = (now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24);
  return days < ttlDays;
}

export async function getCityInsight(city: City): Promise<CityInsight | null> {
  if (!process.env.GOOGLE_GEMINI_API_KEY) {
    console.warn("GOOGLE_GEMINI_API_KEY not found, skipping AI city insight.");
    return null;
  }

  try {
    const { data: cached } = await supabase
      .from("city_ai_insights")
      .select("intro, attractions, seasons, weather, updated_at")
      .eq("city_id", city.id)
      .maybeSingle();

    if (cached && isFresh(cached.updated_at, 365)) {
      return {
        intro: cached.intro || "",
        attractions: (cached.attractions || []) as CityInsight["attractions"],
        seasons: (cached.seasons || []) as CityInsight["seasons"],
        weather: (cached.weather || []) as CityInsight["weather"],
      };
    }

    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
    const prompt = `
      You are a concise travel curator. Summarize ${city.city}, ${city.country}.
      Return ONLY a JSON object with keys:
      {
        "intro": "≤500 characters, vivid but factual city intro",
        "attractions": [
          { "name": "spot name", "why": "1 short sentence" },
          { "name": "...", "why": "..." },
          { "name": "...", "why": "..." }
        ],
        "seasons": [
          { "name": "Spring", "months": "Mar-May", "summary": "concise guidance" },
          { "name": "Summer", "months": "Jun-Aug", "summary": "concise guidance" },
          { "name": "Autumn", "months": "Sep-Nov", "summary": "concise guidance" },
          { "name": "Winter", "months": "Dec-Feb", "summary": "concise guidance" }
        ],
        "weather": [
          { "season": "Spring", "tempC": "avg temp range in °C", "notes": "travel tip" },
          { "season": "Summer", "tempC": "avg temp range in °C", "notes": "travel tip" },
          { "season": "Autumn", "tempC": "avg temp range in °C", "notes": "travel tip" },
          { "season": "Winter", "tempC": "avg temp range in °C", "notes": "travel tip" }
        ]
      }
      Do not add prose, code fences, or Markdown—just JSON.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const parsed = JSON.parse(sanitizeJsonResponse(response.text()));

    const insight: CityInsight = {
      intro: parsed.intro || "",
      attractions: Array.isArray(parsed.attractions) ? parsed.attractions.slice(0, 4) : [],
      seasons: Array.isArray(parsed.seasons) ? parsed.seasons.slice(0, 4) : [],
      weather: Array.isArray(parsed.weather) ? parsed.weather.slice(0, 4) : [],
    };

    // Immediately update cache with 365-day expiry (updated_at timestamp)
    // Try service role key first, fallback to anon key (requires RLS policy to allow upserts)
    const updatedAt = new Date().toISOString();
    const clientToUse = supabaseServer || supabase;
    
    const { error: upsertError } = await clientToUse.from("city_ai_insights").upsert(
      {
        city_id: city.id,
        city_name: city.city,
        country: city.country,
        intro: insight.intro,
        attractions: insight.attractions,
        seasons: insight.seasons,
        weather: insight.weather,
        updated_at: updatedAt,
      },
      {
        onConflict: "city_id",
      }
    );

    if (upsertError) {
      if (upsertError.code === "42501") {
        console.error(
          `❌ RLS policy blocked cache update for ${city.city}. ` +
          `Run the SQL in supabase/fix_city_ai_insights_rls.sql or add SUPABASE_SERVICE_ROLE_KEY to .env.local`
        );
      } else {
        console.error(`Failed to cache AI insight for ${city.city}:`, upsertError);
      }
      // Still return the insight even if cache update fails
    } else {
      const keyType = supabaseServer ? "service role" : "anon";
      console.info(
        `✅ Successfully cached AI insight for ${city.city} (expires in 365 days) using ${keyType} key`
      );
    }

    return insight;
  } catch (e) {
    console.error("Failed to get city insight:", e);
    return null;
  }
}

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

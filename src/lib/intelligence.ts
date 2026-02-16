import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase, supabaseServer } from "./supabase";
import { City } from "./cities";
import { z } from "zod";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

// --- Zod Schemas for Runtime Safety ---
const AttractionSchema = z.object({
  name: z.string(),
  why: z.string(),
});

const SeasonSchema = z.object({
  name: z.string(),
  months: z.string(),
  summary: z.string(),
});

const WeatherSchema = z.object({
  season: z.string(),
  tempC: z.string(),
  notes: z.string(),
});

const ProsConsSchema = z.object({
  pros: z.array(z.string()),
  cons: z.array(z.string()),
});

const BudgetSchema = z.object({
  backpacker: z.string(),
  midRange: z.string(),
  luxury: z.string(),
  currency: z.string(),
});

const SafetySchema = z.object({
  rating: z.string(),
  tips: z.array(z.string()),
});

const CityInsightSchema = z.object({
  intro: z.string().max(600),
  attractions: z.array(AttractionSchema),
  seasons: z.array(SeasonSchema),
  weather: z.array(WeatherSchema),
  prosCons: ProsConsSchema.optional(),
  bestFor: z.array(z.string()).optional(),
  budget: BudgetSchema.optional(),
  safety: SafetySchema.optional(),
  bestMonths: z.string().optional(),
  avoidMonths: z.string().optional(),
});

export type CityInsight = z.infer<typeof CityInsightSchema>;

function sanitizeJsonResponse(raw: string) {
  // More robust cleanup for AI responses
  const start = raw.indexOf("{");
  if (start === -1) return raw;

  let depth = 0;
  // Use indexed loop but access with charAt to avoid "object injection" linter warning
  for (let i = start; i < raw.length; i += 1) {
    const char = raw.charAt(i);
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) {
      return raw.slice(start, i + 1);
    }
  }

  return raw;
}

function isFresh(updated_at?: string, ttlDays = 365) {
  if (!updated_at) return false;
  const updated = new Date(updated_at);
  const now = new Date();
  const days = (now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24);
  return days < ttlDays;
}

/**
 * Encapsulated fetch for City Insights with Zod validation
 * and Stale-While-Revalidate support.
 */
export async function getCityInsight(city: City): Promise<CityInsight | null> {
  if (!process.env.GOOGLE_GEMINI_API_KEY) {
    console.warn("GOOGLE_GEMINI_API_KEY not found.");
    return null;
  }

  let cachedInsight: CityInsight | null = null;

  try {
    const { data: cached } = await supabase
      .from("city_ai_insights")
      .select("intro, attractions, seasons, weather, prosCons:pros_cons, bestFor:best_for, budget, safety, bestMonths:best_months, avoidMonths:avoid_months, updated_at")
      .eq("city_id", city.id)
      .maybeSingle();

    // Stale-While-Revalidate: Return cached data if present, even if old,
    // though we prefer fresh data (< 365 days).
    if (cached) {
      const cachedCandidate = {
        intro: (cached.intro || "").slice(0, 600),
        attractions: cached.attractions || [],
        seasons: cached.seasons || [],
        weather: cached.weather || [],
        prosCons: cached.prosCons || undefined,
        bestFor: cached.bestFor || undefined,
        budget: cached.budget || undefined,
        safety: cached.safety || undefined,
        bestMonths: cached.bestMonths || undefined,
        avoidMonths: cached.avoidMonths || undefined,
      };
      const cachedParsed = CityInsightSchema.safeParse(cachedCandidate);
      cachedInsight = cachedParsed.success ? cachedParsed.data : null;

      if (cachedInsight && isFresh(cached.updated_at, 365)) {
        return cachedInsight;
      }
    }

    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
    const prompt = `
      You are a concise travel curator. Summarize ${city.city}, ${city.country}.
      Return ONLY a JSON object with keys:
      {
        "intro": "≤500 characters, vivid city intro",
        "attractions": [{ "name": "spot", "why": "1 short sentence" }],
        "seasons": [{ "name": "Spring", "months": "Mar-May", "summary": "advice" }],
        "weather": [{ "season": "Spring", "tempC": "range°C", "notes": "tip" }],
        "prosCons": { "pros": ["3-4 genuine advantages"], "cons": ["3-4 honest drawbacks"] },
        "bestFor": ["budget travelers", "digital nomads", "families", etc. - pick 2-4 that fit],
        "budget": { "backpacker": "$X-Y/day", "midRange": "$X-Y/day", "luxury": "$X-Y/day", "currency": "local currency name" },
        "safety": { "rating": "Very Safe/Safe/Moderate/Exercise Caution", "tips": ["2-3 practical safety tips"] },
        "bestMonths": "e.g. March to May, September to November",
        "avoidMonths": "e.g. June to August (extreme heat)"
      }
    `;

    const result = await model.generateContent(prompt);
    const responseText = await result.response.text();
    const rawJson = sanitizeJsonResponse(responseText);

    // Validate with Zod before trusting the AI
    const parsed = CityInsightSchema.parse(JSON.parse(rawJson));

    // Async Update Cache (Don't block the return)
    const clientToUse = supabaseServer || supabase;
    clientToUse.from("city_ai_insights").upsert(
      {
        city_id: city.id,
        city_name: city.city,
        country: city.country,
        ...parsed,
        pros_cons: parsed.prosCons,
        best_for: parsed.bestFor,
        best_months: parsed.bestMonths,
        avoid_months: parsed.avoidMonths,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "city_id" }
    ).then(({ error }) => {
      if (error) {
        console.error(`Failed to cache insight for ${city.city}:`, error);
      } else {
        console.info(`✅ Cached insight for ${city.city}`);
      }
    });

    return parsed;
  } catch (e) {
    console.error(`Failed to get city insight for ${city.id}:`, e);
    // If validation fails or AI errors, we could fall back to the cached (stale) data
    // if we haven't already returned it.
    return cachedInsight;
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
    let cityNames: string[];
    try {
      cityNames = JSON.parse(text.replace(/```json|```/gi, "").trim());
    } catch {
      console.error("Failed to parse AI trending cities response");
      return [];
    }

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

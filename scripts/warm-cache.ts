#!/usr/bin/env npx tsx
/**
 * Warm Cache CLI Script for BestCitySpots
 *
 * Pre-populates cache layers (places, AI insights) for priority cities,
 * reducing cold-start latency and API call volume when users search.
 *
 * Usage: npx tsx scripts/warm-cache.ts [options]
 *
 * Options:
 *   --trending-only     Only warm trending destinations
 *   --top-cities=N      Warm top N cities by population (default: 100)
 *   --places            Warm places cache (landmarks, restaurants, hotels)
 *   --insights          Warm AI insights cache
 *   --all               Warm all caches (default)
 *   --concurrency=N     Parallel requests per cache type (default: 3)
 *   --dry-run           Show what would be warmed without making API calls
 *   --help              Show this help message
 *
 * Environment Variables:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   SUPABASE_SERVICE_ROLE_KEY
 *   GOOGLE_PLACES_API_KEY
 *   GOOGLE_GEMINI_API_KEY
 */

import { config } from "dotenv";
import { resolve } from "path";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Load environment variables from .env.local (Next.js convention)
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });
import { TRENDING_2026, CITY_ALIASES } from "./trending-destinations";

// ============================================================================
// Types
// ============================================================================

interface City {
  id: number;
  city: string;
  city_ascii: string;
  country: string;
  lat: number;
  lng: number;
  population: number;
  admin_name?: string;
}

interface WarmOptions {
  places: boolean;
  insights: boolean;
  dryRun: boolean;
  concurrency: number;
}

interface CityWarmResult {
  city: City;
  placesWarmed: number;
  placesCached: number;
  placesErrors: number;
  insightsWarmed: boolean;
  insightsCached: boolean;
  insightsError: boolean;
  duration: number;
}

interface WarmStats {
  totalCities: number;
  citiesProcessed: number;
  placesWarmed: number;
  placesCached: number;
  placesErrors: number;
  insightsWarmed: number;
  insightsCached: number;
  insightsErrors: number;
  startTime: number;
}

// ============================================================================
// Configuration
// ============================================================================

const PLACE_TYPES = ["landmarks", "restaurants", "hotels"] as const;
const PLACES_CACHE_TTL_DAYS = 5; // Warm if older than 5 days (TTL is 7)
const INSIGHTS_CACHE_TTL_DAYS = 330; // Warm if older than 330 days (TTL is 365)

// ============================================================================
// Supabase Client
// ============================================================================

function createSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error("Error: Missing NEXT_PUBLIC_SUPABASE_URL or Supabase key");
    process.exit(1);
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// ============================================================================
// CLI Argument Parsing
// ============================================================================

interface CliArgs {
  trendingOnly: boolean;
  topCities: number;
  places: boolean;
  insights: boolean;
  all: boolean;
  concurrency: number;
  dryRun: boolean;
  help: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {
    trendingOnly: false,
    topCities: 100,
    places: false,
    insights: false,
    all: false,
    concurrency: 3,
    dryRun: false,
    help: false,
  };

  for (const arg of args) {
    if (arg === "--help" || arg === "-h") {
      result.help = true;
    } else if (arg === "--trending-only") {
      result.trendingOnly = true;
    } else if (arg.startsWith("--top-cities=")) {
      result.topCities = parseInt(arg.split("=")[1], 10) || 100;
    } else if (arg === "--places") {
      result.places = true;
    } else if (arg === "--insights") {
      result.insights = true;
    } else if (arg === "--all") {
      result.all = true;
    } else if (arg.startsWith("--concurrency=")) {
      result.concurrency = parseInt(arg.split("=")[1], 10) || 3;
    } else if (arg === "--dry-run") {
      result.dryRun = true;
    }
  }

  // Default to --all if no specific cache type specified
  if (!result.places && !result.insights) {
    result.all = true;
  }

  if (result.all) {
    result.places = true;
    result.insights = true;
  }

  return result;
}

function showHelp(): void {
  console.log(`
Warm Cache CLI Script for BestCitySpots
=======================================

Pre-populates cache layers for priority cities to reduce cold-start latency.

Usage: npx tsx scripts/warm-cache.ts [options]

Options:
  --trending-only     Only warm trending destinations (10 cities)
  --top-cities=N      Warm top N cities by population (default: 100)
  --places            Warm places cache (landmarks, restaurants, hotels)
  --insights          Warm AI insights cache
  --all               Warm all caches (default if no specific cache specified)
  --concurrency=N     Parallel requests per cache type (default: 3)
  --dry-run           Show what would be warmed without making API calls
  --help, -h          Show this help message

Examples:
  npx tsx scripts/warm-cache.ts --trending-only --places
  npx tsx scripts/warm-cache.ts --top-cities=50 --all
  npx tsx scripts/warm-cache.ts --dry-run

Environment Variables Required:
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY)
  GOOGLE_PLACES_API_KEY (for --places)
  GOOGLE_GEMINI_API_KEY (for --insights)
`);
}

// ============================================================================
// City Resolution
// ============================================================================

async function resolveTrendingCities(supabase: SupabaseClient): Promise<City[]> {
  const cities: City[] = [];

  for (const destination of TRENDING_2026) {
    // Try exact match first
    let { data } = await supabase
      .from("cities")
      .select("id, city, city_ascii, country, lat, lng, population, admin_name")
      .ilike("city", destination.name)
      .ilike("country", `%${destination.country}%`)
      .order("population", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Try aliases if no match
    if (!data && CITY_ALIASES[destination.name]) {
      for (const alias of CITY_ALIASES[destination.name]) {
        const { data: aliasMatch } = await supabase
          .from("cities")
          .select("id, city, city_ascii, country, lat, lng, population, admin_name")
          .ilike("city", alias)
          .ilike("country", `%${destination.country}%`)
          .order("population", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (aliasMatch) {
          data = aliasMatch;
          break;
        }
      }
    }

    // Try fuzzy match on country only
    if (!data) {
      const { data: fuzzyMatch } = await supabase
        .from("cities")
        .select("id, city, city_ascii, country, lat, lng, population, admin_name")
        .ilike("city", `%${destination.name}%`)
        .order("population", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fuzzyMatch) {
        data = fuzzyMatch;
      }
    }

    if (data) {
      cities.push(data as City);
    } else {
      console.warn(`  Warning: Could not find city "${destination.name}, ${destination.country}" in database`);
    }
  }

  return cities;
}

async function getTopCitiesByPopulation(supabase: SupabaseClient, limit: number): Promise<City[]> {
  const { data, error } = await supabase
    .from("cities")
    .select("id, city, city_ascii, country, lat, lng, population, admin_name")
    .order("population", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching top cities:", error);
    return [];
  }

  return (data || []) as City[];
}

async function resolveCities(
  supabase: SupabaseClient,
  trendingOnly: boolean,
  topCitiesLimit: number
): Promise<City[]> {
  console.log("\nResolving cities...");

  // Get trending destinations
  const trendingCities = await resolveTrendingCities(supabase);
  console.log(`  - Found ${trendingCities.length} trending destinations`);

  if (trendingOnly) {
    return trendingCities;
  }

  // Get top cities by population
  const topCities = await getTopCitiesByPopulation(supabase, topCitiesLimit);

  // Merge and deduplicate by city ID
  const cityMap = new Map<number, City>();

  // Add trending first (higher priority)
  for (const city of trendingCities) {
    cityMap.set(city.id, city);
  }

  // Add top cities
  for (const city of topCities) {
    if (!cityMap.has(city.id)) {
      cityMap.set(city.id, city);
    }
  }

  const uniqueCount = cityMap.size - trendingCities.length;
  console.log(`  - Added ${uniqueCount} unique top cities by population`);
  console.log(`  - Total: ${cityMap.size} cities to warm`);

  return Array.from(cityMap.values());
}

// ============================================================================
// Cache Status Checking
// ============================================================================

async function checkPlacesCacheStatus(
  supabase: SupabaseClient,
  cityName: string,
  placeType: string
): Promise<{ isFresh: boolean; ageInDays: number | null }> {
  const { data } = await supabase
    .from("city_places_cache")
    .select("updated_at")
    .eq("city_name", cityName)
    .eq("place_type", placeType)
    .maybeSingle();

  if (!data?.updated_at) {
    return { isFresh: false, ageInDays: null };
  }

  const updatedAt = new Date(data.updated_at);
  const now = new Date();
  const ageInDays = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);

  return {
    isFresh: ageInDays < PLACES_CACHE_TTL_DAYS,
    ageInDays: Math.round(ageInDays * 10) / 10,
  };
}

async function checkInsightsCacheStatus(
  supabase: SupabaseClient,
  cityId: number
): Promise<{ isFresh: boolean; ageInDays: number | null }> {
  const { data } = await supabase
    .from("city_ai_insights")
    .select("updated_at")
    .eq("city_id", cityId)
    .maybeSingle();

  if (!data?.updated_at) {
    return { isFresh: false, ageInDays: null };
  }

  const updatedAt = new Date(data.updated_at);
  const now = new Date();
  const ageInDays = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);

  return {
    isFresh: ageInDays < INSIGHTS_CACHE_TTL_DAYS,
    ageInDays: Math.round(ageInDays * 10) / 10,
  };
}

// ============================================================================
// Cache Warming Functions
// ============================================================================

async function warmPlacesCache(
  supabase: SupabaseClient,
  city: City,
  placeType: (typeof PLACE_TYPES)[number],
  dryRun: boolean
): Promise<{ warmed: boolean; cached: boolean; error: boolean }> {
  const status = await checkPlacesCacheStatus(supabase, city.city, placeType);

  if (status.isFresh) {
    return { warmed: false, cached: true, error: false };
  }

  if (dryRun) {
    return { warmed: true, cached: false, error: false };
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error("    Error: GOOGLE_PLACES_API_KEY not set");
    return { warmed: false, cached: false, error: true };
  }

  try {
    // Build query based on place type
    let queryText: string;
    switch (placeType) {
      case "landmarks":
        queryText = `Top landmarks and attractions in ${city.city}`;
        break;
      case "restaurants":
        queryText = `Best restaurants and local food in ${city.city}`;
        break;
      case "hotels":
        queryText = `Top rated hotels and places to stay in ${city.city}`;
        break;
    }

    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.displayName,places.formattedAddress,places.id,places.rating,places.userRatingCount,places.types,places.googleMapsUri,places.priceLevel,places.location,places.photos",
      },
      body: JSON.stringify({
        textQuery: queryText,
        maxResultCount: 20,
        locationBias: {
          circle: {
            center: { latitude: city.lat, longitude: city.lng },
            radius: 50000,
          },
        },
      }),
    });

    if (!response.ok) {
      console.error(`    Error: Google Places API returned ${response.status}`);
      return { warmed: false, cached: false, error: true };
    }

    const data = await response.json();
    const places = data.places || [];

    // Store in cache
    if (places.length > 0) {
      await supabase.from("city_places_cache").upsert({
        city_name: city.city,
        place_type: placeType,
        places_data: places,
        updated_at: new Date().toISOString(),
      });
    }

    return { warmed: true, cached: false, error: false };
  } catch (err) {
    console.error(`    Error warming ${placeType}:`, err);
    return { warmed: false, cached: false, error: true };
  }
}

async function warmInsightsCache(
  supabase: SupabaseClient,
  city: City,
  dryRun: boolean
): Promise<{ warmed: boolean; cached: boolean; error: boolean }> {
  const status = await checkInsightsCacheStatus(supabase, city.id);

  if (status.isFresh) {
    return { warmed: false, cached: true, error: false };
  }

  if (dryRun) {
    return { warmed: true, cached: false, error: false };
  }

  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    console.error("    Error: GOOGLE_GEMINI_API_KEY not set");
    return { warmed: false, cached: false, error: true };
  }

  try {
    // Use the Google Generative AI SDK
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
      You are a concise travel curator. Summarize ${city.city}, ${city.country}.
      Return ONLY a JSON object with keys:
      {
        "intro": "≤500 characters, vivid city intro",
        "attractions": [{ "name": "spot", "why": "1 short sentence" }],
        "seasons": [{ "name": "Spring", "months": "Mar-May", "summary": "advice" }],
        "weather": [{ "season": "Spring", "tempC": "range°C", "notes": "tip" }]
      }
      Do not include code fences or markdown.
    `;

    const result = await model.generateContent(prompt);
    const responseText = await result.response.text();

    // Parse JSON from response
    const start = responseText.indexOf("{");
    const end = responseText.lastIndexOf("}");
    if (start === -1 || end === -1) {
      throw new Error("Invalid JSON response from Gemini");
    }

    const parsed = JSON.parse(responseText.slice(start, end + 1));

    // Store in cache
    await supabase.from("city_ai_insights").upsert(
      {
        city_id: city.id,
        city_name: city.city,
        country: city.country,
        intro: (parsed.intro || "").slice(0, 600),
        attractions: parsed.attractions || [],
        seasons: parsed.seasons || [],
        weather: parsed.weather || [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "city_id" }
    );

    return { warmed: true, cached: false, error: false };
  } catch (err) {
    console.error(`    Error warming insights:`, err);
    return { warmed: false, cached: false, error: true };
  }
}

// ============================================================================
// Main Cache Warmer with Concurrency Control
// ============================================================================

async function warmCacheForCity(
  supabase: SupabaseClient,
  city: City,
  options: WarmOptions,
  index: number,
  total: number
): Promise<CityWarmResult> {
  const startTime = Date.now();
  const result: CityWarmResult = {
    city,
    placesWarmed: 0,
    placesCached: 0,
    placesErrors: 0,
    insightsWarmed: false,
    insightsCached: false,
    insightsError: false,
    duration: 0,
  };

  console.log(`\n[${index + 1}/${total}] ${city.city}, ${city.country}`);

  // Warm places cache
  if (options.places) {
    const placeResults: string[] = [];

    for (const placeType of PLACE_TYPES) {
      const placeResult = await warmPlacesCache(supabase, city, placeType, options.dryRun);

      if (placeResult.cached) {
        result.placesCached++;
        placeResults.push(`${placeType}: cached`);
      } else if (placeResult.warmed) {
        result.placesWarmed++;
        placeResults.push(`${placeType}: ${options.dryRun ? "would warm" : "warmed"}`);
      } else if (placeResult.error) {
        result.placesErrors++;
        placeResults.push(`${placeType}: error`);
      }

      // Small delay between place type requests to avoid rate limiting
      if (!options.dryRun) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    console.log(`  - Places: ${placeResults.join(", ")}`);
  }

  // Warm insights cache
  if (options.insights) {
    const insightResult = await warmInsightsCache(supabase, city, options.dryRun);

    if (insightResult.cached) {
      result.insightsCached = true;
      console.log(`  - Insights: cached`);
    } else if (insightResult.warmed) {
      result.insightsWarmed = true;
      console.log(`  - Insights: ${options.dryRun ? "would warm" : "warmed"}`);
    } else if (insightResult.error) {
      result.insightsError = true;
      console.log(`  - Insights: error`);
    }
  }

  result.duration = Date.now() - startTime;
  return result;
}

async function warmCachesWithConcurrency(
  supabase: SupabaseClient,
  cities: City[],
  options: WarmOptions
): Promise<CityWarmResult[]> {
  const results: CityWarmResult[] = [];
  const total = cities.length;

  // Process cities with concurrency limit
  for (let i = 0; i < cities.length; i += options.concurrency) {
    const batch = cities.slice(i, i + options.concurrency);
    const batchPromises = batch.map((city, batchIndex) =>
      warmCacheForCity(supabase, city, options, i + batchIndex, total)
    );

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Delay between batches to avoid rate limiting
    if (!options.dryRun && i + options.concurrency < cities.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return results;
}

// ============================================================================
// Statistics Reporter
// ============================================================================

function printSummary(results: CityWarmResult[], startTime: number, dryRun: boolean): void {
  const totalDuration = Date.now() - startTime;

  const stats: WarmStats = {
    totalCities: results.length,
    citiesProcessed: results.length,
    placesWarmed: results.reduce((sum, r) => sum + r.placesWarmed, 0),
    placesCached: results.reduce((sum, r) => sum + r.placesCached, 0),
    placesErrors: results.reduce((sum, r) => sum + r.placesErrors, 0),
    insightsWarmed: results.filter((r) => r.insightsWarmed).length,
    insightsCached: results.filter((r) => r.insightsCached).length,
    insightsErrors: results.filter((r) => r.insightsError).length,
    startTime,
  };

  const minutes = Math.floor(totalDuration / 60000);
  const seconds = Math.floor((totalDuration % 60000) / 1000);
  const durationStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

  console.log(`
================================================================================
Summary${dryRun ? " (DRY RUN)" : ""}
================================================================================
Cities processed: ${stats.citiesProcessed}

Places Cache:
  - Warmed: ${stats.placesWarmed}
  - Already cached: ${stats.placesCached}
  - Errors: ${stats.placesErrors}

AI Insights Cache:
  - Warmed: ${stats.insightsWarmed}
  - Already cached: ${stats.insightsCached}
  - Errors: ${stats.insightsErrors}

Duration: ${durationStr}
================================================================================
`);

  // Exit with error code if too many failures
  const totalErrors = stats.placesErrors + stats.insightsErrors;
  const totalAttempts =
    stats.placesWarmed + stats.placesCached + stats.placesErrors + stats.insightsWarmed + stats.insightsCached + stats.insightsErrors;
  const errorRate = totalAttempts > 0 ? totalErrors / totalAttempts : 0;

  if (errorRate > 0.1) {
    console.error(`Error rate (${(errorRate * 100).toFixed(1)}%) exceeds 10% threshold`);
    process.exit(1);
  }
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  console.log(`
================================================================================
Warm Cache CLI
================================================================================
Mode: ${args.trendingOnly ? "trending only" : `trending + top ${args.topCities} cities`}
Caches: ${[args.places && "places", args.insights && "insights"].filter(Boolean).join(", ")}
Concurrency: ${args.concurrency}
${args.dryRun ? "DRY RUN - No actual API calls will be made" : ""}
`);

  // Check required environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error("Error: NEXT_PUBLIC_SUPABASE_URL not set");
    process.exit(1);
  }

  if (args.places && !args.dryRun && !process.env.GOOGLE_PLACES_API_KEY) {
    console.error("Error: GOOGLE_PLACES_API_KEY required for --places");
    process.exit(1);
  }

  if (args.insights && !args.dryRun && !process.env.GOOGLE_GEMINI_API_KEY) {
    console.error("Error: GOOGLE_GEMINI_API_KEY required for --insights");
    process.exit(1);
  }

  const supabase = createSupabaseClient();
  const startTime = Date.now();

  // Resolve cities
  const cities = await resolveCities(supabase, args.trendingOnly, args.topCities);

  if (cities.length === 0) {
    console.error("Error: No cities found to warm");
    process.exit(1);
  }

  // Warm caches
  console.log("\nWarming caches...");
  const results = await warmCachesWithConcurrency(supabase, cities, {
    places: args.places,
    insights: args.insights,
    dryRun: args.dryRun,
    concurrency: args.concurrency,
  });

  // Print summary
  printSummary(results, startTime, args.dryRun);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

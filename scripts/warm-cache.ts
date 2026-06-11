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
 *   --traffic           Prioritize cities with real site traffic
 *   --places            Warm places cache (landmarks, restaurants, hotels)
 *   --insights          Warm AI insights cache
 *   --weather           Warm weather + AQI cache
 *   --metrics           Warm city metrics cache
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
 *   OPENWEATHERMAP_API_KEY
 */

import { config } from "dotenv";
import { resolve } from "path";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Load environment variables from .env.local (Next.js convention)
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });
import { TRENDING_2026, CITY_ALIASES } from "./trending-destinations";
import { CACHE_TTL } from "../src/lib/cache-config";

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
  weather: boolean;
  metrics: boolean;
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
  weatherWarmed: boolean;
  weatherCached: boolean;
  weatherError: boolean;
  metricsWarmed: boolean;
  metricsCached: boolean;
  metricsError: boolean;
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
  weatherWarmed: number;
  weatherCached: number;
  weatherErrors: number;
  metricsWarmed: number;
  metricsCached: number;
  metricsErrors: number;
  startTime: number;
}

// ============================================================================
// Configuration
// ============================================================================

const PLACE_TYPES = ["landmarks", "restaurants", "hotels"] as const;
const PLACES_WARM_THRESHOLD_DAYS = CACHE_TTL.PLACES_SOFT_REFRESH_DAYS; // Warm if past soft-refresh window
const INSIGHTS_WARM_THRESHOLD_DAYS = CACHE_TTL.INSIGHTS_FRESH_DAYS - 35; // Warm 35 days before expiry
const WEATHER_WARM_THRESHOLD_MINUTES = CACHE_TTL.WEATHER_FRESH_MINUTES - 10; // Warm 10 min before expiry
const METRICS_WARM_THRESHOLD_MINUTES = CACHE_TTL.METRICS_FRESH_MINUTES - 10;

function getAqiLabel(aqi: number): string {
  switch (aqi) {
    case 1:
      return "Good";
    case 2:
      return "Fair";
    case 3:
      return "Moderate";
    case 4:
      return "Poor";
    case 5:
      return "Very Poor";
    default:
      return "Unknown";
  }
}

// ============================================================================
// Supabase Client
// ============================================================================

function createSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
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
  weather: boolean;
  metrics: boolean;
  traffic: boolean;
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
    weather: false,
    metrics: false,
    traffic: false,
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
    } else if (arg === "--weather") {
      result.weather = true;
    } else if (arg === "--metrics") {
      result.metrics = true;
    } else if (arg === "--traffic") {
      result.traffic = true;
    } else if (arg === "--all") {
      result.all = true;
    } else if (arg.startsWith("--concurrency=")) {
      result.concurrency = parseInt(arg.split("=")[1], 10) || 3;
    } else if (arg === "--dry-run") {
      result.dryRun = true;
    }
  }

  // Default to --all if no specific cache type specified
  if (!result.places && !result.insights && !result.weather && !result.metrics) {
    result.all = true;
  }

  if (result.all) {
    result.places = true;
    result.insights = true;
    result.weather = true;
    result.metrics = true;
  }

  return result;
}

function showHelp(): void {
  console.log(`
Warm Cache CLI Script for BestCitySpots
=======================================

Pre-populates cache layers for priority cities to reduce cold-start latency.

Usage: npx tsx scripts/warm-cache.ts [options]

City Selection:
  --trending-only     Only warm trending destinations (~30 cities)
  --top-cities=N      Warm top N cities by population (default: 100)
  --traffic           Also warm cities with real user traffic (from city_views_daily)

Cache Types (default: --all):
  --places            Warm places cache (landmarks, restaurants, hotels)
  --insights          Warm AI insights cache (Gemini)
  --weather           Warm weather + AQI cache (OpenWeatherMap)
  --metrics           Warm city metrics cache (Open-Meteo)
  --all               Warm all cache types

Other:
  --concurrency=N     Parallel city processing (default: 3)
  --dry-run           Show what would be warmed without making API calls
  --help, -h          Show this help message

Examples:
  npx tsx scripts/warm-cache.ts --trending-only --places
  npx tsx scripts/warm-cache.ts --traffic --weather --metrics
  npx tsx scripts/warm-cache.ts --top-cities=50 --all
  npx tsx scripts/warm-cache.ts --dry-run

Environment Variables Required:
  NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  GOOGLE_PLACES_API_KEY (for --places)
  GOOGLE_GEMINI_API_KEY (for --insights)
  OPENWEATHERMAP_API_KEY (for --weather)
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
      console.warn(
        `  Warning: Could not find city "${destination.name}, ${destination.country}" in database`
      );
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

async function getTopCitiesByTraffic(supabase: SupabaseClient, limit: number): Promise<City[]> {
  const { data, error } = await supabase.rpc("get_cities_by_traffic", { result_limit: limit });

  if (error) {
    // Fallback: run a manual join if the RPC doesn't exist
    console.warn("  RPC get_cities_by_traffic not found, using manual query...");
    const { data: fallback, error: fbErr } = await supabase
      .from("city_views_daily")
      .select("city_id, views")
      .order("views", { ascending: false })
      .limit(limit * 2);

    if (fbErr || !fallback?.length) return [];

    const cityIds = [...new Set(fallback.map((r: { city_id: number }) => r.city_id))].slice(
      0,
      limit
    );
    const { data: cities } = await supabase
      .from("cities")
      .select("id, city, city_ascii, country, lat, lng, population, admin_name")
      .in("id", cityIds);

    return (cities || []) as City[];
  }

  return (data || []) as City[];
}

async function resolveCities(
  supabase: SupabaseClient,
  trendingOnly: boolean,
  topCitiesLimit: number,
  includeTraffic: boolean
): Promise<City[]> {
  console.log("\nResolving cities...");

  // Get trending destinations
  const trendingCities = await resolveTrendingCities(supabase);
  console.log(`  - Found ${trendingCities.length} trending destinations`);

  if (trendingOnly) {
    return trendingCities;
  }

  // Merge and deduplicate by city ID
  const cityMap = new Map<number, City>();

  // Add trending first (highest priority)
  for (const city of trendingCities) {
    cityMap.set(city.id, city);
  }

  // Add traffic-based cities (cities real users are visiting)
  if (includeTraffic) {
    const trafficCities = await getTopCitiesByTraffic(supabase, 50);
    const beforeTraffic = cityMap.size;
    for (const city of trafficCities) {
      if (!cityMap.has(city.id)) cityMap.set(city.id, city);
    }
    console.log(`  - Added ${cityMap.size - beforeTraffic} cities from site traffic`);
  }

  // Fill remaining slots with top cities by population
  const topCities = await getTopCitiesByPopulation(supabase, topCitiesLimit);
  const beforePop = cityMap.size;
  for (const city of topCities) {
    if (!cityMap.has(city.id)) cityMap.set(city.id, city);
  }
  console.log(`  - Added ${cityMap.size - beforePop} unique top cities by population`);
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
    isFresh: ageInDays < PLACES_WARM_THRESHOLD_DAYS,
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
    isFresh: ageInDays < INSIGHTS_WARM_THRESHOLD_DAYS,
    ageInDays: Math.round(ageInDays * 10) / 10,
  };
}

// ============================================================================
// Cache Warming Functions
// ============================================================================

// ── Warmer budget envelope (incident action P2) ─────────────────────────────
// The warmer claims every paid call from the SAME durable daily counter as the
// web app (public.claim_provider_use), so total provider spend per day is
// bounded regardless of who initiates the call. The warmer's envelope is
// configurable; once exhausted, remaining cities are skipped gracefully.
const WARM_BUDGETS = {
  "google-places": parseWarmBudget(process.env.WARM_CACHE_PLACES_BUDGET, 300),
  gemini: parseWarmBudget(process.env.WARM_CACHE_GEMINI_BUDGET, 100),
} as const;

function parseWarmBudget(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

const exhaustedBudgets = new Set<keyof typeof WARM_BUDGETS>();

/**
 * Atomic claim against the shared provider budget. Fails closed: any RPC
 * error stops further paid calls for that provider in this run — a warmer
 * must never be the thing that runs up an unbounded bill.
 */
async function claimProviderBudget(
  supabase: SupabaseClient,
  provider: keyof typeof WARM_BUDGETS
): Promise<boolean> {
  if (exhaustedBudgets.has(provider)) return false;

  const { data, error } = await supabase.rpc("claim_provider_use", {
    p_provider: provider,
    p_day: new Date().toISOString().slice(0, 10),
    p_limit: WARM_BUDGETS[provider],
  });

  if (error) {
    console.error(`    [budget] claim failed for ${provider}: ${error.message} — failing closed`);
    exhaustedBudgets.add(provider);
    return false;
  }
  if (data !== true) {
    console.warn(`    [budget] daily ${provider} budget exhausted — skipping remaining calls`);
    exhaustedBudgets.add(provider);
    return false;
  }
  return true;
}

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

  if (!(await claimProviderBudget(supabase, "google-places"))) {
    return { warmed: false, cached: false, error: false };
  }

  try {
    // Build query based on place type
    let queryText: string;
    switch (placeType) {
      case "landmarks":
        queryText = `Top landmarks and attractions in ${city.city}`;
        break;
      case "restaurants":
        queryText = `Best restaurants, local food, street food, and cheap eats in ${city.city}`;
        break;
      case "hotels":
        queryText = `Top rated hotels, hostels, guest houses, and budget stays in ${city.city}`;
        break;
    }

    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.displayName,places.formattedAddress,places.id,places.rating,places.userRatingCount,places.types,places.googleMapsUri,places.priceLevel,places.location",
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

  if (!(await claimProviderBudget(supabase, "gemini"))) {
    return { warmed: false, cached: false, error: false };
  }

  try {
    // Use the Google Generative AI SDK
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

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

async function checkWeatherCacheStatus(
  supabase: SupabaseClient,
  cityId: number
): Promise<{ isFresh: boolean; ageInMinutes: number | null }> {
  const { data } = await supabase
    .from("city_weather_cache")
    .select("updated_at")
    .eq("city_id", cityId)
    .maybeSingle();

  if (!data?.updated_at) return { isFresh: false, ageInMinutes: null };

  const ageMs = Date.now() - new Date(data.updated_at).getTime();
  const ageInMinutes = ageMs / (1000 * 60);
  return {
    isFresh: ageInMinutes < WEATHER_WARM_THRESHOLD_MINUTES,
    ageInMinutes: Math.round(ageInMinutes),
  };
}

async function warmWeatherCache(
  supabase: SupabaseClient,
  city: City,
  dryRun: boolean
): Promise<{ warmed: boolean; cached: boolean; error: boolean }> {
  const status = await checkWeatherCacheStatus(supabase, city.id);
  if (status.isFresh) return { warmed: false, cached: true, error: false };
  if (dryRun) return { warmed: true, cached: false, error: false };

  const apiKey = process.env.OPENWEATHERMAP_API_KEY;
  if (!apiKey) {
    console.error("    Error: OPENWEATHERMAP_API_KEY not set");
    return { warmed: false, cached: false, error: true };
  }

  try {
    const [weatherRes, aqiRes] = await Promise.all([
      fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${city.lat}&lon=${city.lng}&appid=${apiKey}&units=metric`,
        { signal: AbortSignal.timeout(10_000) }
      ),
      fetch(
        `https://api.openweathermap.org/data/2.5/air_pollution?lat=${city.lat}&lon=${city.lng}&appid=${apiKey}`,
        { signal: AbortSignal.timeout(10_000) }
      ),
    ]);

    if (!weatherRes.ok || !aqiRes.ok) return { warmed: false, cached: false, error: true };

    const weather = await weatherRes.json();
    const aqiData = await aqiRes.json();
    const rawAqi = aqiData.list?.[0]?.main?.aqi;
    const aqiValue = typeof rawAqi === "number" ? rawAqi : 0;

    const row = {
      city_id: city.id,
      temp: weather.main?.temp || 0,
      feels_like: weather.main?.feels_like || 0,
      temp_min: weather.main?.temp_min || 0,
      temp_max: weather.main?.temp_max || 0,
      humidity: weather.main?.humidity || 0,
      description: weather.weather?.[0]?.description || "unknown",
      icon: weather.weather?.[0]?.icon || "",
      wind_speed: weather.wind?.speed || 0,
      aqi: aqiValue,
      aqi_label: getAqiLabel(aqiValue),
      updated_at: new Date().toISOString(),
    };

    await supabase.from("city_weather_cache").upsert(row, { onConflict: "city_id" });
    return { warmed: true, cached: false, error: false };
  } catch (err) {
    console.error("    Error warming weather:", err);
    return { warmed: false, cached: false, error: true };
  }
}

async function checkMetricsCacheStatus(
  supabase: SupabaseClient,
  cityId: number
): Promise<{ isFresh: boolean; ageInMinutes: number | null }> {
  const { data } = await supabase
    .from("city_metrics")
    .select("updated_at")
    .eq("city_id", cityId)
    .maybeSingle();

  if (!data?.updated_at) return { isFresh: false, ageInMinutes: null };

  const ageMs = Date.now() - new Date(data.updated_at).getTime();
  const ageInMinutes = ageMs / (1000 * 60);
  return {
    isFresh: ageInMinutes < METRICS_WARM_THRESHOLD_MINUTES,
    ageInMinutes: Math.round(ageInMinutes),
  };
}

async function warmMetricsCache(
  supabase: SupabaseClient,
  city: City,
  dryRun: boolean
): Promise<{ warmed: boolean; cached: boolean; error: boolean }> {
  const status = await checkMetricsCacheStatus(supabase, city.id);
  if (status.isFresh) return { warmed: false, cached: true, error: false };
  if (dryRun) return { warmed: true, cached: false, error: false };

  try {
    const [aqRes, tempRes] = await Promise.all([
      fetch(
        `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${city.lat}&longitude=${city.lng}&hourly=pm2_5&past_days=1&forecast_days=1&timezone=auto`,
        { signal: AbortSignal.timeout(10_000) }
      ),
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lng}&current=temperature_2m&timezone=auto`,
        { signal: AbortSignal.timeout(10_000) }
      ),
    ]);

    let pm25: number | null = null;
    let comfort: string | null = null;

    if (aqRes.ok) {
      const aq = await aqRes.json();
      const vals: number[] | undefined = aq?.hourly?.pm2_5;
      if (vals?.length) pm25 = vals[vals.length - 1] ?? null;
    }
    if (tempRes.ok) {
      const w = await tempRes.json();
      const t = w?.current?.temperature_2m;
      if (typeof t === "number") {
        comfort = t >= 30 ? "Hot" : t >= 22 ? "Warm" : t >= 15 ? "Mild" : t >= 5 ? "Cool" : "Cold";
      }
    }

    await supabase.from("city_metrics").upsert(
      {
        city_id: city.id,
        pollution_pm25: pm25,
        climate_comfort: comfort,
        updated_at: new Date().toISOString(),
        source: { pollution: "open-meteo/air-quality", climate: "open-meteo/weather" },
      },
      { onConflict: "city_id" }
    );

    return { warmed: true, cached: false, error: false };
  } catch (err) {
    console.error("    Error warming metrics:", err);
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
    weatherWarmed: false,
    weatherCached: false,
    weatherError: false,
    metricsWarmed: false,
    metricsCached: false,
    metricsError: false,
    duration: 0,
  };

  console.log(`\n[${index + 1}/${total}] ${city.city}, ${city.country}`);

  // Warm places cache (all three types in parallel)
  if (options.places) {
    const placeResults = await Promise.all(
      PLACE_TYPES.map((pt) =>
        warmPlacesCache(supabase, city, pt, options.dryRun).then((r) => ({ type: pt, ...r }))
      )
    );

    const labels: string[] = [];
    for (const pr of placeResults) {
      if (pr.cached) {
        result.placesCached++;
        labels.push(`${pr.type}: cached`);
      } else if (pr.warmed) {
        result.placesWarmed++;
        labels.push(`${pr.type}: ${options.dryRun ? "would warm" : "warmed"}`);
      } else if (pr.error) {
        result.placesErrors++;
        labels.push(`${pr.type}: error`);
      }
    }
    console.log(`  Places: ${labels.join(", ")}`);
  }

  // Warm insights, weather, metrics in parallel
  const parallel: Promise<void>[] = [];

  if (options.insights) {
    parallel.push(
      warmInsightsCache(supabase, city, options.dryRun).then((r) => {
        result.insightsCached = r.cached;
        result.insightsWarmed = r.warmed;
        result.insightsError = r.error;
        console.log(
          `  Insights: ${r.cached ? "cached" : r.warmed ? (options.dryRun ? "would warm" : "warmed") : "error"}`
        );
      })
    );
  }

  if (options.weather) {
    parallel.push(
      warmWeatherCache(supabase, city, options.dryRun).then((r) => {
        result.weatherCached = r.cached;
        result.weatherWarmed = r.warmed;
        result.weatherError = r.error;
        console.log(
          `  Weather: ${r.cached ? "cached" : r.warmed ? (options.dryRun ? "would warm" : "warmed") : "error"}`
        );
      })
    );
  }

  if (options.metrics) {
    parallel.push(
      warmMetricsCache(supabase, city, options.dryRun).then((r) => {
        result.metricsCached = r.cached;
        result.metricsWarmed = r.warmed;
        result.metricsError = r.error;
        console.log(
          `  Metrics: ${r.cached ? "cached" : r.warmed ? (options.dryRun ? "would warm" : "warmed") : "error"}`
        );
      })
    );
  }

  await Promise.all(parallel);

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
    weatherWarmed: results.filter((r) => r.weatherWarmed).length,
    weatherCached: results.filter((r) => r.weatherCached).length,
    weatherErrors: results.filter((r) => r.weatherError).length,
    metricsWarmed: results.filter((r) => r.metricsWarmed).length,
    metricsCached: results.filter((r) => r.metricsCached).length,
    metricsErrors: results.filter((r) => r.metricsError).length,
    startTime,
  };

  const mins = Math.floor(totalDuration / 60000);
  const secs = Math.floor((totalDuration % 60000) / 1000);
  const durationStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  console.log(`
================================================================================
Summary${dryRun ? " (DRY RUN)" : ""}
================================================================================
Cities processed: ${stats.citiesProcessed}

Places Cache:     ${stats.placesWarmed} warmed | ${stats.placesCached} cached | ${stats.placesErrors} errors
AI Insights:      ${stats.insightsWarmed} warmed | ${stats.insightsCached} cached | ${stats.insightsErrors} errors
Weather:          ${stats.weatherWarmed} warmed | ${stats.weatherCached} cached | ${stats.weatherErrors} errors
Metrics:          ${stats.metricsWarmed} warmed | ${stats.metricsCached} cached | ${stats.metricsErrors} errors

Duration: ${durationStr}
================================================================================
`);

  const totalErrors =
    stats.placesErrors + stats.insightsErrors + stats.weatherErrors + stats.metricsErrors;
  const totalAttempts =
    stats.placesWarmed +
    stats.placesCached +
    stats.placesErrors +
    stats.insightsWarmed +
    stats.insightsCached +
    stats.insightsErrors +
    stats.weatherWarmed +
    stats.weatherCached +
    stats.weatherErrors +
    stats.metricsWarmed +
    stats.metricsCached +
    stats.metricsErrors;
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

  const cacheTypes = [
    args.places && "places",
    args.insights && "insights",
    args.weather && "weather",
    args.metrics && "metrics",
  ]
    .filter(Boolean)
    .join(", ");

  console.log(`
================================================================================
Warm Cache CLI
================================================================================
Mode: ${args.trendingOnly ? "trending only" : `trending${args.traffic ? " + traffic" : ""} + top ${args.topCities} cities`}
Caches: ${cacheTypes}
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
  const cities = await resolveCities(supabase, args.trendingOnly, args.topCities, args.traffic);

  if (cities.length === 0) {
    console.error("Error: No cities found to warm");
    process.exit(1);
  }

  // Warm caches
  console.log("\nWarming caches...");
  const results = await warmCachesWithConcurrency(supabase, cities, {
    places: args.places,
    insights: args.insights,
    weather: args.weather,
    metrics: args.metrics,
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

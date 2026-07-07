#!/usr/bin/env npx tsx
/**
 * Warm Top-Cities CLI for BestCitySpots
 *
 * Focused warmer for the canonical "top cities" set (population-ranked — the
 * same ordering as /resources/top-cities). Unlike scripts/warm-cache.ts it does
 * NOT pull in trending/traffic destinations, and it DOES fetch place photos:
 * landmark/restaurant/hotel images are downloaded from Google Places, encoded
 * to a BlurHash placeholder, and uploaded to Supabase Storage so the city pages
 * render with images straight from cache (production runs cache-only).
 *
 * Warms: places (+ photos), weather, AI insights. Metrics optional via --metrics.
 *
 * Usage: npx tsx scripts/warm-top-cities.ts [options]
 *
 * City selection (default): demand-first priority list —
 *   1. most-viewed cities from Supabase analytics (city_views_daily, 30d)
 *   2. curated globally-popular destinations (src/lib/warm-priority.ts,
 *      Euromonitor arrivals + landmark research), with landmark queries
 *      enriched by each city's iconic POI names
 *   3. population fallback to fill the limit
 * Use --population-only for the legacy pure-population ordering.
 *
 * Options:
 *   --limit=N            Number of cities to warm (default: 50)
 *   --population-only    Skip analytics/curated priority; population order only
 *   --images-per-type=N  Photos to fetch per category, by review count (default: 6)
 *   --concurrency=N      Cities processed in parallel (default: 3)
 *   --no-ai              Skip AI insights (Gemini)
 *   --no-photos          Warm place data only, skip image download/upload
 *   --metrics            Also warm Open-Meteo metrics (free)
 *   --dry-run            Plan only — no API calls, no spend, no writes
 *   --help               Show this help
 *
 * Environment Variables:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (required)
 *   GOOGLE_PLACES_API_KEY        (places + photos)
 *   AI_PROVIDER                  (insights provider: "openai" [default] or "gemini")
 *   OPENAI_API_KEY               (AI insights when AI_PROVIDER=openai)
 *   GOOGLE_GEMINI_API_KEY        (AI insights when AI_PROVIDER=gemini)
 *   OPENWEATHERMAP_API_KEY       (weather)
 *   WARM_TOP_PLACES_BUDGET       (durable daily cap for google-places; default 1500)
 *   WARM_TOP_OPENAI_BUDGET       (durable daily cap for openai; default 150)
 *   WARM_TOP_GEMINI_BUDGET       (durable daily cap for gemini; default 150)
 */

import { config } from "dotenv";
import { resolve } from "path";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { encode } from "blurhash";

// Load environment (Next.js convention: .env.local first, then .env).
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

import { CACHE_TTL } from "../src/lib/cache-config";
import {
  POPULAR_DESTINATIONS,
  buildLandmarkQuery,
  landmarkHintsFor,
  mergePriorityLists,
} from "../src/lib/warm-priority";

// ============================================================================
// Types & configuration
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

interface StoredPlace {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  types?: string[];
  googleMapsUri?: string;
  priceLevel?: string;
  location?: { latitude?: number; longitude?: number };
  imageUrl?: string;
  blurhash?: string;
  photos?: { name?: string }[];
}

const PLACE_TYPES = ["landmarks", "restaurants", "hotels"] as const;
type PlaceType = (typeof PLACE_TYPES)[number];

const BUCKET = "place_images";
const IMAGE_MAX_WIDTH = 800;
const IMAGE_MAX_HEIGHT = 600;
const BLURHASH_COMPONENT_X = 4;
const BLURHASH_COMPONENT_Y = 3;
const PLACE_IMAGE_BATCH_SIZE = 6;

const PLACES_FRESH_DAYS = CACHE_TTL.PLACES_SOFT_REFRESH_DAYS;
const INSIGHTS_FRESH_DAYS = CACHE_TTL.INSIGHTS_FRESH_DAYS - 35;
const WEATHER_FRESH_MINUTES = CACHE_TTL.WEATHER_FRESH_MINUTES - 10;
const METRICS_FRESH_MINUTES = CACHE_TTL.METRICS_FRESH_MINUTES - 10;

const PLACES_FIELD_MASK = [
  "places.displayName",
  "places.formattedAddress",
  "places.id",
  "places.rating",
  "places.userRatingCount",
  "places.types",
  "places.googleMapsUri",
  "places.priceLevel",
  "places.location",
  "places.photos",
].join(",");

function primaryQuery(cityName: string, type: PlaceType, country?: string): string {
  switch (type) {
    case "landmarks":
      // Curated cities name their iconic POIs so the Places response (and
      // the photo cache built from it) anchors on what users search for.
      // Same request count — relevance only, zero extra spend.
      return buildLandmarkQuery(cityName, landmarkHintsFor(cityName, country));
    case "restaurants":
      return `Best restaurants, local food, street food, and cheap eats in ${cityName}`;
    case "hotels":
      return `Top rated hotels, hostels, guest houses, and budget stays in ${cityName}`;
  }
}

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
// CLI args
// ============================================================================

interface CliArgs {
  limit: number;
  imagesPerType: number;
  concurrency: number;
  ai: boolean;
  photos: boolean;
  metrics: boolean;
  dryRun: boolean;
  help: boolean;
  /** false → legacy pure population ordering (--population-only). */
  priority: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {
    limit: 50,
    imagesPerType: 6,
    concurrency: 3,
    ai: true,
    photos: true,
    metrics: false,
    dryRun: false,
    help: false,
    priority: true,
  };

  for (const arg of args) {
    if (arg === "--help" || arg === "-h") result.help = true;
    else if (arg.startsWith("--limit=")) result.limit = parseInt(arg.split("=")[1], 10) || 50;
    else if (arg.startsWith("--images-per-type="))
      result.imagesPerType = parseInt(arg.split("=")[1], 10) || 6;
    else if (arg.startsWith("--concurrency="))
      result.concurrency = parseInt(arg.split("=")[1], 10) || 3;
    else if (arg === "--no-ai") result.ai = false;
    else if (arg === "--no-photos") result.photos = false;
    else if (arg === "--metrics") result.metrics = true;
    else if (arg === "--dry-run") result.dryRun = true;
    else if (arg === "--population-only") result.priority = false;
  }

  return result;
}

function showHelp(): void {
  console.log(`
Warm Top-Cities CLI for BestCitySpots
=====================================
Warms places (+ photos), weather, and AI insights for N cities, prioritized
by real visitor demand (Supabase analytics) → researched global popularity
→ population. See file header for the full option list.

  npx tsx scripts/warm-top-cities.ts --limit=50
  npx tsx scripts/warm-top-cities.ts --limit=50 --dry-run
  npx tsx scripts/warm-top-cities.ts --limit=25 --no-ai --metrics
  npx tsx scripts/warm-top-cities.ts --population-only   # legacy ordering
`);
}

// ============================================================================
// Supabase
// ============================================================================

function createSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function getTopCitiesByPopulation(supabase: SupabaseClient, limit: number): Promise<City[]> {
  const { data, error } = await supabase
    .from("cities")
    .select("id, city, city_ascii, country, lat, lng, population, admin_name")
    .order("population", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) {
    console.error("Error fetching top cities:", error.message);
    return [];
  }
  return (data || []) as City[];
}

/**
 * Supabase insights: cities YOUR visitors opened most in the last `days`.
 * Queried at warm time so every nightly run re-prioritizes on real demand.
 * Analytics are aggregate-only (privacy-first) — city_id + counters.
 */
async function getMostViewedCities(
  supabase: SupabaseClient,
  days: number,
  limit: number
): Promise<City[]> {
  const from = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("city_views_daily")
    .select("city_id, views")
    .gte("stat_date", from);
  if (error || !data || data.length === 0) {
    if (error) console.warn("  [priority] city_views_daily unavailable:", error.message);
    return [];
  }

  const totals = new Map<number, number>();
  for (const row of data as Array<{ city_id: number; views: number | null }>) {
    totals.set(row.city_id, (totals.get(row.city_id) ?? 0) + (row.views ?? 0));
  }
  const rankedIds = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);
  if (rankedIds.length === 0) return [];

  const { data: cityRows, error: cityError } = await supabase
    .from("cities")
    .select("id, city, city_ascii, country, lat, lng, population, admin_name")
    .in("id", rankedIds);
  if (cityError || !cityRows) return [];

  const byId = new Map((cityRows as City[]).map((c) => [c.id, c]));
  return rankedIds.map((id) => byId.get(id)).filter((c): c is City => Boolean(c));
}

/**
 * Predicted demand: resolve the researched globally-popular destinations
 * (Euromonitor arrivals + attraction magnets — see src/lib/warm-priority.ts)
 * against the cities table. Order preserved from the curated ranking.
 */
async function getCuratedPopularCities(supabase: SupabaseClient): Promise<City[]> {
  const names = POPULAR_DESTINATIONS.map((d) => d.city);
  const { data, error } = await supabase
    .from("cities")
    .select("id, city, city_ascii, country, lat, lng, population, admin_name")
    .in("city_ascii", names);
  if (error || !data) {
    if (error) console.warn("  [priority] curated lookup failed:", error.message);
    return [];
  }
  const rows = data as City[];
  const resolved: City[] = [];
  for (const destination of POPULAR_DESTINATIONS) {
    const match = rows.find(
      (row) =>
        row.city_ascii.toLowerCase() === destination.city.toLowerCase() &&
        row.country.toLowerCase().includes(destination.country.toLowerCase())
    );
    if (match) resolved.push(match);
  }
  return resolved;
}

/**
 * The warm list: demand (your analytics) → predicted (researched popularity)
 * → reach (population). Dedupes to `limit`.
 */
async function buildPriorityCityList(supabase: SupabaseClient, limit: number): Promise<City[]> {
  const [mostViewed, curated, byPopulation] = await Promise.all([
    getMostViewedCities(supabase, 30, limit),
    getCuratedPopularCities(supabase),
    getTopCitiesByPopulation(supabase, limit),
  ]);
  const merged = mergePriorityLists(mostViewed, curated, byPopulation, limit);
  console.log(
    `Priority mix: ${mostViewed.length} analytics-demand + ${curated.length} curated-popular ` +
      `+ population fallback → ${merged.length} cities to warm`
  );
  return merged;
}

// ============================================================================
// Durable budget (shared with the web app via public.claim_provider_use)
// ============================================================================

function parseBudget(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

const BUDGETS = {
  "google-places": parseBudget(process.env.WARM_TOP_PLACES_BUDGET, 1500),
  gemini: parseBudget(process.env.WARM_TOP_GEMINI_BUDGET, 150),
  openai: parseBudget(process.env.WARM_TOP_OPENAI_BUDGET, 150),
} as const;

const exhausted = new Set<keyof typeof BUDGETS>();

/** Atomic claim against the shared daily counter. Fails closed. */
async function claimBudget(
  supabase: SupabaseClient,
  provider: keyof typeof BUDGETS
): Promise<boolean> {
  if (exhausted.has(provider)) return false;
  const { data, error } = await supabase.rpc("claim_provider_use", {
    p_provider: provider,
    p_day: new Date().toISOString().slice(0, 10),
    // eslint-disable-next-line security/detect-object-injection -- provider is a typed union key
    p_limit: BUDGETS[provider],
  });
  if (error) {
    console.error(`    [budget] ${provider} claim failed: ${error.message} — failing closed`);
    exhausted.add(provider);
    return false;
  }
  if (data !== true) {
    console.warn(`    [budget] ${provider} daily budget exhausted — skipping remaining calls`);
    exhausted.add(provider);
    return false;
  }
  return true;
}

// ============================================================================
// Image pipeline (photo fetch → BlurHash → Supabase Storage)
// ============================================================================

let supabaseUrlCache: string | undefined;
function publicImageUrl(placeId: string): string {
  supabaseUrlCache ||= process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${supabaseUrlCache}/storage/v1/object/public/${BUCKET}/${placeId}.jpg`;
}

async function generateBlurhash(buffer: ArrayBuffer): Promise<string> {
  try {
    const { data, info } = await sharp(Buffer.from(buffer))
      .resize(32, 32, { fit: "inside" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    return encode(
      new Uint8ClampedArray(data),
      info.width,
      info.height,
      BLURHASH_COMPONENT_X,
      BLURHASH_COMPONENT_Y
    );
  } catch (e) {
    console.warn("    [image] blurhash failed:", e instanceof Error ? e.message : e);
    return "";
  }
}

/**
 * Download a Google Places photo, encode a BlurHash, upload to Storage.
 * Skips the download if the object already exists. Each fetch claims one
 * google-places budget unit. Returns the place's imageUrl/blurhash, if any.
 */
async function resolvePlaceImage(
  supabase: SupabaseClient,
  placeId: string,
  photoName: string
): Promise<{ imageUrl: string; blurhash: string } | undefined> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return undefined;
  const publicUrl = publicImageUrl(placeId);

  // Already uploaded? Reuse it (compute blurhash from the stored bytes).
  try {
    const head = await fetch(publicUrl, { method: "HEAD", signal: AbortSignal.timeout(5_000) });
    if (head.ok) {
      const existing = await fetch(publicUrl, { signal: AbortSignal.timeout(10_000) });
      if (existing.ok) {
        return {
          imageUrl: publicUrl,
          blurhash: await generateBlurhash(await existing.arrayBuffer()),
        };
      }
      return { imageUrl: publicUrl, blurhash: "" };
    }
  } catch {
    // fall through to fetch from Google
  }

  if (!(await claimBudget(supabase, "google-places"))) return undefined;

  try {
    const url =
      `https://places.googleapis.com/v1/${photoName}/media` +
      `?maxWidthPx=${IMAGE_MAX_WIDTH}&maxHeightPx=${IMAGE_MAX_HEIGHT}&key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return undefined;
    const bytes = await res.arrayBuffer();
    const blurhash = await generateBlurhash(bytes);
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(`${placeId}.jpg`, bytes, { contentType: "image/jpeg", upsert: true });
    if (error) {
      console.warn(`    [image] upload failed for ${placeId}: ${error.message}`);
      return undefined;
    }
    return { imageUrl: publicUrl, blurhash };
  } catch (e) {
    console.warn(`    [image] fetch failed for ${placeId}:`, e instanceof Error ? e.message : e);
    return undefined;
  }
}

// ============================================================================
// Freshness checks
// ============================================================================

function ageDays(updatedAt: string): number {
  return (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24);
}
function ageMinutes(updatedAt: string): number {
  return (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60);
}

/** Places are "done" only when fresh AND carrying images (the gap we fill). */
async function placesNeedWarm(
  supabase: SupabaseClient,
  cityName: string,
  type: PlaceType,
  imagesWanted: number
): Promise<boolean> {
  const { data } = await supabase
    .from("city_places_cache")
    .select("places_data, updated_at")
    .eq("city_name", cityName)
    .eq("place_type", type)
    .maybeSingle();

  if (!data?.updated_at) return true;
  if (ageDays(data.updated_at) >= PLACES_FRESH_DAYS) return true;

  const places = (data.places_data || []) as StoredPlace[];
  if (places.length === 0) return true;
  if (imagesWanted <= 0) return false;
  const withImages = places.filter((p) => typeof p.imageUrl === "string" && p.imageUrl.length > 0);
  const target = Math.min(imagesWanted, places.length);
  return withImages.length < target;
}

// ============================================================================
// Warmers
// ============================================================================

interface WarmOutcome {
  warmed: boolean;
  cached: boolean;
  error: boolean;
  images?: number;
}

async function warmPlaces(
  supabase: SupabaseClient,
  city: City,
  type: PlaceType,
  opts: { dryRun: boolean; photos: boolean; imagesPerType: number }
): Promise<WarmOutcome> {
  if (!(await placesNeedWarm(supabase, city.city, type, opts.photos ? opts.imagesPerType : 0))) {
    return { warmed: false, cached: true, error: false };
  }
  if (opts.dryRun) return { warmed: true, cached: false, error: false };

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error("    Error: GOOGLE_PLACES_API_KEY not set");
    return { warmed: false, cached: false, error: true };
  }
  if (!(await claimBudget(supabase, "google-places"))) {
    return { warmed: false, cached: false, error: false };
  }

  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": PLACES_FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery: primaryQuery(city.city, type, city.country),
        maxResultCount: 20,
        locationBias: {
          circle: { center: { latitude: city.lat, longitude: city.lng }, radius: 50000 },
        },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      console.error(`    Error: Places API ${res.status} for ${city.city}/${type}`);
      return { warmed: false, cached: false, error: true };
    }

    const body = (await res.json()) as { places?: StoredPlace[] };
    const places = body.places ?? [];
    if (places.length === 0) {
      return { warmed: false, cached: false, error: false };
    }

    // Enrich the top places by review count (the primary UI ordering).
    let imageCount = 0;
    if (opts.photos && opts.imagesPerType > 0) {
      const targets = [...places]
        .sort((a, b) => (b.userRatingCount ?? 0) - (a.userRatingCount ?? 0))
        .slice(0, opts.imagesPerType)
        .filter((p) => p.id && p.photos?.[0]?.name);

      for (let i = 0; i < targets.length; i += PLACE_IMAGE_BATCH_SIZE) {
        const batch = targets.slice(i, i + PLACE_IMAGE_BATCH_SIZE);
        await Promise.all(
          batch.map(async (place) => {
            const photoName = place.photos?.[0]?.name;
            if (!photoName) return;
            const result = await resolvePlaceImage(supabase, place.id, photoName);
            if (result) {
              place.imageUrl = result.imageUrl;
              place.blurhash = result.blurhash;
              imageCount += 1;
            }
          })
        );
      }
    }

    // Drop the bulky photo metadata before caching (matches the app).
    for (const place of places) delete place.photos;

    const { error } = await supabase.from("city_places_cache").upsert(
      {
        city_name: city.city,
        place_type: type,
        places_data: places,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "city_name,place_type" }
    );
    if (error) {
      console.error(`    Error caching ${city.city}/${type}: ${error.message}`);
      return { warmed: false, cached: false, error: true };
    }

    return { warmed: true, cached: false, error: false, images: imageCount };
  } catch (e) {
    console.error(`    Error warming ${city.city}/${type}:`, e instanceof Error ? e.message : e);
    return { warmed: false, cached: false, error: true };
  }
}

async function warmWeather(
  supabase: SupabaseClient,
  city: City,
  dryRun: boolean
): Promise<WarmOutcome> {
  const { data } = await supabase
    .from("city_weather_cache")
    .select("updated_at")
    .eq("city_id", city.id)
    .maybeSingle();
  if (data?.updated_at && ageMinutes(data.updated_at) < WEATHER_FRESH_MINUTES) {
    return { warmed: false, cached: true, error: false };
  }
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

    const weather = (await weatherRes.json()) as {
      main?: {
        temp?: number;
        feels_like?: number;
        temp_min?: number;
        temp_max?: number;
        humidity?: number;
      };
      weather?: { description?: string; icon?: string }[];
      wind?: { speed?: number };
    };
    const aqiData = (await aqiRes.json()) as { list?: { main?: { aqi?: number } }[] };
    const aqiValue = aqiData.list?.[0]?.main?.aqi ?? 0;

    await supabase.from("city_weather_cache").upsert(
      {
        city_id: city.id,
        temp: weather.main?.temp ?? 0,
        feels_like: weather.main?.feels_like ?? 0,
        temp_min: weather.main?.temp_min ?? 0,
        temp_max: weather.main?.temp_max ?? 0,
        humidity: weather.main?.humidity ?? 0,
        description: weather.weather?.[0]?.description ?? "unknown",
        icon: weather.weather?.[0]?.icon ?? "",
        wind_speed: weather.wind?.speed ?? 0,
        aqi: aqiValue,
        aqi_label: getAqiLabel(aqiValue),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "city_id" }
    );
    return { warmed: true, cached: false, error: false };
  } catch (e) {
    console.error("    Error warming weather:", e instanceof Error ? e.message : e);
    return { warmed: false, cached: false, error: true };
  }
}

async function warmMetrics(
  supabase: SupabaseClient,
  city: City,
  dryRun: boolean
): Promise<WarmOutcome> {
  const { data } = await supabase
    .from("city_metrics")
    .select("updated_at")
    .eq("city_id", city.id)
    .maybeSingle();
  if (data?.updated_at && ageMinutes(data.updated_at) < METRICS_FRESH_MINUTES) {
    return { warmed: false, cached: true, error: false };
  }
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
      const aq = (await aqRes.json()) as { hourly?: { pm2_5?: number[] } };
      const vals = aq.hourly?.pm2_5;
      if (vals?.length) pm25 = vals[vals.length - 1] ?? null;
    }
    if (tempRes.ok) {
      const w = (await tempRes.json()) as { current?: { temperature_2m?: number } };
      const t = w.current?.temperature_2m;
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
  } catch (e) {
    console.error("    Error warming metrics:", e instanceof Error ? e.message : e);
    return { warmed: false, cached: false, error: true };
  }
}

// AI provider for insights: matches the app's AI_PROVIDER (default openai).
const AI_PROVIDER =
  (process.env.AI_PROVIDER || "openai").toLowerCase() === "gemini" ? "gemini" : "openai";
const OPENAI_MODEL = "gpt-4o-mini";
const GEMINI_MODEL = "gemini-3-flash-preview";

function insightsPrompt(city: City): string {
  return `
You are a concise travel curator. Summarize ${city.city}, ${city.country}.
Return ONLY a JSON object with keys:
{
  "intro": "≤500 characters, vivid city intro",
  "attractions": [{ "name": "spot", "why": "1 short sentence" }],
  "seasons": [{ "name": "Spring", "months": "Mar-May", "summary": "advice" }],
  "weather": [{ "season": "Spring", "tempC": "range°C", "notes": "tip" }]
}
Do not include code fences or markdown.`.trim();
}

/**
 * Generate the insights JSON text via the configured provider. Claims one
 * unit from that provider's durable daily budget. Returns null on failure
 * (caller records an error) or undefined when the budget is exhausted.
 */
async function generateInsightsText(
  supabase: SupabaseClient,
  prompt: string
): Promise<string | null | undefined> {
  if (AI_PROVIDER === "openai") {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("    Error: OPENAI_API_KEY not set (skip with --no-ai)");
      return null;
    }
    if (!(await claimBudget(supabase, "openai"))) return undefined;
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      console.error(`    Error: OpenAI API ${res.status}`);
      return null;
    }
    const payload = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return payload.choices?.[0]?.message?.content ?? null;
  }

  // Gemini path
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    console.error("    Error: GOOGLE_GEMINI_API_KEY not set (skip with --no-ai)");
    return null;
  }
  if (!(await claimBudget(supabase, "gemini"))) return undefined;
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: GEMINI_MODEL });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

async function warmInsights(
  supabase: SupabaseClient,
  city: City,
  dryRun: boolean
): Promise<WarmOutcome> {
  const { data } = await supabase
    .from("city_ai_insights")
    .select("updated_at")
    .eq("city_id", city.id)
    .maybeSingle();
  if (data?.updated_at && ageDays(data.updated_at) < INSIGHTS_FRESH_DAYS) {
    return { warmed: false, cached: true, error: false };
  }
  if (dryRun) return { warmed: true, cached: false, error: false };

  try {
    const text = await generateInsightsText(supabase, insightsPrompt(city));
    if (text === undefined) return { warmed: false, cached: false, error: false }; // budget exhausted
    if (!text) return { warmed: false, cached: false, error: true };

    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error(`Invalid JSON from ${AI_PROVIDER}`);
    const parsed = JSON.parse(text.slice(start, end + 1)) as {
      intro?: string;
      attractions?: unknown[];
      seasons?: unknown[];
      weather?: unknown[];
    };

    const { error } = await supabase.from("city_ai_insights").upsert(
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
    if (error) {
      console.error(`    Error caching insights for ${city.city}: ${error.message}`);
      return { warmed: false, cached: false, error: true };
    }
    return { warmed: true, cached: false, error: false };
  } catch (e) {
    console.error("    Error warming insights:", e instanceof Error ? e.message : e);
    return { warmed: false, cached: false, error: true };
  }
}

// ============================================================================
// Orchestration
// ============================================================================

interface Stats {
  placesWarmed: number;
  placesCached: number;
  placesErrors: number;
  imagesUploaded: number;
  insightsWarmed: number;
  insightsCached: number;
  insightsErrors: number;
  weatherWarmed: number;
  weatherCached: number;
  weatherErrors: number;
  metricsWarmed: number;
  metricsCached: number;
  metricsErrors: number;
}

function blankStats(): Stats {
  return {
    placesWarmed: 0,
    placesCached: 0,
    placesErrors: 0,
    imagesUploaded: 0,
    insightsWarmed: 0,
    insightsCached: 0,
    insightsErrors: 0,
    weatherWarmed: 0,
    weatherCached: 0,
    weatherErrors: 0,
    metricsWarmed: 0,
    metricsCached: 0,
    metricsErrors: 0,
  };
}

function tally(stats: Stats, key: "places" | "insights" | "weather" | "metrics", o: WarmOutcome) {
  if (o.cached) stats[`${key}Cached`] += 1;
  else if (o.warmed) stats[`${key}Warmed`] += 1;
  else if (o.error) stats[`${key}Errors`] += 1;
  if (o.images) stats.imagesUploaded += o.images;
}

async function warmCity(
  supabase: SupabaseClient,
  city: City,
  args: CliArgs,
  stats: Stats,
  index: number,
  total: number
): Promise<void> {
  console.log(`\n[${index + 1}/${total}] ${city.city}, ${city.country}`);

  const placeResults = await Promise.all(
    PLACE_TYPES.map((pt) =>
      warmPlaces(supabase, city, pt, {
        dryRun: args.dryRun,
        photos: args.photos,
        imagesPerType: args.imagesPerType,
      }).then((r) => ({ type: pt, ...r }))
    )
  );
  const placeLabels = placeResults.map((r) => {
    tally(stats, "places", r);
    if (r.cached) return `${r.type}: cached`;
    if (r.warmed)
      return `${r.type}: ${args.dryRun ? "would warm" : "warmed"}${r.images ? ` (+${r.images} img)` : ""}`;
    if (r.error) return `${r.type}: error`;
    return `${r.type}: skipped`;
  });
  console.log(`  Places: ${placeLabels.join(", ")}`);

  const parallel: Promise<void>[] = [];
  parallel.push(
    warmWeather(supabase, city, args.dryRun).then((r) => {
      tally(stats, "weather", r);
      console.log(
        `  Weather: ${r.cached ? "cached" : r.warmed ? (args.dryRun ? "would warm" : "warmed") : "error"}`
      );
    })
  );
  if (args.metrics) {
    parallel.push(
      warmMetrics(supabase, city, args.dryRun).then((r) => {
        tally(stats, "metrics", r);
        console.log(
          `  Metrics: ${r.cached ? "cached" : r.warmed ? (args.dryRun ? "would warm" : "warmed") : "error"}`
        );
      })
    );
  }
  if (args.ai) {
    parallel.push(
      warmInsights(supabase, city, args.dryRun).then((r) => {
        tally(stats, "insights", r);
        console.log(
          `  Insights: ${r.cached ? "cached" : r.warmed ? (args.dryRun ? "would warm" : "warmed") : "error"}`
        );
      })
    );
  }
  await Promise.all(parallel);
}

function printSummary(stats: Stats, startTime: number, dryRun: boolean): void {
  const secs = Math.round((Date.now() - startTime) / 1000);
  console.log(`
================================================================================
Summary${dryRun ? " (DRY RUN)" : ""}
================================================================================
Places:    ${stats.placesWarmed} warmed | ${stats.placesCached} cached | ${stats.placesErrors} errors
Photos:    ${stats.imagesUploaded} image(s) uploaded
Insights:  ${stats.insightsWarmed} warmed | ${stats.insightsCached} cached | ${stats.insightsErrors} errors
Weather:   ${stats.weatherWarmed} warmed | ${stats.weatherCached} cached | ${stats.weatherErrors} errors
Metrics:   ${stats.metricsWarmed} warmed | ${stats.metricsCached} cached | ${stats.metricsErrors} errors
Duration:  ${secs}s
================================================================================
`);
}

async function main(): Promise<void> {
  const args = parseArgs();
  if (args.help) {
    showHelp();
    process.exit(0);
  }

  console.log(`
================================================================================
Warm Top-Cities CLI
================================================================================
Top cities (by population): ${args.limit}
Warming: places${args.photos ? " + photos" : ""}, weather${args.ai ? `, ai insights (${AI_PROVIDER})` : ""}${args.metrics ? ", metrics" : ""}
Images per category: ${args.photos ? args.imagesPerType : "off"}
Concurrency: ${args.concurrency}
Budgets: google-places=${BUDGETS["google-places"]}, ${AI_PROVIDER}=${AI_PROVIDER === "openai" ? BUDGETS.openai : BUDGETS.gemini}
${args.dryRun ? "DRY RUN — no API calls, no writes" : ""}
`);

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error("Error: NEXT_PUBLIC_SUPABASE_URL not set");
    process.exit(1);
  }
  if (!args.dryRun && !process.env.GOOGLE_PLACES_API_KEY) {
    console.error("Error: GOOGLE_PLACES_API_KEY required (places/photos)");
    process.exit(1);
  }
  if (args.ai && !args.dryRun) {
    const haveKey =
      AI_PROVIDER === "openai" ? process.env.OPENAI_API_KEY : process.env.GOOGLE_GEMINI_API_KEY;
    const needKey = AI_PROVIDER === "openai" ? "OPENAI_API_KEY" : "GOOGLE_GEMINI_API_KEY";
    if (!haveKey) {
      console.error(
        `Error: ${needKey} required for AI insights via ${AI_PROVIDER} (or pass --no-ai)`
      );
      process.exit(1);
    }
  }

  const supabase = createSupabaseClient();
  const startTime = Date.now();

  const cities = args.priority
    ? await buildPriorityCityList(supabase, args.limit)
    : await getTopCitiesByPopulation(supabase, args.limit);
  if (cities.length === 0) {
    console.error("Error: no cities found to warm");
    process.exit(1);
  }
  console.log(`Resolved ${cities.length} cities.\nWarming...`);

  const stats = blankStats();
  for (let i = 0; i < cities.length; i += args.concurrency) {
    const batch = cities.slice(i, i + args.concurrency);
    await Promise.all(
      batch.map((city, bi) => warmCity(supabase, city, args, stats, i + bi, cities.length))
    );
    if (!args.dryRun && i + args.concurrency < cities.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  printSummary(stats, startTime, args.dryRun);

  const attempts =
    stats.placesWarmed +
    stats.placesCached +
    stats.placesErrors +
    stats.insightsWarmed +
    stats.insightsCached +
    stats.insightsErrors +
    stats.weatherWarmed +
    stats.weatherCached +
    stats.weatherErrors;
  const errors =
    stats.placesErrors + stats.insightsErrors + stats.weatherErrors + stats.metricsErrors;
  if (attempts > 0 && errors / attempts > 0.1) {
    console.error(`Error rate ${((errors / attempts) * 100).toFixed(1)}% exceeds 10% threshold`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

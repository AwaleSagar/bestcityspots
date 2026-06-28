import "server-only";
import { supabase, requireServerClient } from "./supabase";
import { City } from "./cities";
import { z } from "zod";
import {
  generateText,
  sanitizeJsonResponse,
  sanitizeJsonArrayResponse,
  PROMPT_VERSIONS,
} from "./providers/ai";
import { isCacheFresh, CACHE_TIERS } from "./cache-config";
import { createLogger } from "./logger";
import {
  readCityInsightCache,
  writeCityInsightCache,
} from "@/platform/data-access/city-insights-repository";

export { PROMPT_VERSIONS } from "./providers/ai";

/**
 * Canonical prompt for a single-city AI briefing. Exported so the streaming
 * route handler and the batch (non-streaming) helper share a single source
 * of truth — bumping `PROMPT_VERSIONS.CITY_INSIGHT` together with this
 * template invalidates cached rows automatically.
 */
export function buildCityInsightPrompt(city: Pick<City, "city" | "country">): string {
  return `
    You are a concise travel curator. Summarize ${city.city}, ${city.country}.
    Return ONLY a JSON object with keys:
    {
      "intro": "\u2264500 characters, vivid city intro",
      "attractions": [{ "name": "spot", "why": "1 short sentence" }],
      "seasons": [{ "name": "Spring", "months": "Mar-May", "summary": "advice" }],
      "weather": [{ "season": "Spring", "tempC": "range\u00b0C", "notes": "tip" }]
    }
  `;
}

const log = createLogger({ component: "intelligence" });

// Module-scope schema reused across calls (no re-allocation per request).
const TrendingCitiesSchema = z.array(z.string().min(1).max(100));

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

const CityInsightSchema = z.object({
  intro: z.string().max(600),
  attractions: z.array(AttractionSchema),
  seasons: z.array(SeasonSchema),
  weather: z.array(WeatherSchema),
});

export type CityInsight = z.infer<typeof CityInsightSchema>;

export { CityInsightSchema };

/**
 * Result of a cache-only read. Used by the streaming pipeline to fast-path
 * fresh hits and to surface a stale fallback for clients to render while a
 * fresh response streams in.
 */
export interface CachedCityInsightRead {
  insight: CityInsight | null;
  fresh: boolean;
  updatedAt: string | null;
}

/**
 * Cache-only variant of `getCityInsight`. Never calls Gemini. Returned
 * `fresh` is true only when the row exists, parses, has a matching
 * `prompt_version`, and is within `CACHE_TIERS.INSIGHTS.freshMs`.
 */
export async function readCachedCityInsight(cityId: number): Promise<CachedCityInsightRead> {
  try {
    const cached = await readCityInsightCache(cityId);

    if (!cached) return { insight: null, fresh: false, updatedAt: null };

    const candidate = {
      intro: (cached.intro || "").slice(0, 600),
      attractions: cached.attractions || [],
      seasons: cached.seasons || [],
      weather: cached.weather || [],
    };
    const parsed = CityInsightSchema.safeParse(candidate);
    const insight = parsed.success ? parsed.data : null;
    const cachedVersion = typeof cached.prompt_version === "number" ? cached.prompt_version : null;
    const versionMatches = cachedVersion === null || cachedVersion === PROMPT_VERSIONS.CITY_INSIGHT;
    const fresh =
      !!insight && versionMatches && isCacheFresh(cached.updated_at, CACHE_TIERS.INSIGHTS.freshMs);
    return { insight, fresh, updatedAt: cached.updated_at ?? null };
  } catch (e) {
    log.warn("cache_read_failed", {
      cityId,
      error: e instanceof Error ? e.message : String(e),
    });
    return { insight: null, fresh: false, updatedAt: null };
  }
}

/**
 * Fire-and-forget upsert of a freshly generated insight. Centralised so the
 * streaming and batch paths share write semantics.
 */
export function upsertCityInsight(city: City, insight: CityInsight): void {
  void writeCityInsightCache(city.id, {
    city_name: city.city,
    country: city.country,
    ...insight,
    prompt_version: PROMPT_VERSIONS.CITY_INSIGHT,
    updated_at: new Date().toISOString(),
  }).catch((error) => {
    log.warn("cache_write_failed", {
      cityId: city.id,
      error: error instanceof Error ? error.message : String(error),
    });
  });
}

/**
 * Stale-While-Revalidate fetch for a city's AI-generated insight.
 *
 * Behavior:
 *  - Read the cached row (if any). If fresh AND the stored `prompt_version`
 *    matches `PROMPT_VERSIONS.CITY_INSIGHT`, return it as-is.
 *  - Otherwise call Gemini. On success, Zod-validate, return, and
 *    fire-and-forget a cache upsert with the current prompt version.
 *  - On any Gemini failure (auth, parse, Zod, exception), fall back to the
 *    cached (stale) row if one can be parsed — this matters for reliability
 *    more than freshness.
 */
export async function getCityInsight(city: City): Promise<CityInsight | null> {
  // 1) Cache-first read with stale fallback semantics.
  const cacheRead = await readCachedCityInsight(city.id);
  if (cacheRead.fresh && cacheRead.insight) return cacheRead.insight;
  const cachedInsight = cacheRead.insight;

  // 2) Call the AI. Any failure path below falls through to the stale cache.
  const prompt = buildCityInsightPrompt(city);
  const aiResult = await generateText(prompt);
  if (!aiResult.ok) {
    log.warn("ai_unavailable", { cityId: city.id, reason: aiResult.reason });
    return cachedInsight; // Stale cache is better than nothing.
  }

  let parsed: CityInsight;
  try {
    const rawJson = sanitizeJsonResponse(aiResult.text);
    parsed = CityInsightSchema.parse(JSON.parse(rawJson));
  } catch (e) {
    log.warn("ai_parse_failed", {
      cityId: city.id,
      correlationId: aiResult.correlationId,
      error: e instanceof Error ? e.message : String(e),
    });
    return cachedInsight;
  }

  // 3) Fire-and-forget cache write with the current prompt_version.
  upsertCityInsight(city, parsed);

  return parsed;
}

/**
 * AI-driven trending destinations. Cached 24 h. On AI failure, returns any
 * matched-in-DB cities for the last known name list (graceful degradation).
 */
export async function getIntelligentTrendingCities(): Promise<City[]> {
  // 1) Read cache first.
  let cachedNames: string[] = [];
  let cachedUpdatedAt: string | null = null;
  let cachedVersion: number | null = null;
  try {
    const { data: cache } = await supabase
      .from("ai_trending_cache")
      .select("city_names, updated_at, prompt_version")
      .eq("id", 1)
      .maybeSingle();
    if (cache) {
      cachedNames = Array.isArray(cache.city_names) ? cache.city_names : [];
      cachedUpdatedAt = cache.updated_at ?? null;
      cachedVersion = typeof cache.prompt_version === "number" ? cache.prompt_version : null;
      const versionMatches =
        cachedVersion === null || cachedVersion === PROMPT_VERSIONS.TRENDING_CITIES;
      if (
        versionMatches &&
        isCacheFresh(cachedUpdatedAt, CACHE_TIERS.TRENDING.freshMs) &&
        cachedNames.length > 0
      ) {
        return await matchCitiesInDb(cachedNames);
      }
    }
  } catch (e) {
    log.warn("trending_cache_read_failed", { error: e instanceof Error ? e.message : String(e) });
  }

  // 2) Call AI.
  const prompt = `
    List 8 world cities that are currently trending for travelers in 2026. 
    Consider seasonal events, major sports, or emerging travel hotspots.
    Return ONLY a JSON array of strings in the format "City, Country" so the
    pair can be uniquely identified (e.g. ambiguous names like Springfield).
    Example: ["Tokyo, Japan", "Paris, France", "Seoul, South Korea"]
  `;
  const aiResult = await generateText(prompt);
  if (!aiResult.ok) {
    log.warn("trending_ai_unavailable", { reason: aiResult.reason });
    return cachedNames.length > 0 ? await matchCitiesInDb(cachedNames) : [];
  }

  let cityNames: string[];
  try {
    const cleaned = sanitizeJsonArrayResponse(aiResult.text);
    cityNames = TrendingCitiesSchema.parse(JSON.parse(cleaned));
  } catch (e) {
    log.warn("trending_parse_failed", {
      correlationId: aiResult.correlationId,
      error: e instanceof Error ? e.message : String(e),
    });
    return cachedNames.length > 0 ? await matchCitiesInDb(cachedNames) : [];
  }

  // 3) Cache update (fire-and-forget) with prompt_version.
  let cacheClient;
  try {
    cacheClient = requireServerClient();
  } catch (e) {
    log.warn("trending_cache_write_skipped", {
      error: e instanceof Error ? e.message : String(e),
    });
    return await matchCitiesInDb(cityNames);
  }
  cacheClient
    .from("ai_trending_cache")
    .upsert({
      id: 1,
      city_names: cityNames,
      prompt_version: PROMPT_VERSIONS.TRENDING_CITIES,
      updated_at: new Date().toISOString(),
    })
    .then(({ error }: { error: unknown }) => {
      if (error) log.warn("trending_cache_write_failed", { error: String(error) });
    });

  return await matchCitiesInDb(cityNames);
}

async function matchCitiesInDb(cityNames: string[]): Promise<City[]> {
  // Inputs may be "City" (legacy / pre-v3 cache) or "City, Country" (v3+).
  // Build a list of (city, country?) pairs and resolve uniquely when country
  // is present so non-unique names (Springfield, Paris, etc.) don't collide.
  const pairs = cityNames
    .map((entry) => {
      const [cityRaw, ...rest] = entry.split(",");
      const city = (cityRaw || "").trim();
      const country = rest.join(",").trim() || null;
      return city ? { city, country } : null;
    })
    .filter((p): p is { city: string; country: string | null } => p !== null);

  if (pairs.length === 0) return [];
  const uniqueCityNames = Array.from(new Set(pairs.map((p) => p.city)));

  try {
    const { data: matchedCities, error } = await supabase
      .from("cities")
      .select(
        "id, city, city_ascii, country, iso2, iso3, admin_name, capital, population, lat, lng"
      )
      .in("city", uniqueCityNames)
      .order("population", { ascending: false });
    if (error) {
      log.warn("match_cities_failed", { error: error.message });
      return [];
    }
    const rows = (matchedCities as City[]) || [];

    // For each requested pair, prefer an exact (city, country) match; else
    // fall back to the most populous city with that name.
    const seen = new Set<number>();
    const resolved: City[] = [];
    for (const pair of pairs) {
      const candidates = rows.filter((r) => r.city === pair.city);
      if (candidates.length === 0) continue;
      const exact = pair.country
        ? candidates.find((r) => r.country.toLowerCase() === (pair.country as string).toLowerCase())
        : null;
      const pick = exact ?? candidates[0];
      if (!seen.has(pick.id)) {
        seen.add(pick.id);
        resolved.push(pick);
      }
      if (resolved.length >= 5) break;
    }
    return resolved;
  } catch (e) {
    log.warn("match_cities_exception", { error: e instanceof Error ? e.message : String(e) });
    return [];
  }
}

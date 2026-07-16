import "server-only";
import { supabaseServer } from "./supabase";
import { rankingEngine } from "./ranking";
import { haversineKm } from "./geo";
import sharp from "sharp";
import { encode } from "blurhash";
import { CACHE_TTL } from "./cache-config";
import { publicEnv, serverEnv } from "./env";
import {
  getDistanceKm,
  isWithinMaxPriceTier,
  matchesQuery,
  sortPlaces,
} from "./place-search-utils";
import { fetchPhotoBytes, searchText, type GooglePlaceNative } from "./providers/googlePlaces";
import { isPaidProviderEnabled } from "./cost-guard";
import {
  readPlacesCache,
  writePlacesCache,
  writePlacesCacheEvent,
} from "@/platform/data-access/places-cache-repository";
import { createLogger } from "./logger";

const log = createLogger({ component: "places" });

const BUCKET = "place_images";
const IMAGE_MAX_WIDTH = 800;
const IMAGE_MAX_HEIGHT = 600;
const BLURHASH_COMPONENT_X = 4;
const BLURHASH_COMPONENT_Y = 3;
const PLACE_IMAGE_BATCH_SIZE = 8;
// Kept separate from display count so enrichment covers UI permutations.
// UI shows top 5 by userRatingCount, and can filter by 4 price levels.
// We enrich the union of: top 20 by Bayesian rank + top 5 per price bucket,
// so every plausible view renders with images.
const PLACE_IMAGE_ENRICH_LIMIT = 20;
const PLACE_IMAGE_PER_PRICE_BUCKET = 5;
const PLACE_QUERY_RESULT_LIMIT = 50;
const PRICE_BUCKETS = [
  "PRICE_LEVEL_INEXPENSIVE",
  "PRICE_LEVEL_MODERATE",
  "PRICE_LEVEL_EXPENSIVE",
  "PRICE_LEVEL_VERY_EXPENSIVE",
] as const;
const MIN_RESULTS_BEFORE_FALLBACK = 8;
const MIN_BUDGET_RESULTS = 2;
const BUDGET_PRICE_LEVELS = new Set(["PRICE_LEVEL_FREE", "PRICE_LEVEL_INEXPENSIVE"]);
const inFlightPlacesRequests = new Map<string, Promise<Landmark[]>>();

let hasWarnedMissingServiceRole = false;

// Result type for image resolution with BlurHash
interface ImageResult {
  imageUrl: string;
  blurhash: string;
}

type CachedLandmark = Landmark & {
  imageUrls?: string[];
};

export type PlaceType = "landmarks" | "restaurants" | "hotels";

export type PlacePriceTier = "free" | "inexpensive" | "moderate" | "expensive" | "very_expensive";
export type PlaceSort = "relevance" | "rating" | "reviews" | "distance";

export type PlaceSearchOptions = {
  cityName: string;
  type?: PlaceType;
  query?: string;
  minRating?: number;
  maxPriceTier?: PlacePriceTier;
  sortBy?: PlaceSort;
  page?: number;
  limit?: number;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  signal?: AbortSignal;
};

export type PlaceSearchResult = {
  results: Landmark[];
  total: number;
  page: number;
  limit: number;
};

type TopPlacesOptions = {
  lat?: number;
  lng?: number;
  radiusKm?: number;
  signal?: AbortSignal;
  allowProviderFetch?: boolean;
  _bypassCache?: boolean;
};

export interface Landmark {
  id: string;
  displayName: { text: string };
  formattedAddress: string;
  rating?: number;
  userRatingCount?: number;
  types?: string[];
  googleMapsUri?: string;
  priceLevel?: string;
  location?: {
    latitude?: number;
    longitude?: number;
  };
  imageUrl?: string;
  blurhash?: string;
}

type GooglePlacePhoto = { name: string };

type GooglePlace = GooglePlaceNative &
  Landmark & {
    photos?: GooglePlacePhoto[];
  };

function getPlacesWriteClient() {
  if (supabaseServer) {
    return supabaseServer;
  }

  if (!hasWarnedMissingServiceRole) {
    hasWarnedMissingServiceRole = true;
    console.warn(
      "[places] SUPABASE_SERVICE_ROLE_KEY missing; cache writes and image uploads are disabled."
    );
  }

  return null;
}

function buildPlacesRequestKey(cityName: string, type: PlaceType, opts?: TopPlacesOptions): string {
  const lat = typeof opts?.lat === "number" ? opts.lat.toFixed(3) : "na";
  const lng = typeof opts?.lng === "number" ? opts.lng.toFixed(3) : "na";
  const radius = typeof opts?.radiusKm === "number" ? opts.radiusKm.toFixed(0) : "default";
  return [cityName.toLowerCase(), type, lat, lng, radius].join(":");
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function getPrimaryQuery(cityName: string, type: PlaceType): string {
  switch (type) {
    case "landmarks":
      return `Top landmarks and attractions in ${cityName}`;
    case "restaurants":
      return `Best restaurants, local food, street food, and cheap eats in ${cityName}`;
    case "hotels":
      return `Top rated hotels, hostels, guest houses, and budget stays in ${cityName}`;
  }
}

function getFallbackBudgetQuery(cityName: string, type: PlaceType): string | null {
  switch (type) {
    case "restaurants":
      return `Best cheap eats and budget restaurants in ${cityName}`;
    case "hotels":
      return `Best budget hotels, hostels, and guest houses in ${cityName}`;
    default:
      return null;
  }
}

function inferBudgetPlaces(places: GooglePlace[]): void {
  places.forEach((place) => {
    if (!place.priceLevel) {
      place.priceLevel = "PRICE_LEVEL_INEXPENSIVE";
    }
  });
}

function dedupePlaces(places: GooglePlace[]): GooglePlace[] {
  const uniqueMap = new Map<string, GooglePlace>();
  places.forEach((place) => {
    uniqueMap.set(place.id, place);
  });
  return Array.from(uniqueMap.values());
}

function hasBudgetCoverage(places: Landmark[]): boolean {
  let budgetCount = 0;
  for (const place of places.slice(0, 12)) {
    if (place.priceLevel && BUDGET_PRICE_LEVELS.has(place.priceLevel)) {
      budgetCount += 1;
    }
    if (budgetCount >= MIN_BUDGET_RESULTS) {
      return true;
    }
  }
  return false;
}

function isBudgetSensitive(type: PlaceType): boolean {
  return type === "restaurants" || type === "hotels";
}

function stripPhotoMetadata(places: GooglePlace[]): void {
  places.forEach((place) => {
    delete place.photos;
  });
}

function filterPlacesByRadius(
  places: GooglePlace[],
  centerLat: number,
  centerLng: number,
  effectiveRadiusKm: number
): GooglePlace[] {
  const filtered = places.filter((place) => {
    const lat = place.location?.latitude;
    const lng = place.location?.longitude;
    if (typeof lat !== "number" || typeof lng !== "number") return true;
    return haversineKm(centerLat, centerLng, lat, lng) <= effectiveRadiusKm;
  });

  return filtered.length > 0 ? filtered : places;
}

async function savePlacesCache(
  cityName: string,
  type: PlaceType,
  places: Landmark[],
  updatedAt = new Date().toISOString()
): Promise<void> {
  if (places.length === 0) {
    return;
  }

  if (!supabaseServer) {
    getPlacesWriteClient();
    return;
  }

  try {
    await writePlacesCache(cityName, type, places, updatedAt);
  } catch (error) {
    console.warn(
      `[places] Failed to save cache for ${cityName}/${type}:`,
      error instanceof Error ? error.message : error
    );
  }
}

function recordPlacesCacheEvent(type: PlaceType, isHit: boolean): void {
  // Sample analytics writes — a high-volume warm cache hit otherwise issues
  // an RPC per request just to record "hit: true" indistinguishably. 10% is
  // statistically sufficient for ratio tracking while cutting DB write load.
  if (Math.random() > 0.1) return;
  if (!supabaseServer) {
    getPlacesWriteClient();
    return;
  }

  void (async () => {
    try {
      await writePlacesCacheEvent(type, isHit);
    } catch (error) {
      console.warn(
        `[places] Failed to record cache event for ${type}:`,
        error instanceof Error ? error.message : error
      );
    }
  })();
}

/**
 * Pick the set of places to enrich with images.
 *
 * The UI sorts by `userRatingCount` (desc) and shows the top 5, optionally
 * filtered by a price bucket. The ranking engine sorts by Bayesian quality,
 * which can pick a different 8 places. Without alignment, displayed cards
 * often have no image. We therefore enrich the union of:
 *   - Top N by ranking engine (original behavior — good defaults).
 *   - Top 5 by `userRatingCount` overall (primary UI view).
 *   - Top 5 by `userRatingCount` within each price bucket (filtered views).
 */
function selectImageEnrichmentTargets(rankedPlaces: GooglePlace[]): GooglePlace[] {
  const selected = new Map<string, GooglePlace>();

  const take = (list: GooglePlace[], n: number) => {
    for (const place of list.slice(0, n)) {
      if (place.id && !selected.has(place.id)) {
        selected.set(place.id, place);
      }
    }
  };

  // 1. Ranking-engine top N (quality-weighted, original behavior).
  take(rankedPlaces, PLACE_IMAGE_ENRICH_LIMIT);

  // 2. Top by userRatingCount — what the unfiltered UI actually shows.
  const byReviews = [...rankedPlaces].sort(
    (a, b) => (b.userRatingCount ?? 0) - (a.userRatingCount ?? 0)
  );
  take(byReviews, PLACE_IMAGE_PER_PRICE_BUCKET);

  // 3. Top by userRatingCount within each price bucket — filtered UI views.
  for (const bucket of PRICE_BUCKETS) {
    const inBucket = byReviews.filter((p) => p.priceLevel === bucket);
    take(inBucket, PLACE_IMAGE_PER_PRICE_BUCKET);
  }

  return Array.from(selected.values());
}

async function enrichRankedPlaceImages(
  rankedPlaces: GooglePlace[],
  existingBlurhashes?: Map<string, string>,
  signal?: AbortSignal
): Promise<void> {
  const targets = selectImageEnrichmentTargets(rankedPlaces);

  for (let i = 0; i < targets.length; i += PLACE_IMAGE_BATCH_SIZE) {
    const batch = targets.slice(i, i + PLACE_IMAGE_BATCH_SIZE);
    await Promise.all(
      batch.map(async (place) => {
        const photo = place.photos?.[0];
        if (!photo?.name || !place.id) return;

        const landmark = place as Landmark;
        // Reuse a blurhash from a previous cache row when available so we
        // don't re-download the storage image just to recompute it.
        const seededBlurhash = landmark.blurhash || existingBlurhashes?.get(place.id);
        const result = await resolvePlaceImage(place.id, photo.name, seededBlurhash, signal);

        if (result) {
          landmark.imageUrl = result.imageUrl;
          landmark.blurhash = result.blurhash;
        }
      })
    );
  }
}

async function loadExistingBlurhashes(
  cityName: string,
  type: PlaceType
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const cache = await readPlacesCache(cityName, type);
    const places = cache?.places_data ?? [];
    for (const p of places) {
      if (p.id && typeof p.blurhash === "string" && p.blurhash.length > 0) {
        map.set(p.id, p.blurhash);
      }
    }
  } catch {
    // Best-effort — enrichment falls back to in-storage re-hash if needed.
  }
  return map;
}

async function fetchFreshPlaces(
  cityName: string,
  type: PlaceType,
  opts?: TopPlacesOptions
): Promise<Landmark[]> {
  const requestedRadiusKm = opts?.radiusKm ?? 90;
  const apiMaxRadiusKm = 50;
  const effectiveRadiusKm = Math.min(requestedRadiusKm, apiMaxRadiusKm);
  const centerLat = opts?.lat;
  const centerLng = opts?.lng;
  const hasCoords = typeof centerLat === "number" && typeof centerLng === "number";

  const primaryPlaces = await fetchFromGoogle(getPrimaryQuery(cityName, type), {
    lat: centerLat,
    lng: centerLng,
    effectiveRadiusKm: hasCoords ? effectiveRadiusKm : undefined,
    signal: opts?.signal,
  });

  let places = primaryPlaces;

  if (hasCoords) {
    places = filterPlacesByRadius(places, centerLat, centerLng, effectiveRadiusKm);
  }

  // Dedupe once up-front so the fallback path can reuse the result and only
  // dedupe the additional fallback batch against the primary id set.
  const dedupedPrimary = dedupePlaces(places);
  let rankedPlaces = rankingEngine.rank(dedupedPrimary);
  const fallbackQuery = getFallbackBudgetQuery(cityName, type);
  const shouldRunFallback = Boolean(
    fallbackQuery &&
    (rankedPlaces.length < MIN_RESULTS_BEFORE_FALLBACK ||
      (isBudgetSensitive(type) && !hasBudgetCoverage(rankedPlaces)))
  );

  if (shouldRunFallback && fallbackQuery) {
    const fallbackPlaces = await fetchFromGoogle(fallbackQuery, {
      lat: centerLat,
      lng: centerLng,
      effectiveRadiusKm: hasCoords ? effectiveRadiusKm : undefined,
      signal: opts?.signal,
    });

    inferBudgetPlaces(fallbackPlaces);

    const filteredFallback = hasCoords
      ? filterPlacesByRadius(fallbackPlaces, centerLat, centerLng, effectiveRadiusKm)
      : fallbackPlaces;

    const mergedPlaces = dedupePlaces([...dedupedPrimary, ...filteredFallback]);
    rankedPlaces = rankingEngine.rank(mergedPlaces);
  }

  if (rankedPlaces.length === 0) {
    console.info("[places] No places returned after search", { cityName, type });
    return [];
  }

  const rankedGooglePlaces = rankedPlaces as GooglePlace[];
  // Look up any blurhashes we've already computed for this (city, type) so
  // background SWR refreshes don't re-download storage images.
  const existingBlurhashes = await loadExistingBlurhashes(cityName, type);
  await enrichRankedPlaceImages(rankedGooglePlaces, existingBlurhashes, opts?.signal);
  stripPhotoMetadata(rankedGooglePlaces);

  return rankedGooglePlaces;
}

async function fetchAndCachePlaces(
  cityName: string,
  type: PlaceType,
  opts?: TopPlacesOptions
): Promise<Landmark[]> {
  const requestKey = buildPlacesRequestKey(cityName, type, opts);
  const existingRequest = inFlightPlacesRequests.get(requestKey);
  if (existingRequest) {
    return existingRequest;
  }

  const request = (async () => {
    recordPlacesCacheEvent(type, false);
    const freshPlaces = await fetchFreshPlaces(cityName, type, opts);

    if (freshPlaces.length > 0) {
      await savePlacesCache(cityName, type, freshPlaces);
    }

    return freshPlaces;
  })().finally(() => {
    inFlightPlacesRequests.delete(requestKey);
  });

  inFlightPlacesRequests.set(requestKey, request);
  return request;
}

// Generate BlurHash from image buffer using sharp
async function generateBlurhash(imageBuffer: ArrayBuffer): Promise<string | undefined> {
  try {
    // Resize to small dimensions for fast BlurHash encoding
    const { data, info } = await sharp(Buffer.from(imageBuffer))
      .resize(32, 32, { fit: "inside" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Encode to BlurHash
    const blurhash = encode(
      new Uint8ClampedArray(data),
      info.width,
      info.height,
      BLURHASH_COMPONENT_X,
      BLURHASH_COMPONENT_Y
    );

    return blurhash;
  } catch (e) {
    console.warn("[places] Failed to generate blurhash:", e);
    return undefined;
  }
}

function buildPlaceImagePublicUrl(placeId: string, supabaseUrl: string): string {
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${placeId}.jpg`;
}

function normalizeCachedPlace(
  place: Landmark,
  supabaseUrl: string
): {
  place: CachedLandmark;
  changed: boolean;
} {
  const normalizedPlace: CachedLandmark = { ...place };
  const expectedUrl = buildPlaceImagePublicUrl(place.id, supabaseUrl);
  const bucketPath = `/storage/v1/object/public/${BUCKET}/`;
  let changed = false;

  if (
    typeof normalizedPlace.imageUrl === "string" &&
    normalizedPlace.imageUrl.includes(bucketPath) &&
    normalizedPlace.imageUrl !== expectedUrl
  ) {
    normalizedPlace.imageUrl = expectedUrl;
    changed = true;
  }

  const extraImageUrls = (place as CachedLandmark).imageUrls;
  if (Array.isArray(extraImageUrls)) {
    // Only rewrite entries that reference *this place's* storage object
    // (same `{placeId}.jpg` path). Rewriting any bucket URL would collapse
    // distinct images to one if a place ever carries multiple.
    const expectedSuffix = `${bucketPath}${place.id}.jpg`;
    const normalizedImageUrls = extraImageUrls
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .map((value) => (value.endsWith(expectedSuffix) ? expectedUrl : value));

    // Compare element-wise instead of stringifying — avoids two full
    // JSON.stringify passes per cached place on every cache hit.
    const arrayChanged =
      normalizedImageUrls.length !== extraImageUrls.length ||
      !normalizedImageUrls.every((value, idx) => value === extraImageUrls.at(idx));
    if (arrayChanged) {
      normalizedPlace.imageUrls = normalizedImageUrls;
      changed = true;
    }

    if (!normalizedPlace.imageUrl && normalizedImageUrls.includes(expectedUrl)) {
      normalizedPlace.imageUrl = expectedUrl;
      changed = true;
    }
  }

  return { place: normalizedPlace, changed };
}

// Resolve place photo to Supabase Storage URL (fetch from Google, upload, return public URL)
// Also generates BlurHash for LQIP placeholder
async function resolvePlaceImage(
  placeId: string,
  photoName: string,
  existingBlurhash?: string,
  signal?: AbortSignal
): Promise<ImageResult | undefined> {
  const client = getPlacesWriteClient();
  const supabaseUrl = publicEnv().NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return undefined;

  const storagePath = `${placeId}.jpg`;
  const publicUrl = buildPlaceImagePublicUrl(placeId, supabaseUrl);

  try {
    // Check if image already exists in storage
    const headRes = await fetch(publicUrl, {
      method: "HEAD",
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(5_000)])
        : AbortSignal.timeout(5_000),
    });
    if (headRes.ok) {
      // Image exists, but we may need to generate blurhash if not cached
      if (existingBlurhash) {
        return { imageUrl: publicUrl, blurhash: existingBlurhash };
      }
      // Fetch image to generate blurhash for existing cached images
      const existingImageRes = await fetch(publicUrl, {
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(10_000)])
          : AbortSignal.timeout(10_000),
      });
      if (existingImageRes.ok) {
        const existingBuffer = await existingImageRes.arrayBuffer();
        const blurhash = await generateBlurhash(existingBuffer);
        return { imageUrl: publicUrl, blurhash: blurhash ?? "" };
      }
      return { imageUrl: publicUrl, blurhash: "" };
    }

    const arrayBuffer = await fetchPhotoBytes(photoName, {
      maxWidth: IMAGE_MAX_WIDTH,
      maxHeight: IMAGE_MAX_HEIGHT,
      signal,
    });
    if (!arrayBuffer) return undefined;

    // Generate BlurHash before uploading
    const blurhash = await generateBlurhash(arrayBuffer);

    if (!client) {
      return undefined;
    }

    // Upload to Supabase Storage
    const { error } = await client.storage.from(BUCKET).upload(storagePath, arrayBuffer, {
      contentType: "image/jpeg",
      upsert: true,
    });

    if (error) {
      console.warn(`[places] Failed to upload image for ${placeId}:`, error.message);
      return undefined;
    }

    return { imageUrl: publicUrl, blurhash: blurhash ?? "" };
  } catch (e) {
    console.warn(`[places] Failed to resolve image for ${placeId}:`, e);
    return undefined;
  }
}

// Helper to fetch from Google Places API
async function fetchFromGoogle(
  queryText: string,
  opts?: { lat?: number; lng?: number; effectiveRadiusKm?: number; signal?: AbortSignal }
): Promise<GooglePlace[]> {
  try {
    const result = await searchText({
      textQuery: queryText,
      maxResultCount: PLACE_QUERY_RESULT_LIMIT,
      fieldMask: "enrichment",
      locationBias:
        typeof opts?.lat === "number" &&
        typeof opts.lng === "number" &&
        typeof opts.effectiveRadiusKm === "number"
          ? { lat: opts.lat, lng: opts.lng, radiusKm: opts.effectiveRadiusKm }
          : undefined,
      signal: opts?.signal,
    });

    if (!result.ok) {
      console.warn(`[places] Google Places request failed for query "${queryText}"`, result.reason);
      return [];
    }

    return result.places as GooglePlace[];
  } catch (e) {
    if (isAbortError(e)) {
      throw e;
    }
    console.error(`[places] Failed to fetch for query "${queryText}":`, e);
    return [];
  }
}

/**
 * Fire-and-forget background refresh for the soft-refresh SWR window (7-30 days).
 * Re-invokes getTopPlaces with a flag to skip the cache read and force a fresh fetch.
 */
async function refreshPlacesInBackground(
  cityName: string,
  type: PlaceType,
  opts?: TopPlacesOptions
): Promise<void> {
  if (!opts?.allowProviderFetch || !isPaidProviderEnabled("google-places")) {
    return;
  }
  try {
    await getTopPlaces(cityName, type, { ...opts, _bypassCache: true } as never);
  } catch (e) {
    if (isAbortError(e)) {
      throw e;
    }
    console.warn(`[places] Background refresh failed for ${cityName}/${type}:`, e);
  }
}

export async function getTopPlaces(
  cityName: string,
  type: PlaceType,
  opts?: TopPlacesOptions
): Promise<Landmark[]> {
  // Read lazily (not at module load) so scripts that populate env after
  // import — e.g. dotenv in warmers — still get enrichment.
  if (!serverEnv().GOOGLE_PLACES_API_KEY) {
    console.warn(`[places] Missing API key; returning empty for ${cityName} / ${type}`);
    return [];
  }

  log.debug("get_top_places", {
    cityName,
    type,
    allowProviderFetch: Boolean(opts?.allowProviderFetch),
    liveEnabled: isPaidProviderEnabled("google-places"),
  });

  try {
    // 1. Check Supabase Cache first (30-day hard TTL, 7-day soft-refresh)
    const bypassCache = !!(opts as Record<string, unknown> | undefined)?._bypassCache;
    const cache = bypassCache ? null : await readPlacesCache(cityName, type);
    log.debug("cache_lookup", { cityName, type, hit: Boolean(cache) });

    if (cache) {
      const updatedAt = new Date(cache.updated_at);
      const now = new Date();
      const daysSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
      const supabaseUrl = publicEnv().NEXT_PUBLIC_SUPABASE_URL;
      const cachedPlacesRaw = (cache.places_data || []) as Landmark[];
      const normalizedResults = supabaseUrl
        ? cachedPlacesRaw.map((place) => normalizeCachedPlace(place, supabaseUrl))
        : cachedPlacesRaw.map((place) => ({ place, changed: false }));
      const cachedPlaces = normalizedResults.map((result) => result.place);
      const normalizedChanged = normalizedResults.some((result) => result.changed);

      if (normalizedChanged) {
        void savePlacesCache(cityName, type, cachedPlaces, cache.updated_at);
      }

      if (daysSinceUpdate < CACHE_TTL.PLACES_FRESH_DAYS) {
        recordPlacesCacheEvent(type, true);

        const shouldRefreshForAge = daysSinceUpdate >= CACHE_TTL.PLACES_SOFT_REFRESH_DAYS;
        const shouldRefreshForCoverage =
          isBudgetSensitive(type) && !hasBudgetCoverage(cachedPlaces);
        // Re-enrich when the cards the UI will actually show lack images,
        // not merely when every single cached place is imageless. The UI
        // ranks by userRatingCount (desc) and shows the top 5.
        // Fast path: if every cached place already has an image, no top-5
        // sort is needed at all (common warm cache shape).
        let shouldRefreshForImages = false;
        if (cachedPlaces.length > 0 && !cachedPlaces.every((p) => !!p.imageUrl)) {
          const displayedTop = [...cachedPlaces]
            .sort((a, b) => (b.userRatingCount ?? 0) - (a.userRatingCount ?? 0))
            .slice(0, 5);
          shouldRefreshForImages = !displayedTop.some((place) => !!place.imageUrl);
        }

        if (
          opts?.allowProviderFetch &&
          (shouldRefreshForAge || shouldRefreshForCoverage || shouldRefreshForImages)
        ) {
          refreshPlacesInBackground(cityName, type, opts).catch(() => {});
        }

        return cachedPlaces;
      }

      if (!opts?.allowProviderFetch || !isPaidProviderEnabled("google-places")) {
        recordPlacesCacheEvent(type, true);
        return cachedPlaces;
      }
    }

    if (!opts?.allowProviderFetch || !isPaidProviderEnabled("google-places")) {
      // Routine in production (cache-only, warmer-only spend) — debug, not warn.
      log.debug("live_fetch_blocked", {
        cityName,
        type,
        allowProviderFetch: Boolean(opts?.allowProviderFetch),
        liveEnabled: isPaidProviderEnabled("google-places"),
      });
      recordPlacesCacheEvent(type, false);
      return [];
    }

    const fetched = await fetchAndCachePlaces(cityName, type, opts);
    log.debug("live_fetch_done", { cityName, type, count: fetched.length });
    return fetched;
  } catch (e) {
    if (isAbortError(e)) {
      throw e;
    }
    console.error(`Failed to fetch ${type} for ${cityName}:`, e);
    return [];
  }
}

export async function searchPlaces(options: PlaceSearchOptions): Promise<PlaceSearchResult> {
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;
  const sortBy = options.sortBy ?? "relevance";
  const minRating = options.minRating ?? 0;
  const normalizedQuery = options.query?.trim().toLowerCase();
  const requestedTypes: PlaceType[] = options.type
    ? [options.type]
    : ["landmarks", "restaurants", "hotels"];

  const batches = await Promise.all(
    requestedTypes.map((placeType) =>
      getTopPlaces(options.cityName, placeType, {
        lat: options.lat,
        lng: options.lng,
        radiusKm: options.radiusKm,
        signal: options.signal,
      })
    )
  );

  const merged = batches.flat();

  const filtered = merged.filter((place) => {
    if ((place.rating ?? 0) < minRating) return false;
    if (!isWithinMaxPriceTier(place.priceLevel, options.maxPriceTier)) return false;
    if (normalizedQuery && !matchesQuery(place, normalizedQuery)) return false;

    if (
      sortBy === "distance" &&
      typeof options.lat === "number" &&
      typeof options.lng === "number"
    ) {
      return getDistanceKm(place, options.lat, options.lng) <= (options.radiusKm ?? 25);
    }

    return true;
  });

  const sorted = sortPlaces(filtered, sortBy, options.lat, options.lng);
  const offset = (page - 1) * limit;

  return {
    results: sorted.slice(offset, offset + limit),
    total: sorted.length,
    page,
    limit,
  };
}

/**
 * Google Places provider.
 *
 * Pure fetcher — no Supabase, no ranking, no caching logic. Responsible for:
 *  - Building request bodies with tiered field masks.
 *  - Passing language/region based on ISO2 country.
 *  - Enforcing retry/timeout/circuit-breaker via the shared `http` wrapper.
 *  - Emitting structured logs with correlation IDs.
 *
 * Callers (orchestrators like `src/lib/places.ts`) decide what to do with
 * the results. This lets us unit-test the provider in isolation and swap it
 * out without rippling through the orchestration layer.
 */
import { httpFetch, CircuitOpenError } from "../http";
import { createLogger, newCorrelationId } from "../logger";
import { serverEnv } from "../env";
import { tryClaimPaidProviderUse } from "../cost-guard";

const log = createLogger({ component: "provider/googlePlaces" });
const API_BASE = "https://places.googleapis.com/v1";
const PROVIDER = "google-places";

export type FieldMaskTier = "minimal" | "standard" | "enrichment";

const FIELD_MASKS: Record<FieldMaskTier, string> = {
  minimal:
    "places.id,places.displayName,places.location,places.types,places.rating,places.userRatingCount,places.priceLevel",
  standard:
    "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.rating,places.userRatingCount,places.priceLevel,places.googleMapsUri",
  enrichment:
    "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.rating,places.userRatingCount,places.priceLevel,places.googleMapsUri,places.photos,places.websiteUri,places.editorialSummary",
};

function getFieldMask(tier: FieldMaskTier): string {
  switch (tier) {
    case "minimal":
      return FIELD_MASKS.minimal;
    case "standard":
      return FIELD_MASKS.standard;
    case "enrichment":
      return FIELD_MASKS.enrichment;
  }
}

export interface GooglePlacePhoto {
  name: string;
}

export interface GooglePlaceNative {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  types?: string[];
  googleMapsUri?: string;
  websiteUri?: string;
  priceLevel?: string;
  location?: { latitude?: number; longitude?: number };
  photos?: GooglePlacePhoto[];
}

export interface SearchTextParams {
  textQuery: string;
  maxResultCount?: number;
  languageCode?: string;
  regionCode?: string;
  fieldMask?: FieldMaskTier;
  locationBias?: { lat: number; lng: number; radiusKm: number };
  locationRestriction?: { lat: number; lng: number; radiusKm: number };
  includedType?: string;
  signal?: AbortSignal;
}

export interface SearchNearbyParams {
  center: { lat: number; lng: number };
  radiusKm: number;
  includedTypes?: string[];
  includedPrimaryTypes?: string[];
  maxResultCount?: number;
  rankPreference?: "POPULARITY" | "DISTANCE";
  languageCode?: string;
  regionCode?: string;
  fieldMask?: FieldMaskTier;
  signal?: AbortSignal;
}

export type PlacesResult =
  | { ok: true; places: GooglePlaceNative[] }
  | { ok: false; reason: "outage" | "auth" | "quota" | "empty" | "error"; status?: number };

const API_MAX_RADIUS_KM = 50;

let cachedApiKey: string | null | undefined;
function getApiKey(): string | null {
  if (cachedApiKey !== undefined) return cachedApiKey;
  cachedApiKey = serverEnv().GOOGLE_PLACES_API_KEY ?? null;
  return cachedApiKey;
}

function capRadius(radiusKm: number, correlationId: string): number {
  if (radiusKm > API_MAX_RADIUS_KM) {
    log.info("radius.capped", { correlationId, requested: radiusKm, capped: API_MAX_RADIUS_KM });
    return API_MAX_RADIUS_KM;
  }
  return radiusKm;
}

export async function searchText(params: SearchTextParams): Promise<PlacesResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    log.warn("missing_api_key");
    return { ok: false, reason: "auth" };
  }
  const correlationId = newCorrelationId();
  const tier = params.fieldMask ?? "standard";

  const body: Record<string, unknown> = {
    textQuery: params.textQuery,
    maxResultCount: Math.min(params.maxResultCount ?? 20, 50),
  };
  if (params.languageCode) body.languageCode = params.languageCode;
  if (params.regionCode) body.regionCode = params.regionCode;
  if (params.includedType) body.includedType = params.includedType;
  if (params.locationRestriction) {
    const r = capRadius(params.locationRestriction.radiusKm, correlationId);
    body.locationRestriction = {
      circle: {
        center: {
          latitude: params.locationRestriction.lat,
          longitude: params.locationRestriction.lng,
        },
        radius: r * 1000,
      },
    };
  } else if (params.locationBias) {
    const r = capRadius(params.locationBias.radiusKm, correlationId);
    body.locationBias = {
      circle: {
        center: { latitude: params.locationBias.lat, longitude: params.locationBias.lng },
        radius: r * 1000,
      },
    };
  }

  return runPlacesRequest(
    `${API_BASE}/places:searchText`,
    body,
    tier,
    apiKey,
    correlationId,
    params.signal
  );
}

export async function searchNearby(params: SearchNearbyParams): Promise<PlacesResult> {
  const apiKey = getApiKey();
  if (!apiKey) return { ok: false, reason: "auth" };
  const correlationId = newCorrelationId();
  const tier = params.fieldMask ?? "standard";
  const radiusKm = capRadius(params.radiusKm, correlationId);

  const body: Record<string, unknown> = {
    maxResultCount: Math.min(params.maxResultCount ?? 20, 20),
    locationRestriction: {
      circle: {
        center: { latitude: params.center.lat, longitude: params.center.lng },
        radius: radiusKm * 1000,
      },
    },
  };
  if (params.includedTypes?.length) body.includedTypes = params.includedTypes;
  if (params.includedPrimaryTypes?.length) body.includedPrimaryTypes = params.includedPrimaryTypes;
  if (params.rankPreference) body.rankPreference = params.rankPreference;
  if (params.languageCode) body.languageCode = params.languageCode;
  if (params.regionCode) body.regionCode = params.regionCode;

  return runPlacesRequest(
    `${API_BASE}/places:searchNearby`,
    body,
    tier,
    apiKey,
    correlationId,
    params.signal
  );
}

async function runPlacesRequest(
  url: string,
  body: Record<string, unknown>,
  tier: FieldMaskTier,
  apiKey: string,
  correlationId: string,
  signal?: AbortSignal
): Promise<PlacesResult> {
  if (
    !tryClaimPaidProviderUse(
      PROVIDER,
      body.textQuery ? `search:${String(body.textQuery).slice(0, 80)}` : "search"
    )
  ) {
    return { ok: false, reason: "quota" };
  }

  try {
    const response = await httpFetch(url, {
      provider: PROVIDER,
      method: "POST",
      timeoutMs: 15_000,
      retryOnNonIdempotent: true,
      retries: 2,
      correlationId,
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": getFieldMask(tier),
      },
      signal,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        log.error("auth_denied", { correlationId, status: response.status });
        return { ok: false, reason: "auth", status: response.status };
      }
      if (response.status === 429) {
        log.warn("quota_exhausted", { correlationId, status: response.status });
        return { ok: false, reason: "quota", status: response.status };
      }
      // 5xx — surface as outage so the circuit breaker / caller can react
      // appropriately. 4xx (other than the cases above) stays as "error".
      if (response.status >= 500) {
        log.warn("upstream_outage", { correlationId, status: response.status });
        return { ok: false, reason: "outage", status: response.status };
      }
      return { ok: false, reason: "error", status: response.status };
    }

    const data = (await response.json()) as { places?: GooglePlaceNative[] };
    const places = data.places ?? [];
    if (places.length === 0) return { ok: false, reason: "empty" };
    log.debug("ok", { correlationId, count: places.length, tier });
    return { ok: true, places };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw err;
    }
    if (err instanceof CircuitOpenError) {
      return { ok: false, reason: "outage" };
    }
    log.error("exception", {
      correlationId,
      error: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, reason: "error" };
  }
}

/** Best-effort resolution of a photo reference to raw image bytes. */
export async function fetchPhotoBytes(
  photoName: string,
  opts: { maxWidth: number; maxHeight: number; signal?: AbortSignal }
): Promise<ArrayBuffer | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;
  if (!tryClaimPaidProviderUse(PROVIDER, `photo:${photoName}`)) return null;
  const url = `${API_BASE}/${photoName}/media?maxWidthPx=${opts.maxWidth}&maxHeightPx=${opts.maxHeight}&key=${encodeURIComponent(apiKey)}`;
  try {
    const res = await httpFetch(url, {
      provider: PROVIDER,
      method: "GET",
      timeoutMs: 15_000,
      redirect: "follow",
      signal: opts.signal,
    });
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

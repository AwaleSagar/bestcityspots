/**
 * Canonical data models for the travel domain.
 *
 * Provider modules (Google Places, OpenWeather, Open-Meteo, Gemini, …) return
 * their native shape. The `mapping` layer is the single place where those
 * native shapes are translated into stable, provider-agnostic canonical
 * models. This isolates the rest of the codebase from provider churn and
 * enables future multi-source blending (e.g., prefer OpenWeather temp, fall
 * back to Open-Meteo) without leaking schemas into callers.
 *
 * Canonical models:
 *   - `CanonicalPlace`     — landmarks, restaurants, hotels.
 *   - `CanonicalWeather`   — current weather + AQI.
 *   - `CanonicalCityVital` — a single city-level metric with confidence.
 *   - `CanonicalCityVitals` — bundle of vitals keyed by concept.
 *
 * All models are Zod-validated so data crossing the provider boundary (IN)
 * and crossing the cache boundary (OUT) is rejected if malformed.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Places
// ---------------------------------------------------------------------------

// Aligned with `PlacePriceTier` (src/lib/places.ts) so the two layers share a
// single vocabulary — `isWithinMaxPriceTier` filters on this exact set, and a
// divergent enum here (previously "cheap"/"luxury") would silently break
// price filtering if this canonical layer were ever wired into the pipeline.
export const CanonicalPriceLevel = z.enum([
  "free",
  "inexpensive",
  "moderate",
  "expensive",
  "very_expensive",
  "unknown",
]);
export type CanonicalPriceLevel = z.infer<typeof CanonicalPriceLevel>;

export const CanonicalPlaceImage = z.object({
  url: z.string().url(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  blurhash: z.string().optional(),
  attribution: z.string().optional(),
  source: z.string(),
});
export type CanonicalPlaceImage = z.infer<typeof CanonicalPlaceImage>;

export const CanonicalPlace = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  name: z.string().min(1).max(500),
  address: z.string().max(1000).optional(),
  location: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .optional(),
  rating: z.number().min(0).max(5).optional(),
  ratingCount: z.number().int().min(0).optional(),
  priceLevel: CanonicalPriceLevel.default("unknown"),
  types: z.array(z.string()).default([]),
  images: z.array(CanonicalPlaceImage).default([]),
  links: z
    .object({
      maps: z.string().url().optional(),
      website: z.string().url().optional(),
      booking: z.string().url().optional(),
    })
    .default({}),
  attributions: z.array(z.string()).default([]),
});
export type CanonicalPlace = z.infer<typeof CanonicalPlace>;

// ---------------------------------------------------------------------------
// Weather
// ---------------------------------------------------------------------------

export const CanonicalWeatherCondition = z.enum([
  "clear",
  "cloudy",
  "rain",
  "snow",
  "storm",
  "fog",
  "unknown",
]);
export type CanonicalWeatherCondition = z.infer<typeof CanonicalWeatherCondition>;

export const CanonicalWeather = z.object({
  tempC: z.number(),
  feelsLikeC: z.number().optional(),
  humidity: z.number().min(0).max(100).optional(),
  windKph: z.number().min(0).optional(),
  condition: CanonicalWeatherCondition.default("unknown"),
  iconHint: z.string().optional(),
  aqi: z.number().int().min(0).max(500).optional(),
  aqiLabel: z.string().optional(),
  observedAt: z.string(),
  source: z.string(),
});
export type CanonicalWeather = z.infer<typeof CanonicalWeather>;

// ---------------------------------------------------------------------------
// City vitals
// ---------------------------------------------------------------------------

export const CanonicalConfidence = z.enum(["high", "medium", "low", "unknown"]);
export type CanonicalConfidence = z.infer<typeof CanonicalConfidence>;

export function canonicalVital<T extends z.ZodTypeAny>(value: T) {
  return z.object({
    value: value.nullable(),
    unit: z.string().optional(),
    confidence: CanonicalConfidence.default("unknown"),
    source: z.string().optional(),
    updatedAt: z.string().optional(),
  });
}

export const CanonicalCityVitals = z.object({
  cost: canonicalVital(z.number()),
  safety: canonicalVital(z.number()),
  connectivity: canonicalVital(z.number()),
  health: canonicalVital(z.number()),
  climateComfort: canonicalVital(z.string()),
  pollution: canonicalVital(z.number()),
});
export type CanonicalCityVitals = z.infer<typeof CanonicalCityVitals>;

// ---------------------------------------------------------------------------
// Google Places → Canonical
// ---------------------------------------------------------------------------

const GOOGLE_PRICE_MAP: Record<string, CanonicalPriceLevel> = {
  PRICE_LEVEL_FREE: "free",
  PRICE_LEVEL_INEXPENSIVE: "inexpensive",
  PRICE_LEVEL_MODERATE: "moderate",
  PRICE_LEVEL_EXPENSIVE: "expensive",
  PRICE_LEVEL_VERY_EXPENSIVE: "very_expensive",
};

/** Compact type used by `src/lib/places.ts`; kept loose to avoid circular deps. */
export interface GooglePlaceInput {
  id: string;
  displayName?: { text?: string } | null;
  formattedAddress?: string | null;
  rating?: number | null;
  userRatingCount?: number | null;
  types?: string[] | null;
  googleMapsUri?: string | null;
  priceLevel?: string | null;
  location?: { latitude?: number | null; longitude?: number | null } | null;
  imageUrl?: string | null;
  blurhash?: string | null;
  websiteUri?: string | null;
}

export function googlePlaceToCanonical(input: GooglePlaceInput): CanonicalPlace | null {
  const name = input.displayName?.text?.trim();
  if (!input.id || !name) return null;
  const parsed = CanonicalPlace.safeParse({
    id: input.id,
    source: "google-places",
    name: name.slice(0, 500),
    address: input.formattedAddress ?? undefined,
    location:
      typeof input.location?.latitude === "number" && typeof input.location?.longitude === "number"
        ? { lat: input.location.latitude, lng: input.location.longitude }
        : undefined,
    rating: typeof input.rating === "number" ? input.rating : undefined,
    ratingCount: typeof input.userRatingCount === "number" ? input.userRatingCount : undefined,
    priceLevel: input.priceLevel ? (GOOGLE_PRICE_MAP[input.priceLevel] ?? "unknown") : "unknown",
    types: Array.isArray(input.types) ? input.types : [],
    images: input.imageUrl
      ? [
          {
            url: input.imageUrl,
            blurhash: input.blurhash ?? undefined,
            source: "google-places",
          },
        ]
      : [],
    links: {
      maps: input.googleMapsUri ?? undefined,
      website: input.websiteUri ?? undefined,
    },
    attributions: [],
  });
  return parsed.success ? parsed.data : null;
}

// ---------------------------------------------------------------------------
// OpenWeather / Open-Meteo → CanonicalWeather helpers.
//
// Kept in this module (rather than providers) because mapping is the single
// source of truth for cross-provider reconciliation.
// ---------------------------------------------------------------------------

export function conditionFromOpenWeather(
  main: string | undefined | null
): CanonicalWeatherCondition {
  if (!main) return "unknown";
  const m = main.toLowerCase();
  if (m.includes("clear")) return "clear";
  if (m.includes("cloud")) return "cloudy";
  if (m.includes("rain") || m.includes("drizzle")) return "rain";
  if (m.includes("snow")) return "snow";
  if (m.includes("thunder") || m.includes("storm")) return "storm";
  if (m.includes("fog") || m.includes("mist") || m.includes("haze") || m.includes("smoke"))
    return "fog";
  return "unknown";
}

export function aqiLabelFromOwm(aqi: number): string {
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

/**
 * Map a raw PM2.5 concentration (µg/m³) to a coarse 1–5 OWM-equivalent
 * index. Boundaries follow the OpenWeather AQI bucket definitions:
 * https://openweathermap.org/api/air-pollution
 */
export function owmAqiFromPm25(pm25: number): number {
  if (pm25 < 10) return 1;
  if (pm25 < 25) return 2;
  if (pm25 < 50) return 3;
  if (pm25 < 75) return 4;
  return 5;
}

/** Human-readable label for a raw PM2.5 concentration (µg/m³). */
export function aqiLabelFromPm25(pm25: number): string {
  return aqiLabelFromOwm(owmAqiFromPm25(pm25));
}

/**
 * Pure presentation helpers for city data (labels, units, seasons). No I/O;
 * safe on server and client.
 */

import type { City } from "./cities";

/** `cities.capital` → human label (primary/admin/minor, from GeoNames PPLC/PPLA/PPLA2-4). */
export function capitalLabel(capital: string | null | undefined): string | null {
  switch (capital) {
    case "primary":
      return "National capital";
    case "admin":
      return "Regional capital";
    default:
      return null;
  }
}

export function formatCoordinates(lat: number, lng: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(2)}° ${ns}, ${Math.abs(lng).toFixed(2)}° ${ew}`;
}

export function formatTemperature(tempC: number | null | undefined): string | null {
  if (typeof tempC !== "number" || !Number.isFinite(tempC)) return null;
  return `${Math.round(tempC)}°C`;
}

export function regionLine(city: Pick<City, "admin_name" | "country">): string {
  return [city.admin_name, city.country].filter(Boolean).join(", ");
}

export interface AqiInfo {
  /** 1–5 on the OpenWeather scale, or null when unknown. */
  level: 1 | 2 | 3 | 4 | 5 | null;
  label: string;
  advice: string;
}

const AQI_SCALE: ReadonlyArray<Omit<AqiInfo, "level">> = [
  { label: "Good", advice: "Air quality is good — no precautions needed." },
  { label: "Fair", advice: "Acceptable for almost everyone; very sensitive people may notice it." },
  {
    label: "Moderate",
    advice: "Sensitive groups should keep long, intense outdoor activity short.",
  },
  {
    label: "Poor",
    advice: "Plan shorter outdoor stretches; sensitive groups should avoid exertion outside.",
  },
  {
    label: "Very poor",
    advice: "Limit time outdoors and favor indoor plans; consider a mask on busy streets.",
  },
];

export const AQI_LABELS = AQI_SCALE.map((entry) => entry.label);

export function aqiInfo(aqi: number | null | undefined, fallbackLabel?: string): AqiInfo {
  if (typeof aqi === "number" && Number.isInteger(aqi) && aqi >= 1 && aqi <= 5) {
    const entry = AQI_SCALE.at(aqi - 1);
    if (entry) return { level: aqi as AqiInfo["level"], ...entry };
  }
  return {
    level: null,
    label: fallbackLabel && fallbackLabel.trim() ? fallbackLabel : "Unknown",
    advice: "No current air-quality reading.",
  };
}

export type Season = "winter" | "spring" | "summer" | "autumn";

const NORTHERN_SEASONS: readonly Season[] = [
  "winter",
  "winter",
  "spring",
  "spring",
  "spring",
  "summer",
  "summer",
  "summer",
  "autumn",
  "autumn",
  "autumn",
  "winter",
];

const OPPOSITE: Readonly<Record<Season, Season>> = {
  winter: "summer",
  spring: "autumn",
  summer: "winter",
  autumn: "spring",
};

/** Meteorological season for a month (0–11), flipped south of the equator. */
export function seasonForMonth(monthIndex: number, lat: number): Season {
  const season = NORTHERN_SEASONS.at(((monthIndex % 12) + 12) % 12) ?? "winter";
  if (lat >= 0) return season;
  switch (season) {
    case "winter":
      return OPPOSITE.winter;
    case "spring":
      return OPPOSITE.spring;
    case "summer":
      return OPPOSITE.summer;
    case "autumn":
      return OPPOSITE.autumn;
  }
}

/** Match an AI season name ("Autumn (Fall)", "Dry season"…) to a season. */
export function seasonFromName(name: string): Season | null {
  const value = name.toLowerCase();
  if (value.includes("spring")) return "spring";
  if (value.includes("summer")) return "summer";
  if (value.includes("autumn") || value.includes("fall")) return "autumn";
  if (value.includes("winter")) return "winter";
  return null;
}

/** Short tag for a Google Places `types` entry ("tourist_attraction" → "Tourist attraction"). */
export function formatPlaceType(types: readonly string[] | undefined): string {
  const primary = types?.at(0);
  if (!primary) return "Place";
  const words = primary.replace(/_/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const PRICE_LEVELS: Readonly<Record<string, string>> = {
  PRICE_LEVEL_FREE: "Free",
  PRICE_LEVEL_INEXPENSIVE: "$",
  PRICE_LEVEL_MODERATE: "$$",
  PRICE_LEVEL_EXPENSIVE: "$$$",
  PRICE_LEVEL_VERY_EXPENSIVE: "$$$$",
};

export function priceLabel(priceLevel: string | undefined): string | null {
  if (!priceLevel) return null;
  return Object.entries(PRICE_LEVELS).find(([key]) => key === priceLevel)?.[1] ?? null;
}

export function compactCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (value >= 10_000) return `${Math.round(value / 1000)}k`;
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(value);
}

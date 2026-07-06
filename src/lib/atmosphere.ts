/**
 * Living Atlas atmosphere math (UI innovation proposal, Idea 1).
 *
 * Pure, dependency-free helpers that turn a city's coordinates + cached
 * weather into a small set of presentation values: which pre-generated sky
 * plate to show (dawn/day/dusk/night by *the city's* local solar position,
 * not the visitor's clock), a temperature tint, and a drift duration.
 *
 * Design constraints honored here:
 * - Zero new provider calls: consumes the weather object the page already
 *   fetched (cache-first); every input is optional and degrades gracefully.
 * - Honesty: phase comes from real solar geometry (NOAA-style approximation,
 *   accurate to a few minutes — plenty for choosing 1 of 4 plates).
 * - Palette discipline: tints stay inside the Azure Atlas ladder (azure for
 *   cold, coral/gold for heat) at low chroma so the veil never shouts.
 */

export type SkyPhase = "dawn" | "day" | "dusk" | "night";

export interface AtmosphereInput {
  lat: number;
  lng: number;
  /** Current temperature in °C, if cached weather is available. */
  tempC?: number | null;
  /** Wind speed (m/s) — only modulates drift-animation duration. */
  windSpeed?: number | null;
  /** Injectable clock for tests. */
  now?: Date;
}

export interface Atmosphere {
  phase: SkyPhase;
  /** Public path of the sky plate for this phase. */
  plateSrc: string;
  /** oklch() color string for the temperature veil (transparent when mild). */
  tint: string;
  /** Seconds for one drift half-cycle; windier cities drift faster. */
  driftSeconds: number;
}

const DEG = Math.PI / 180;

function platePath(phase: SkyPhase): string {
  switch (phase) {
    case "dawn":
      return "/images/atlas/atlas-sky-dawn.webp";
    case "day":
      return "/images/atlas/atlas-sky-day.webp";
    case "dusk":
      return "/images/atlas/atlas-sky-dusk.webp";
    case "night":
      return "/images/atlas/atlas-sky-night.webp";
  }
}

function dayOfYear(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  return Math.floor((date.getTime() - start) / 86_400_000);
}

/**
 * Approximate solar altitude (degrees above horizon) at a location and time.
 * Mean-solar-time approximation: ignores the equation of time (±16 min),
 * which cannot flip the phase bands we use.
 */
export function solarAltitudeDeg(lat: number, lng: number, now: Date): number {
  const n = dayOfYear(now);
  const declination = -23.45 * Math.cos((2 * Math.PI * (n + 10)) / 365);
  const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
  const solarHours = (((utcHours + lng / 15) % 24) + 24) % 24;
  const hourAngle = (solarHours - 12) * 15;
  const sinAlt =
    Math.sin(lat * DEG) * Math.sin(declination * DEG) +
    Math.cos(lat * DEG) * Math.cos(declination * DEG) * Math.cos(hourAngle * DEG);
  return Math.asin(Math.max(-1, Math.min(1, sinAlt))) / DEG;
}

/** True while local solar time is before solar noon (sun still climbing). */
function isMorning(lng: number, now: Date): boolean {
  const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;
  const solarHours = (((utcHours + lng / 15) % 24) + 24) % 24;
  return solarHours < 12;
}

/**
 * Phase bands: full day above +8°, full night below −8° (civil-twilight-ish),
 * and the transition band is dawn or dusk depending on whether the sun is
 * rising or setting at that longitude.
 */
export function resolveSkyPhase(lat: number, lng: number, now: Date): SkyPhase {
  const altitude = solarAltitudeDeg(lat, lng, now);
  if (altitude >= 8) return "day";
  if (altitude <= -8) return "night";
  return isMorning(lng, now) ? "dawn" : "dusk";
}

/**
 * Temperature veil. Mild temperatures (10–22°C) are near-transparent; cold
 * pulls toward Deep Azure (hue ~240), heat toward Coral/Dune (hue ~45).
 * Chroma is capped low — this is a breath of color, not a filter.
 */
export function temperatureTint(tempC: number | null | undefined): string {
  if (tempC == null || !Number.isFinite(tempC)) return "transparent";
  if (tempC >= 10 && tempC <= 22) return "transparent";
  if (tempC < 10) {
    // 10°C → alpha .05, −15°C (and colder) → alpha .22
    const strength = Math.min(1, (10 - tempC) / 25);
    const alpha = 0.05 + strength * 0.17;
    return `oklch(0.62 0.09 240 / ${alpha.toFixed(3)})`;
  }
  // 22°C → alpha .05, 40°C (and hotter) → alpha .22
  const strength = Math.min(1, (tempC - 22) / 18);
  const alpha = 0.05 + strength * 0.17;
  return `oklch(0.70 0.11 45 / ${alpha.toFixed(3)})`;
}

/** Calm default 80s; strong wind shortens toward 45s. Never frantic. */
export function driftSeconds(windSpeed: number | null | undefined): number {
  if (windSpeed == null || !Number.isFinite(windSpeed) || windSpeed < 0) return 80;
  return Math.round(Math.max(45, 80 - windSpeed * 2.5));
}

export function getCityAtmosphere(input: AtmosphereInput): Atmosphere {
  const now = input.now ?? new Date();
  const phase = resolveSkyPhase(input.lat, input.lng, now);
  return {
    phase,
    plateSrc: platePath(phase),
    tint: temperatureTint(input.tempC),
    driftSeconds: driftSeconds(input.windSpeed),
  };
}

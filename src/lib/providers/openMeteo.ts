/**
 * Open-Meteo provider (current weather + air quality). Keyless, used both
 * as a pollution source and as an automatic fallback for OpenWeather.
 */
import { httpJson, CircuitOpenError } from "../http";
import { createLogger } from "../logger";

const log = createLogger({ component: "provider/open-meteo" });
const PROVIDER = "open-meteo";

export interface OpenMeteoCurrent {
  tempC: number | null;
  humidity: number | null;
  windKph: number | null;
  weatherCode: number | null;
  observedAt: string;
}

export async function fetchCurrent(lat: number, lng: number): Promise<OpenMeteoCurrent | null> {
  try {
    const data = await httpJson<{
      current?: {
        time?: string;
        temperature_2m?: number;
        relative_humidity_2m?: number;
        wind_speed_10m?: number;
        weather_code?: number;
      };
    }>(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`,
      { provider: PROVIDER, timeoutMs: 10_000 }
    );
    const c = data.current;
    if (!c) return null;
    return {
      tempC: typeof c.temperature_2m === "number" ? c.temperature_2m : null,
      humidity: typeof c.relative_humidity_2m === "number" ? c.relative_humidity_2m : null,
      // Open-Meteo returns wind_speed_10m in km/h by default — do not convert.
      windKph: typeof c.wind_speed_10m === "number" ? c.wind_speed_10m : null,
      weatherCode: typeof c.weather_code === "number" ? c.weather_code : null,
      observedAt: c.time ?? new Date().toISOString(),
    };
  } catch (err) {
    if (err instanceof CircuitOpenError) return null;
    log.warn("fetch_failed", { error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

export async function fetchPm25(lat: number, lng: number): Promise<number | null> {
  try {
    // Use the `current` field for the now-cast value rather than reading the
    // last entry of an `hourly` forecast array (which is ~24h in the future).
    const data = await httpJson<{ current?: { pm2_5?: number } }>(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=pm2_5&timezone=auto`,
      { provider: PROVIDER, timeoutMs: 10_000 }
    );
    const value = data.current?.pm2_5;
    return typeof value === "number" ? value : null;
  } catch (err) {
    if (err instanceof CircuitOpenError) return null;
    log.warn("pm25_failed", { error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

export function conditionFromWeatherCode(code: number | null): string {
  if (code === null) return "unknown";
  if (code === 0) return "clear";
  if (code >= 1 && code <= 3) return "cloudy";
  if (code >= 45 && code <= 48) return "fog";
  // 51-67: drizzle/rain. 80-82: rain showers. 83-84: heavy rain showers.
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code === 83 || code === 84) {
    return "rain";
  }
  // 71-77: snow fall. 85-86: snow showers. 87-88: snow showers (rare codes).
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86) || code === 87 || code === 88) {
    return "snow";
  }
  // 90-94 are reserved/rare thunderstorm-adjacent codes; 95-99 are explicit
  // thunderstorm classifications. Group all under "storm".
  if ((code >= 90 && code <= 94) || (code >= 95 && code <= 99)) return "storm";
  return "unknown";
}

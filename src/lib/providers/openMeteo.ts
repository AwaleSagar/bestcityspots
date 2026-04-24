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
      windKph: typeof c.wind_speed_10m === "number" ? c.wind_speed_10m * 3.6 : null,
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
    const data = await httpJson<{ hourly?: { pm2_5?: number[] } }>(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&hourly=pm2_5&past_days=1&forecast_days=1&timezone=auto`,
      { provider: PROVIDER, timeoutMs: 10_000 }
    );
    const values = data.hourly?.pm2_5;
    if (!values || values.length === 0) return null;
    const latest = values[values.length - 1];
    return typeof latest === "number" ? latest : null;
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
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return "snow";
  if (code >= 95 && code <= 99) return "storm";
  return "unknown";
}

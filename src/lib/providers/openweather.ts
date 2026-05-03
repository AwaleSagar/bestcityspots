/**
 * OpenWeatherMap provider (current weather + air quality).
 * Pure fetcher; orchestration (mapping, caching, fallback) lives elsewhere.
 */
import { httpJson, CircuitOpenError, HttpError } from "../http";
import { createLogger } from "../logger";
import { serverEnv } from "../env";

const log = createLogger({ component: "provider/openweather" });
const PROVIDER = "openweather";
const API = "https://api.openweathermap.org/data/2.5";

export interface OwmCurrent {
  temp: number;
  feelsLike: number;
  tempMin: number;
  tempMax: number;
  humidity: number;
  windSpeed: number;
  description: string;
  main: string;
  icon: string;
}

export interface OwmAqi {
  aqi: number;
}

export type OwmResult =
  | { ok: true; current: OwmCurrent; aqi: OwmAqi | null }
  | { ok: false; reason: "outage" | "auth" | "error" };

export async function fetchCurrentWeather(lat: number, lng: number): Promise<OwmResult> {
  const apiKey = serverEnv().OPENWEATHERMAP_API_KEY;
  if (!apiKey) return { ok: false, reason: "auth" };
  try {
    const [weather, aqi] = await Promise.all([
      httpJson<{
        main: {
          temp: number;
          feels_like: number;
          temp_min: number;
          temp_max: number;
          humidity: number;
        };
        wind: { speed: number };
        weather: { main: string; description: string; icon: string }[];
      }>(`${API}/weather?lat=${lat}&lon=${lng}&units=metric&appid=${encodeURIComponent(apiKey)}`, {
        provider: PROVIDER,
        timeoutMs: 10_000,
      }),
      httpJson<{ list: { main: { aqi: number } }[] }>(
        `${API}/air_pollution?lat=${lat}&lon=${lng}&appid=${encodeURIComponent(apiKey)}`,
        { provider: PROVIDER, timeoutMs: 10_000 }
      ).catch((err) => {
        log.warn("aqi_failed", { error: err instanceof Error ? err.message : String(err) });
        return null;
      }),
    ]);

    // Reject when temperature is missing — prevents "0°C" hallucinations.
    if (typeof weather.main?.temp !== "number") {
      log.warn("missing_temp", { lat, lng });
      return { ok: false, reason: "error" };
    }

    return {
      ok: true,
      current: {
        temp: weather.main.temp,
        feelsLike: weather.main.feels_like ?? weather.main.temp,
        tempMin: weather.main.temp_min ?? weather.main.temp,
        tempMax: weather.main.temp_max ?? weather.main.temp,
        humidity: weather.main.humidity ?? 0,
        windSpeed: weather.wind?.speed ?? 0,
        description: weather.weather?.[0]?.description ?? "unknown",
        main: weather.weather?.[0]?.main ?? "Unknown",
        icon: weather.weather?.[0]?.icon ?? "",
      },
      aqi: aqi?.list?.[0]?.main?.aqi ? { aqi: aqi.list[0].main.aqi } : null,
    };
  } catch (err) {
    if (err instanceof CircuitOpenError) return { ok: false, reason: "outage" };
    if (err instanceof HttpError) {
      if (err.status === 401 || err.status === 403) return { ok: false, reason: "auth" };
      if (err.status === 429) {
        log.warn("rate_limited", { status: err.status });
        return { ok: false, reason: "outage" };
      }
      if (err.status >= 500) return { ok: false, reason: "outage" };
    }
    log.warn("fetch_failed", { error: err instanceof Error ? err.message : String(err) });
    return { ok: false, reason: "error" };
  }
}

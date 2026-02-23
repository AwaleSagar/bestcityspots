import "server-only";
import { supabase } from "./supabase";
import type { City } from "./cities";

export interface CityMetrics {
  cost_index: number | null;
  connectivity_mbps: number | null;
  safety_score: number | null;
  pollution_pm25: number | null;
  climate_comfort: string | null;
  health_access_per_100k: number | null;
  updated_at: string | null;
  source?: Record<string, unknown> | null;
}

async function getOpenMeteoAirQuality(lat: number, lng: number) {
  try {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&hourly=pm2_5&past_days=1&forecast_days=1&timezone=auto`;
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const data = await res.json();
    const values: number[] | undefined = data?.hourly?.pm2_5;
    if (!values || values.length === 0) return null;
    const latest = values[values.length - 1];
    return typeof latest === "number" ? latest : null;
  } catch (e) {
    console.warn("air-quality fetch failed", e);
    return null;
  }
}

async function getOpenMeteoWeather(lat: number, lng: number) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m&timezone=auto`;
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const data = await res.json();
    const temp = data?.current?.temperature_2m;
    return typeof temp === "number" ? temp : null;
  } catch (e) {
    console.warn("weather fetch failed", e);
    return null;
  }
}

function comfortFromTemp(temp: number | null): string | null {
  if (temp === null) return null;
  if (temp >= 30) return "Hot";
  if (temp >= 22) return "Warm";
  if (temp >= 15) return "Mild";
  if (temp >= 5) return "Cool";
  return "Cold";
}

export async function getCityMetrics(city: City): Promise<CityMetrics | null> {
  // 1) Try cached metrics from Supabase
  try {
    const { data, error } = await supabase
      .from("city_metrics")
      .select(
        "cost_index, connectivity_mbps, safety_score, pollution_pm25, climate_comfort, health_access_per_100k, updated_at, source"
      )
      .eq("city_id", city.id)
      .maybeSingle();

    if (!error && data) {
      return {
        cost_index: data.cost_index ?? null,
        connectivity_mbps: data.connectivity_mbps ?? null,
        safety_score: data.safety_score ?? null,
        pollution_pm25: data.pollution_pm25 ?? null,
        climate_comfort: data.climate_comfort ?? null,
        health_access_per_100k: data.health_access_per_100k ?? null,
        updated_at: data.updated_at ?? null,
        source: data.source ?? null,
      };
    }
  } catch (e) {
    console.warn("city_metrics fetch failed", e);
  }

  // 2) Fallback to live open APIs (pollution + temp-based comfort)
  const [pm25, temp] = await Promise.all([
    getOpenMeteoAirQuality(city.lat, city.lng),
    getOpenMeteoWeather(city.lat, city.lng),
  ]);

  return {
    cost_index: null,
    connectivity_mbps: null,
    safety_score: null,
    pollution_pm25: pm25,
    climate_comfort: comfortFromTemp(temp),
    health_access_per_100k: null,
    updated_at: new Date().toISOString(),
    source: {
      pollution: "open-meteo/air-quality",
      climate: "open-meteo/weather",
      cache: "live-fallback",
    },
  };
}

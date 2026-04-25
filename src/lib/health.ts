/**
 * Lightweight dependency health checks. Results are cached briefly so the
 * health endpoint doesn't hammer providers.
 */
import "server-only";
import { getAnonClient, hasServerClient } from "./supabase";
import { isCircuitOpen } from "./http";
import { serverEnv } from "./env";

export interface HealthReport {
  ok: boolean;
  version: number;
  checks: {
    supabaseAnon: "ok" | "missing" | "error";
    supabaseServer: "ok" | "missing";
    googlePlaces: "configured" | "missing" | "circuit_open";
    openweather: "configured" | "missing" | "circuit_open";
    gemini: "configured" | "missing" | "circuit_open";
  };
  generatedAt: string;
}

const HEALTH_CACHE_MS = 60_000;
let cache: { at: number; report: HealthReport } | null = null;

export async function getHealth(): Promise<HealthReport> {
  const now = Date.now();
  if (cache && now - cache.at < HEALTH_CACHE_MS) {
    return cache.report;
  }

  const env = serverEnv();

  // Supabase anon: attempt a trivial query (head count on cities).
  let anonCheck: "ok" | "missing" | "error" = "missing";
  const anon = getAnonClient();
  if (anon) {
    try {
      const { error } = await anon
        .from("cities")
        .select("id", { count: "exact", head: true })
        .limit(1);
      anonCheck = error ? "error" : "ok";
    } catch {
      anonCheck = "error";
    }
  }

  function providerState(
    key: string | undefined,
    provider: string
  ): "configured" | "missing" | "circuit_open" {
    if (!key) return "missing";
    return isCircuitOpen(provider) ? "circuit_open" : "configured";
  }

  const report: HealthReport = {
    ok: true,
    version: 1,
    checks: {
      supabaseAnon: anonCheck,
      supabaseServer: hasServerClient() ? "ok" : "missing",
      googlePlaces: providerState(env.GOOGLE_PLACES_API_KEY, "google-places"),
      openweather: providerState(env.OPENWEATHERMAP_API_KEY, "openweather"),
      gemini: providerState(env.GOOGLE_GEMINI_API_KEY, "gemini"),
    },
    generatedAt: new Date().toISOString(),
  };

  // Overall `ok` = DB is reachable and no circuit is open.
  report.ok =
    anonCheck === "ok" &&
    report.checks.googlePlaces !== "circuit_open" &&
    report.checks.openweather !== "circuit_open" &&
    report.checks.gemini !== "circuit_open";

  cache = { at: now, report };
  return report;
}

import "server-only";

import { serverEnv } from "./env";

type PaidProvider = "gemini" | "google-places";

const providerState = new Map<PaidProvider, { day: string; count: number }>();
const warned = new Set<string>();

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function warnOnce(key: string, message: string): void {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(message);
}

function parseLimit(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function isPaidProviderEnabled(provider: PaidProvider): boolean {
  const env = serverEnv();
  const flag =
    provider === "gemini"
      ? env.GOOGLE_GEMINI_LIVE_FETCH_ENABLED
      : env.GOOGLE_PLACES_LIVE_FETCH_ENABLED;

  if (flag === "true") return true;
  if (flag === "false") return false;

  // Production defaults to cache-only. Local development can still exercise
  // providers when a key is present, but prod spend must be explicitly enabled.
  return env.NODE_ENV !== "production";
}

export function tryClaimPaidProviderUse(provider: PaidProvider, context: string): boolean {
  if (!isPaidProviderEnabled(provider)) {
    warnOnce(
      `${provider}:disabled`,
      `[cost-guard] ${provider} live calls disabled; served cache/fallback for ${context}`
    );
    return false;
  }

  const env = serverEnv();
  const limit =
    provider === "gemini"
      ? parseLimit(env.GOOGLE_GEMINI_DAILY_CALL_LIMIT, env.NODE_ENV === "production" ? 25 : 500)
      : parseLimit(env.GOOGLE_PLACES_DAILY_CALL_LIMIT, env.NODE_ENV === "production" ? 100 : 1_000);

  const day = todayKey();
  const current = providerState.get(provider);
  const state = current?.day === day ? current : { day, count: 0 };

  if (state.count >= limit) {
    warnOnce(
      `${provider}:limit:${day}`,
      `[cost-guard] ${provider} daily limit ${limit} reached; blocked ${context}`
    );
    providerState.set(provider, state);
    return false;
  }

  state.count += 1;
  providerState.set(provider, state);
  return true;
}

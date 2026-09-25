import "server-only";

import { serverEnv } from "./env";
import { getServerClient } from "./supabase";

type PaidProvider = "gemini" | "google-places" | "openai";

// In-memory mirror of the durable counter. Used as (a) a fast-path reject so
// an exhausted budget doesn't keep hitting the database, and (b) a fallback
// when Supabase is unavailable (dev/tests). It is NOT the source of truth —
// the incident showed a per-process Map resets on every container restart
// (root cause 3), so the authoritative counter lives in Supabase and is
// claimed atomically via the claim_provider_use() RPC.
const providerState = new Map<BudgetKey, { day: string; count: number }>();
const warned = new Set<string>();

/**
 * Budgets are keyed by provider, plus one synthetic key for on-demand AI
 * (audit M-2). `/api/cities/insight` is unauthenticated and generates for any
 * city whose cached insight is cold or stale, so without a second, smaller
 * envelope a handful of requests naming uncached cities could claim the whole
 * daily provider budget and leave nothing for the nightly warmer — which is
 * the path that produces value for every later visitor. On-demand requests
 * claim from BOTH this envelope and their provider's, so the guarantee is:
 * visitor-triggered generation can never consume more than ON_DEMAND_AI_KEY's
 * limit per day, whichever engine serves it.
 */
const ON_DEMAND_AI_KEY = "ai-on-demand" as const;
type BudgetKey = PaidProvider | typeof ON_DEMAND_AI_KEY;

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
      : provider === "openai"
        ? env.OPENAI_LIVE_FETCH_ENABLED
        : env.GOOGLE_PLACES_LIVE_FETCH_ENABLED;

  if (flag === "true") return true;
  if (flag === "false") return false;

  // Production defaults to cache-only. Local development can still exercise
  // providers when a key is present, but prod spend must be explicitly enabled.
  return env.NODE_ENV !== "production";
}

function dailyLimit(provider: PaidProvider): number {
  const env = serverEnv();
  if (provider === "gemini") {
    return parseLimit(env.GOOGLE_GEMINI_DAILY_CALL_LIMIT, env.NODE_ENV === "production" ? 25 : 500);
  }
  if (provider === "openai") {
    return parseLimit(env.OPENAI_DAILY_CALL_LIMIT, env.NODE_ENV === "production" ? 25 : 500);
  }
  return parseLimit(
    env.GOOGLE_PLACES_DAILY_CALL_LIMIT,
    env.NODE_ENV === "production" ? 100 : 1_000
  );
}

/**
 * Daily envelope for visitor-triggered (on-demand) AI generation. Deliberately
 * a small fraction of the provider budget so an unauthenticated caller cannot
 * starve the cache warmer. Configurable via `AI_ON_DEMAND_DAILY_CALL_LIMIT`.
 */
function onDemandAiLimit(): number {
  const env = serverEnv();
  return parseLimit(env.AI_ON_DEMAND_DAILY_CALL_LIMIT, env.NODE_ENV === "production" ? 5 : 100);
}

function localState(provider: BudgetKey, day: string): { day: string; count: number } {
  const current = providerState.get(provider);
  const state = current?.day === day ? current : { day, count: 0 };
  providerState.set(provider, state);
  return state;
}

/**
 * Shared claim mechanics for any budget key: in-memory fast path, durable
 * atomic claim via `claim_provider_use()`, fail-closed in production.
 */
async function claimBudget(key: BudgetKey, limit: number, context: string): Promise<boolean> {
  const day = todayKey();
  const state = localState(key, day);

  if (state.count >= limit) {
    warnOnce(
      `${key}:limit:${day}`,
      `[cost-guard] ${key} daily limit ${limit} reached; blocked ${context}`
    );
    return false;
  }

  const client = getServerClient();
  const isProd = serverEnv().NODE_ENV === "production";

  if (client) {
    try {
      const { data, error } = await client.rpc("claim_provider_use", {
        p_provider: key,
        p_day: day,
        p_limit: limit,
      });

      if (error) throw error;

      if (data === true) {
        state.count += 1;
        return true;
      }

      // Budget exhausted (possibly by another instance or the warmer):
      // pin the local mirror so subsequent calls reject without a DB hit.
      state.count = limit;
      warnOnce(
        `${key}:limit:${day}`,
        `[cost-guard] ${key} daily limit ${limit} reached (durable); blocked ${context}`
      );
      return false;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (isProd) {
        // Fail closed: an unreachable budget store must never translate into
        // unmetered spend. Cache/fallback paths handle the denial gracefully.
        warnOnce(
          `${key}:claim-error:${day}`,
          `[cost-guard] durable claim failed (${message}); failing closed for ${context}`
        );
        return false;
      }
      warnOnce(
        `${key}:claim-error:${day}`,
        `[cost-guard] durable claim failed (${message}); using in-memory fallback`
      );
      // fall through to in-memory accounting below
    }
  } else if (isProd) {
    warnOnce(
      `${key}:no-client`,
      `[cost-guard] no secret-key client (SUPABASE_SECRET_KEY) in production; failing closed for ${context}`
    );
    return false;
  }

  // In-memory fallback (dev/test, or non-prod DB failure).
  state.count += 1;
  return true;
}

/**
 * Claim one visitor-triggered AI generation against the on-demand envelope
 * (audit M-2). Call this BEFORE the provider call in any request path a user
 * can trigger; the provider's own budget is still claimed inside the provider
 * module, so both envelopes apply.
 */
export async function tryClaimOnDemandAiUse(context: string): Promise<boolean> {
  return claimBudget(ON_DEMAND_AI_KEY, onDemandAiLimit(), context);
}

/**
 * Atomically claim one paid provider call against the shared daily budget.
 *
 * Resolution order:
 *  1. Kill switch (`GOOGLE_*_LIVE_FETCH_ENABLED`) — cache-only when off.
 *  2. In-memory fast path — once this process has observed exhaustion, no
 *     further DB round-trips are made for the rest of the day.
 *  3. Durable claim via the Supabase `claim_provider_use()` RPC (atomic
 *     check-and-increment; shared across restarts, replicas, and the
 *     cache warmer).
 *  4. If Supabase is unreachable: **fail closed in production** (serve
 *     cache/fallback rather than risk unbounded spend); fall back to
 *     in-memory counting elsewhere.
 */
export async function tryClaimPaidProviderUse(
  provider: PaidProvider,
  context: string
): Promise<boolean> {
  if (!isPaidProviderEnabled(provider)) {
    warnOnce(
      `${provider}:disabled`,
      `[cost-guard] ${provider} live calls disabled; served cache/fallback for ${context}`
    );
    return false;
  }

  return claimBudget(provider, dailyLimit(provider), context);
}

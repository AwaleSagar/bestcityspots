/**
 * Centralized, Zod-validated environment configuration.
 *
 * - `publicEnv()` returns variables safe to expose to the client (NEXT_PUBLIC_*).
 * - `serverEnv()` returns variables that must only be read from server-only code.
 *
 * Both are lazy and memoized so that merely importing this module never crashes
 * in test/CI/build environments that don't have secrets populated.
 *
 * Each variable is validated on its own: a malformed value is dropped (with a
 * one-time warning) without discarding the others, so e.g. a typo in
 * NEXT_PUBLIC_CONTACT_EMAIL can't silently disable Supabase.
 *
 * Callers should read the property they need; missing values resolve to
 * `undefined`. Call `requireServerEnv()` / `requirePublicEnv()` when a value is
 * strictly required and you want a loud error at the call site instead.
 *
 * The full, documented list lives in `.env.example`.
 */
import { z } from "zod";

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  // Publishable keys are safe in the browser; RLS decides what they can read.
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .regex(/^sb_publishable_[A-Za-z0-9_-]{10,}$/, "must be a publishable key (sb_publishable_…)")
    .optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION: z.string().optional(),
  NEXT_PUBLIC_ANALYTICS_DEV: z.string().optional(),
  // SEO Phase 1 (audit T11/T12): comma-separated list of canonical social /
  // brand URLs surfaced in Organization JSON-LD `sameAs`. Optional — when
  // unset the field is simply omitted from the structured data block.
  NEXT_PUBLIC_ORGANIZATION_SAME_AS: z.string().optional(),
  NEXT_PUBLIC_CONTACT_EMAIL: z.string().email().optional(),
  // US-13: Booking.com partner id — affiliate links render only when set.
  NEXT_PUBLIC_BOOKING_AFFILIATE_ID: z.string().min(3).optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).optional(),
});

const serverSchema = z.object({
  // Secret keys bypass RLS: server-only, never NEXT_PUBLIC_.
  SUPABASE_SECRET_KEY: z
    .string()
    .regex(/^sb_secret_[A-Za-z0-9_-]{10,}$/, "must be a secret key (sb_secret_…)")
    .optional(),
  GOOGLE_PLACES_API_KEY: z.string().min(10).optional(),
  GOOGLE_GEMINI_API_KEY: z.string().min(10).optional(),
  GOOGLE_PLACES_LIVE_FETCH_ENABLED: z.enum(["true", "false"]).optional(),
  GOOGLE_GEMINI_LIVE_FETCH_ENABLED: z.enum(["true", "false"]).optional(),
  GOOGLE_PLACES_DAILY_CALL_LIMIT: z.string().regex(/^\d+$/).optional(),
  GOOGLE_GEMINI_DAILY_CALL_LIMIT: z.string().regex(/^\d+$/).optional(),
  // OpenAI fallback provider (see src/lib/providers/ai.ts)
  OPENAI_API_KEY: z.string().min(10).optional(),
  OPENAI_LIVE_FETCH_ENABLED: z.enum(["true", "false"]).optional(),
  OPENAI_DAILY_CALL_LIMIT: z.string().regex(/^\d+$/).optional(),
  /**
   * Daily envelope for visitor-triggered AI generation (audit M-2). Claimed
   * in addition to the engine budget so an unauthenticated caller cannot
   * drain the whole provider budget and starve the cache warmer.
   */
  AI_ON_DEMAND_DAILY_CALL_LIMIT: z.string().regex(/^\d+$/).optional(),
  /** Preferred AI engine; the other becomes the fallback. Default: gemini. */
  AI_PROVIDER: z.enum(["gemini", "openai"]).optional(),
  OPENWEATHERMAP_API_KEY: z.string().min(10).optional(),
  /** Bearer token that unlocks the detailed /api/health report. */
  HEALTH_CHECK_TOKEN: z.string().min(16).optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).optional(),
});

export type PublicEnv = z.infer<typeof publicSchema>;
export type ServerEnv = z.infer<typeof serverSchema> & PublicEnv;

/** Retired names from the deleted project. Read only to warn about them. */
const LEGACY_ENV_NAMES = ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"] as const;

let publicCache: PublicEnv | null = null;
let serverCache: ServerEnv | null = null;
const warned = new Set<string>();

function warnOnce(key: string, issue: string) {
  if (warned.has(key)) return;
  warned.add(key);
  // Using console.warn here is intentional — the logger itself depends on env.
  console.warn(`[env] ${key}: ${issue}`);
}

/**
 * Validates each field independently. Empty strings (a bare `FOO=` line) count
 * as unset, so optional values stay optional.
 */
function parseFields<S extends z.ZodRawShape>(
  schema: z.ZodObject<S>,
  raw: Record<string, string | undefined>
): Partial<z.infer<z.ZodObject<S>>> {
  const out: Record<string, unknown> = {};
  for (const [key, fieldSchema] of Object.entries(schema.shape)) {
    // Keys come from the fixed schema above, not from user input.
    // eslint-disable-next-line security/detect-object-injection
    const value = raw[key];
    if (value === undefined || value.trim() === "") continue;
    const parsed = (fieldSchema as z.ZodType).safeParse(value);
    if (parsed.success) {
      // eslint-disable-next-line security/detect-object-injection
      out[key] = parsed.data;
    } else {
      warnOnce(key, parsed.error.issues[0]?.message ?? "invalid value");
    }
  }
  return out as Partial<z.infer<z.ZodObject<S>>>;
}

export function publicEnv(): PublicEnv {
  if (publicCache) return publicCache;
  // NEXT_PUBLIC_* must be referenced literally so Next.js can inline them
  // into client bundles.
  publicCache = parseFields(publicSchema, {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    NEXT_PUBLIC_ANALYTICS_DEV: process.env.NEXT_PUBLIC_ANALYTICS_DEV,
    NEXT_PUBLIC_ORGANIZATION_SAME_AS: process.env.NEXT_PUBLIC_ORGANIZATION_SAME_AS,
    NEXT_PUBLIC_CONTACT_EMAIL: process.env.NEXT_PUBLIC_CONTACT_EMAIL,
    NEXT_PUBLIC_BOOKING_AFFILIATE_ID: process.env.NEXT_PUBLIC_BOOKING_AFFILIATE_ID,
    NODE_ENV: process.env.NODE_ENV,
  }) as PublicEnv;
  return publicCache;
}

export function serverEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error("[env] serverEnv() cannot be called from a client bundle");
  }
  if (serverCache) return serverCache;

  for (const name of LEGACY_ENV_NAMES) {
    // eslint-disable-next-line security/detect-object-injection
    if (process.env[name]) {
      warnOnce(
        name,
        "is no longer read. Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY / SUPABASE_SECRET_KEY instead (see .env.example)."
      );
    }
  }

  const server = parseFields(serverSchema, {
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    GOOGLE_PLACES_API_KEY: process.env.GOOGLE_PLACES_API_KEY,
    GOOGLE_GEMINI_API_KEY: process.env.GOOGLE_GEMINI_API_KEY,
    GOOGLE_PLACES_LIVE_FETCH_ENABLED: process.env.GOOGLE_PLACES_LIVE_FETCH_ENABLED,
    GOOGLE_GEMINI_LIVE_FETCH_ENABLED: process.env.GOOGLE_GEMINI_LIVE_FETCH_ENABLED,
    GOOGLE_PLACES_DAILY_CALL_LIMIT: process.env.GOOGLE_PLACES_DAILY_CALL_LIMIT,
    GOOGLE_GEMINI_DAILY_CALL_LIMIT: process.env.GOOGLE_GEMINI_DAILY_CALL_LIMIT,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_LIVE_FETCH_ENABLED: process.env.OPENAI_LIVE_FETCH_ENABLED,
    OPENAI_DAILY_CALL_LIMIT: process.env.OPENAI_DAILY_CALL_LIMIT,
    AI_ON_DEMAND_DAILY_CALL_LIMIT: process.env.AI_ON_DEMAND_DAILY_CALL_LIMIT,
    AI_PROVIDER: process.env.AI_PROVIDER,
    OPENWEATHERMAP_API_KEY: process.env.OPENWEATHERMAP_API_KEY,
    HEALTH_CHECK_TOKEN: process.env.HEALTH_CHECK_TOKEN,
    NODE_ENV: process.env.NODE_ENV,
    LOG_LEVEL: process.env.LOG_LEVEL,
  });

  serverCache = { ...publicEnv(), ...server } as ServerEnv;
  return serverCache;
}

export function requirePublicEnv<K extends keyof PublicEnv>(key: K): NonNullable<PublicEnv[K]> {
  // eslint-disable-next-line security/detect-object-injection
  const value = publicEnv()[key];
  if (value === undefined || value === null || value === "") {
    throw new Error(`[env] Missing required public env var: ${String(key)}`);
  }
  return value as NonNullable<PublicEnv[K]>;
}

export function requireServerEnv<K extends keyof ServerEnv>(key: K): NonNullable<ServerEnv[K]> {
  // eslint-disable-next-line security/detect-object-injection
  const value = serverEnv()[key];
  if (value === undefined || value === null || value === "") {
    throw new Error(`[env] Missing required server env var: ${String(key)}`);
  }
  return value as NonNullable<ServerEnv[K]>;
}

/** Test-only reset hook. Not exported from index files. */
export function __resetEnvCache(): void {
  publicCache = null;
  serverCache = null;
  warned.clear();
}

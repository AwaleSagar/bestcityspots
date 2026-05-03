/**
 * Centralized, Zod-validated environment configuration.
 *
 * - `publicEnv()` returns variables safe to expose to the client (NEXT_PUBLIC_*).
 * - `serverEnv()` returns variables that must only be read from server-only code.
 *
 * Both are lazy and memoized so that merely importing this module never crashes
 * in test/CI/build environments that don't have secrets populated.
 *
 * Callers should read the property they need; missing values resolve to
 * `undefined` and are reported via a one-time warning. Call `requireServerEnv()`
 * (or `requirePublicEnv()`) when a value is strictly required and you want a
 * loud error at the call site rather than a silent `undefined`.
 */
import { z } from "zod";

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20).optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION: z.string().optional(),
  NEXT_PUBLIC_ANALYTICS_DEV: z.string().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).optional(),
});

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
  GOOGLE_PLACES_API_KEY: z.string().min(10).optional(),
  GOOGLE_GEMINI_API_KEY: z.string().min(10).optional(),
  OPENWEATHERMAP_API_KEY: z.string().min(10).optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).optional(),
});

export type PublicEnv = z.infer<typeof publicSchema>;
export type ServerEnv = z.infer<typeof serverSchema> & PublicEnv;

let publicCache: PublicEnv | null = null;
let serverCache: ServerEnv | null = null;
const warned = new Set<string>();

function warnOnce(key: string, issue: string) {
  if (warned.has(key)) return;
  warned.add(key);
  // Using console.warn here is intentional — the logger itself depends on env.
  console.warn(`[env] ${key}: ${issue}`);
}

export function publicEnv(): PublicEnv {
  if (publicCache) return publicCache;
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    NEXT_PUBLIC_ANALYTICS_DEV: process.env.NEXT_PUBLIC_ANALYTICS_DEV,
    NODE_ENV: process.env.NODE_ENV,
  });
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      warnOnce(String(issue.path[0]), issue.message);
    }
    return {};
  }
  publicCache = parsed.data;
  return publicCache;
}

export function serverEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error("[env] serverEnv() cannot be called from a client bundle");
  }
  if (serverCache) return serverCache;
  const parsed = serverSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    GOOGLE_PLACES_API_KEY: process.env.GOOGLE_PLACES_API_KEY,
    GOOGLE_GEMINI_API_KEY: process.env.GOOGLE_GEMINI_API_KEY,
    OPENWEATHERMAP_API_KEY: process.env.OPENWEATHERMAP_API_KEY,
    NODE_ENV: process.env.NODE_ENV,
    LOG_LEVEL: process.env.LOG_LEVEL,
  });
  const pub = publicEnv();
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      warnOnce(String(issue.path[0]), issue.message);
    }
    return { ...pub };
  }
  serverCache = { ...pub, ...parsed.data };
  return serverCache;
}

export function requirePublicEnv<K extends keyof PublicEnv>(key: K): NonNullable<PublicEnv[K]> {
  const value = publicEnv()[key];
  if (value === undefined || value === null || value === "") {
    throw new Error(`[env] Missing required public env var: ${key}`);
  }
  return value as NonNullable<PublicEnv[K]>;
}

export function requireServerEnv<K extends keyof ServerEnv>(key: K): NonNullable<ServerEnv[K]> {
  const value = serverEnv()[key];
  if (value === undefined || value === null || value === "") {
    throw new Error(`[env] Missing required server env var: ${key}`);
  }
  return value as NonNullable<ServerEnv[K]>;
}

/** Test-only reset hook. Not exported from index files. */
export function __resetEnvCache(): void {
  publicCache = null;
  serverCache = null;
  warned.clear();
}

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { publicEnv, serverEnv } from "./env";

/**
 * Lazy, memoized Supabase clients for the public site.
 *
 * Importing this module never throws — individual callers fail only when they
 * actually *use* a client whose credentials are missing. This lets tests, CI
 * type-checks, and static builds run without real secrets.
 *
 *   - `supabase`: publishable-key client Proxy (Postgres role `anon`; RLS
 *     applies). Constructed on first method access. Safe in the browser.
 *   - `supabaseServer`: secret-key client (role `service_role`; bypasses RLS)
 *     or `null`. Server-only; `null` in client bundles.
 *
 * The admin area uses cookie-bound sessions instead — see src/lib/supabase-admin.ts.
 */

export type TypedSupabaseClient = SupabaseClient<Database>;

let anonCache: TypedSupabaseClient | null | undefined;
let serverCache: TypedSupabaseClient | null | undefined;

function buildAnonClient(): TypedSupabaseClient | null {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } = publicEnv();
  if (!NEXT_PUBLIC_SUPABASE_URL || !NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return null;
  }
  return createClient<Database>(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false },
    global: {
      headers: { "x-client-info": "bestcityspots-web/2.0" },
    },
  });
}

function buildServerClient(): TypedSupabaseClient | null {
  const env = serverEnv();
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
    return null;
  }
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: { "x-client-info": "bestcityspots-server/2.0" },
    },
  });
}

export function getAnonClient(): TypedSupabaseClient | null {
  if (anonCache === undefined) anonCache = buildAnonClient();
  return anonCache;
}

export function getServerClient(): TypedSupabaseClient | null {
  if (typeof window !== "undefined") return null;
  if (serverCache === undefined) serverCache = buildServerClient();
  return serverCache;
}

export function hasServerClient(): boolean {
  return getServerClient() !== null;
}

/**
 * Returns the secret-key client, throwing if it is unavailable.
 *
 * Use this for any *write* path so that a missing `SUPABASE_SECRET_KEY` fails
 * loudly instead of silently degrading to the publishable client (whose writes
 * RLS would reject anyway, masking a real misconfiguration and leaking
 * provider budget on every subsequent cache miss).
 */
export function requireServerClient(): TypedSupabaseClient {
  const client = getServerClient();
  if (!client) {
    throw new Error(
      "[supabase] secret-key client is unavailable — set SUPABASE_SECRET_KEY for privileged writes."
    );
  }
  return client;
}

/** Lazy Proxy: constructs the underlying publishable client on first property access. */
function lazyAnonProxy(): TypedSupabaseClient {
  // Resolved client captured after first successful build so subsequent
  // property accesses skip the `getAnonClient()` hop entirely.
  let resolved: TypedSupabaseClient | null = null;
  return new Proxy(
    {},
    {
      get(_target, prop, receiver) {
        if (!resolved) {
          resolved = getAnonClient();
          if (!resolved) {
            throw new Error(
              "[supabase] public client is unavailable — set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
            );
          }
        }
        const value = Reflect.get(resolved as unknown as object, prop, receiver);
        return typeof value === "function" ? value.bind(resolved) : value;
      },
    }
  ) as unknown as TypedSupabaseClient;
}

/** Publishable-key client — safe to import when env is absent; fails at first use. */
export const supabase: TypedSupabaseClient = lazyAnonProxy();

/**
 * Secret-key client or `null` when `SUPABASE_SECRET_KEY` is missing (or when
 * accessed from a client bundle). Resolved only on the server to avoid
 * triggering `serverEnv()` during client-bundle module evaluation when shared
 * modules (e.g. `cities.ts`) are imported by client components.
 */
export const supabaseServer: TypedSupabaseClient | null =
  typeof window === "undefined" ? getServerClient() : null;

/** Test-only reset. Not exported from any index file. */
export function __resetSupabaseCache(): void {
  anonCache = undefined;
  serverCache = undefined;
}

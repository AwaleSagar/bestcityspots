import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv } from "./env";

/**
 * Lazy, memoized Supabase clients.
 *
 * Importing this module never throws — individual callers fail only when they
 * actually *use* a client whose credentials are missing. This lets tests, CI
 * type-checks, and static builds run without real secrets.
 *
 * Exports (backwards-compatible):
 *   - `supabase`: anon client Proxy. Constructed lazily on first method
 *     access. If `NEXT_PUBLIC_SUPABASE_*` is missing, the first call throws
 *     a clear error instead of crashing the process at import time.
 *   - `supabaseServer`: service-role client or `null`. Eagerly resolved so
 *     existing `if (supabaseServer)` checks keep working unchanged.
 */

let anonCache: SupabaseClient | null | undefined;
let serverCache: SupabaseClient | null | undefined;

function buildAnonClient(): SupabaseClient | null {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = publicEnv();
  if (!NEXT_PUBLIC_SUPABASE_URL || !NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }
  return createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: {
      headers: { "x-client-info": "bestcityspots-anon/1.0" },
    },
  });
}

function buildServerClient(): SupabaseClient | null {
  const env = serverEnv();
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: { "x-client-info": "bestcityspots-server/1.0" },
    },
  });
}

export function getAnonClient(): SupabaseClient | null {
  if (anonCache === undefined) anonCache = buildAnonClient();
  return anonCache;
}

export function getServerClient(): SupabaseClient | null {
  if (serverCache === undefined) serverCache = buildServerClient();
  return serverCache;
}

export function hasServerClient(): boolean {
  return getServerClient() !== null;
}

/** Lazy Proxy: constructs the underlying anon client on first property access. */
function lazyAnonProxy(): SupabaseClient {
  return new Proxy(
    {},
    {
      get(_target, prop, receiver) {
        const real = getAnonClient();
        if (!real) {
          throw new Error(
            "[supabase] anon client is unavailable — set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
          );
        }
        const value = Reflect.get(real as unknown as object, prop, receiver);
        return typeof value === "function" ? value.bind(real) : value;
      },
    }
  ) as unknown as SupabaseClient;
}

/** Anon client — safe to import when env is absent; fails at first use. */
export const supabase: SupabaseClient = lazyAnonProxy();

/**
 * Service-role client or `null` when `SUPABASE_SERVICE_ROLE_KEY` is missing.
 * Preserves the legacy truthy-check pattern used across the codebase.
 */
export const supabaseServer: SupabaseClient | null = getServerClient();

/** Test-only reset. Not exported from any index file. */
export function __resetSupabaseCache(): void {
  anonCache = undefined;
  serverCache = undefined;
}

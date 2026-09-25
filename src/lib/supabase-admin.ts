import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { publicEnv } from "./env";
import type { TypedSupabaseClient } from "./supabase";

/**
 * Cookie-bound Supabase client for the admin area (/admin, /auth).
 *
 * Uses the publishable key plus the signed-in admin's session, so every read
 * goes through RLS as the `authenticated` role — the admin UI never touches
 * the secret key. Session refresh happens in src/proxy.ts.
 */
export async function createAdminSessionClient(): Promise<TypedSupabaseClient | null> {
  const { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key } = publicEnv();
  if (!url || !key) return null;

  const cookieStore = await cookies();
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components can't write cookies; src/proxy.ts refreshes the
          // session on the next request, so this is safe to ignore.
        }
      },
    },
  });
}

export type AdminContext =
  | { status: "unconfigured" }
  | { status: "signed-out" }
  | { status: "forbidden"; email: string | null }
  | { status: "admin"; email: string | null; client: TypedSupabaseClient };

/**
 * Resolves who is asking. `getClaims()` verifies the JWT signature (never
 * trust `getSession()` on the server); admin status comes from app_admins,
 * whose RLS policy only reveals the caller's own row.
 */
export async function getAdminContext(): Promise<AdminContext> {
  const client = await createAdminSessionClient();
  if (!client) return { status: "unconfigured" };

  const { data, error } = await client.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return { status: "signed-out" };

  const email = typeof claims.email === "string" ? claims.email : null;
  const { data: membership } = await client
    .from("app_admins")
    .select("user_id")
    .eq("user_id", claims.sub)
    .maybeSingle();

  return membership ? { status: "admin", email, client } : { status: "forbidden", email };
}

/** Post-login redirects may only land inside the admin area. */
export function safeAdminPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/admin") || next.startsWith("//") || next.includes("\\")) {
    return "/admin";
  }
  return next;
}

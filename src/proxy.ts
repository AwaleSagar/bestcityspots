import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";

/**
 * Keeps admin sessions alive: verifies (and when needed refreshes) the
 * Supabase auth token on admin routes and writes the refreshed cookies to both
 * the forwarded request and the response. Public pages never run this — the
 * site itself is anonymous — so it adds no latency there.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key } = publicEnv();
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        // Responses carrying auth cookies must never be cached by a CDN.
        for (const [header, value] of Object.entries(headers ?? {})) {
          response.headers.set(header, value);
        }
      },
    },
  });

  // Don't put code between client creation and getClaims(): it is what
  // refreshes an expiring session.
  await supabase.auth.getClaims();

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/auth/:path*"],
};

import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createAdminSessionClient, safeAdminPath } from "@/lib/supabase-admin";

const OTP_TYPES: readonly EmailOtpType[] = ["email", "magiclink", "invite", "recovery"];

/**
 * Magic-link landing. Handles both link styles Supabase can send:
 *   ?token_hash=…&type=email   (supabase/templates/magic_link.html; works on any device)
 *   ?code=…                    (default template, PKCE; same browser only)
 * and then redirects inside /admin only.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const next = safeAdminPath(searchParams.get("next"));
  const failure = NextResponse.redirect(new URL("/admin/login?error=link", origin));

  const client = await createAdminSessionClient();
  if (!client) return failure;

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  if (tokenHash && type && OTP_TYPES.includes(type)) {
    const { error } = await client.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(new URL(next, origin));
  } else if (code) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }

  return failure;
}

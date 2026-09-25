"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminSessionClient } from "@/lib/supabase-admin";
import { getSiteUrl } from "@/lib/site";
import { createLogger } from "@/lib/logger";

const log = createLogger({ component: "admin-auth" });

export interface MagicLinkState {
  status: "idle" | "sent" | "invalid" | "unavailable";
}

const emailSchema = z.string().trim().toLowerCase().email().max(320);

/**
 * Emails a one-time sign-in link. Sign-up is disabled (`shouldCreateUser:
 * false`), and the response is identical whether or not the address belongs
 * to an admin, so the form can't be used to discover accounts.
 */
export async function requestMagicLink(
  _previous: MagicLinkState,
  formData: FormData
): Promise<MagicLinkState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { status: "invalid" };

  const client = await createAdminSessionClient();
  if (!client) return { status: "unavailable" };

  const { error } = await client.auth.signInWithOtp({
    email: parsed.data,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${getSiteUrl()}/auth/confirm?next=/admin`,
    },
  });
  if (error) {
    // Unknown addresses fail here too — log the reason, don't reveal it.
    log.info("magic_link_not_sent", { reason: error.code ?? error.message });
  }
  return { status: "sent" };
}

export async function signOut(): Promise<void> {
  const client = await createAdminSessionClient();
  await client?.auth.signOut();
  redirect("/admin/login");
}

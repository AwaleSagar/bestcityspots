/**
 * Manage admin accounts (invite-only; public sign-up is disabled).
 *
 *   npm run admin -- add <email>      create the account if needed + grant admin
 *   npm run admin -- remove <email>   revoke admin (the auth account is kept)
 *   npm run admin -- list             show current admins
 *
 * Admins sign in at /admin/login with an emailed magic link. Requires
 * SUPABASE_SECRET_KEY — run it from a trusted machine, never in the browser.
 */

import { z } from "zod";
import { describeTarget, secretClient } from "./db/env";

const email = z.string().trim().toLowerCase().email().max(320);

async function findUserByEmail(db: ReturnType<typeof secretClient>, address: string) {
  // listUsers is paginated; admin sets are tiny, but walk pages to be correct.
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    const hit = data.users.find((user) => user.email?.toLowerCase() === address);
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function add(address: string) {
  const db = secretClient();
  let user = await findUserByEmail(db, address);
  if (!user) {
    // email_confirm: the admin proves ownership on first magic-link sign-in.
    const { data, error } = await db.auth.admin.createUser({ email: address, email_confirm: true });
    if (error || !data.user) throw new Error(`createUser: ${error?.message ?? "no user returned"}`);
    user = data.user;
    console.log(`  · created auth account for ${address}`);
  }

  const { error } = await db
    .from("app_admins")
    .upsert({ user_id: user.id, email: address }, { onConflict: "user_id" });
  if (error) throw new Error(`app_admins: ${error.message}`);
  console.log(`✓ ${address} is an admin on ${describeTarget()}. Sign in at /admin/login.`);
}

async function remove(address: string) {
  const db = secretClient();
  const { data, error } = await db.from("app_admins").delete().eq("email", address).select("email");
  if (error) throw new Error(`app_admins: ${error.message}`);
  console.log(
    data.length > 0 ? `✓ removed admin access for ${address}` : `· ${address} was not an admin`
  );
}

async function list() {
  const db = secretClient();
  const { data, error } = await db
    .from("app_admins")
    .select("email, created_at")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`app_admins: ${error.message}`);
  if (data.length === 0) {
    console.log("No admins yet. Add one with: npm run admin -- add you@example.com");
    return;
  }
  for (const row of data) console.log(`  ${row.email}  (since ${row.created_at.slice(0, 10)})`);
}

async function main() {
  const [command, rawEmail] = process.argv.slice(2);
  if (command === "list") return list();
  if (command !== "add" && command !== "remove") {
    console.error("Usage: npm run admin -- add|remove <email>  |  npm run admin -- list");
    process.exit(1);
  }
  const parsed = email.safeParse(rawEmail);
  if (!parsed.success) {
    console.error("Please pass a valid email address.");
    process.exit(1);
  }
  return command === "add" ? add(parsed.data) : remove(parsed.data);
}

main().catch((error) => {
  console.error(`✗ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});

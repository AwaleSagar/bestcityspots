/**
 * Credentials for operational scripts (seed, admin, smoke test).
 *
 * Reads `.env.local`, then `.env` (shell variables win). Only the current
 * Supabase key names are accepted; the retired JWT-era names are rejected with
 * a pointer to .env.example so a stale file can't silently target nothing.
 */

import { config as loadEnv } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/database.types";

loadEnv({ path: ".env.local", quiet: true });
loadEnv({ quiet: true });

const LEGACY_NAMES = ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"];

export function warnOnLegacyEnv(): void {
  for (const name of LEGACY_NAMES) {
    if (process.env[name]) {
      console.warn(
        `⚠ ${name} is set but no longer read. Use NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY / SUPABASE_SECRET_KEY (see .env.example).`
      );
    }
  }
}

function fail(message: string): never {
  console.error(`✗ ${message}\n  See .env.example and supabase/README.md.`);
  process.exit(1);
}

export function supabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) fail("NEXT_PUBLIC_SUPABASE_URL is not set.");
  try {
    return new URL(url).toString().replace(/\/$/, "");
  } catch {
    fail("NEXT_PUBLIC_SUPABASE_URL is not a valid URL.");
  }
}

/** Client using the secret key (maps to service_role; bypasses RLS). */
export function secretClient(): SupabaseClient<Database> {
  warnOnLegacyEnv();
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) fail("SUPABASE_SECRET_KEY is not set.");
  if (!key.startsWith("sb_secret_"))
    fail("SUPABASE_SECRET_KEY must be a secret key (sb_secret_…).");
  return createClient<Database>(supabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Client using the publishable key (maps to anon; RLS applies). */
export function publishableClient(): SupabaseClient<Database> {
  warnOnLegacyEnv();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!key) fail("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set.");
  if (!key.startsWith("sb_publishable_")) {
    fail("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be a publishable key (sb_publishable_…).");
  }
  return createClient<Database>(supabaseUrl(), key, { auth: { persistSession: false } });
}

/** Host only — safe to print (never print keys). */
export function describeTarget(): string {
  return new URL(supabaseUrl()).host;
}

/**
 * Docker-free database harness: applies supabase/migrations (and optionally
 * supabase/seed.sql) to PGlite — Postgres compiled to WASM, running in-process —
 * on top of a minimal Supabase platform shim (scripts/db/supabase-shim.sql).
 *
 * This is a fast pre-flight, not a replacement for the real stack: CI also runs
 * the same pgTAP files with `supabase test db` against genuine Supabase images.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { fuzzystrmatch } from "@electric-sql/pglite/contrib/fuzzystrmatch";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { unaccent } from "@electric-sql/pglite/contrib/unaccent";
import { pgtap } from "@electric-sql/pglite-pgtap";

export const MIGRATIONS_DIR = "supabase/migrations";
export const SEED_FILE = "supabase/seed.sql";
export const TESTS_DIR = "supabase/tests/database";
const SHIM_FILE = "scripts/db/supabase-shim.sql";

export function listSqlFiles(dir: string, suffix = ".sql"): string[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith(suffix))
    .sort()
    .map((name) => join(dir, name));
}

export interface HarnessOptions {
  seed?: boolean;
  onStep?: (step: string) => void;
}

export async function createDatabase(options: HarnessOptions = {}): Promise<PGlite> {
  const db = await PGlite.create({ extensions: { fuzzystrmatch, pg_trgm, unaccent, pgtap } });
  const step = options.onStep ?? (() => {});

  step("supabase platform shim");
  await db.exec(readFileSync(SHIM_FILE, "utf8"));

  for (const file of listSqlFiles(MIGRATIONS_DIR)) {
    step(file);
    try {
      await db.exec(readFileSync(file, "utf8"));
    } catch (error) {
      throw new Error(`${file}: ${describe(error)}`);
    }
  }

  if (options.seed) {
    step(SEED_FILE);
    try {
      await db.exec(readFileSync(SEED_FILE, "utf8"));
    } catch (error) {
      throw new Error(`${SEED_FILE}: ${describe(error)}`);
    }
  }

  await db.exec("create extension if not exists pgtap with schema extensions;");
  return db;
}

export interface TapResult {
  file: string;
  planned: number | null;
  passed: number;
  failures: string[];
  error: string | null;
}

/** Runs one pgTAP file (`begin; select plan(n); … select * from finish(); rollback;`). */
export async function runTapFile(db: PGlite, file: string): Promise<TapResult> {
  const result: TapResult = { file, planned: null, passed: 0, failures: [], error: null };
  // pgTAP lives in `extensions` on Supabase; tests call it unqualified.
  const sql = `set search_path = public, extensions;\n${readFileSync(file, "utf8")}`;

  try {
    const outputs = await db.exec(sql);
    for (const output of outputs) {
      for (const row of output.rows) {
        for (const value of Object.values(row)) {
          if (typeof value !== "string") continue;
          for (const line of value.split("\n")) {
            const plan = /^1\.\.(\d+)/.exec(line);
            if (plan) result.planned = Number(plan[1]);
            else if (line.startsWith("not ok")) result.failures.push(line);
            else if (line.startsWith("ok")) result.passed += 1;
            else if (line.startsWith("#") && result.failures.length > 0) {
              result.failures[result.failures.length - 1] += `\n      ${line}`;
            }
          }
        }
      }
    }
  } catch (error) {
    result.error = describe(error);
    await db.exec("rollback;").catch(() => {});
  } finally {
    await db.exec("reset role; reset search_path;").catch(() => {});
  }

  return result;
}

function describe(error: unknown): string {
  if (error && typeof error === "object") {
    const e = error as { message?: string; detail?: string; hint?: string; where?: string };
    return [e.message, e.detail, e.hint, e.where].filter(Boolean).join(" | ");
  }
  return String(error);
}

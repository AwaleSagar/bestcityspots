/**
 * Migration hygiene check — runs in CI (`npm run check:migrations`).
 *
 * The database is deployed by replaying `supabase/migrations/*.sql` in order,
 * while `supabase/setup_all_blank_project.sql` is the one-shot script for a
 * blank project. Those two must not drift: a migration that never lands in the
 * baseline means a fresh environment silently lacks it (this actually happened
 * to the search_cities_elastic coord-type fix and the visitor-stats weighting
 * fix). Nothing catches that at runtime — the app just behaves differently in
 * a rebuilt project — so it is checked here instead.
 *
 * Checks:
 *  1. Filename convention: `<YYYYMMDDHHMM>_<snake_case>.sql`, with a plausible
 *     timestamp.
 *  2. Every migration is mirrored by a section header in the baseline file.
 *  3. Each migration carries an idempotency guard (`if not exists`,
 *     `create or replace`, `drop ... if exists`, `on conflict`, or an explicit
 *     `-- not-idempotent:` opt-out with a reason) — the convention documented
 *     in supabase/migrations/README.md.
 *  4. Every `security definer` function in a migration pins `set search_path`
 *     and revokes the default PUBLIC grant (2026-09-12 audit H-1/L-2).
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = "supabase/migrations";
const BASELINE_FILE = "supabase/setup_all_blank_project.sql";
const FILENAME_RE = /^(\d{12})_[a-z0-9]+(?:_[a-z0-9]+)*\.sql$/;

const IDEMPOTENCY_MARKERS = [
  "if not exists",
  "create or replace",
  "if exists",
  "on conflict",
  "-- not-idempotent:",
];

const problems: string[] = [];

function fail(file: string, message: string) {
  problems.push(`${file}: ${message}`);
}

const files = readdirSync(MIGRATIONS_DIR)
  .filter((name) => name.endsWith(".sql"))
  .sort();

if (files.length === 0) {
  console.error(`No migrations found in ${MIGRATIONS_DIR}`);
  process.exit(1);
}

const baseline = readFileSync(BASELINE_FILE, "utf8");
// Only section headers count as "mirrored" — a passing mention of a migration
// inside another section's prose does not mean its SQL is present.
const mirrored = new Set(
  [...baseline.matchAll(/^--\s*═+\s*(.*?)\s*═+\s*$/gm)]
    .flatMap((match) => [...match[1].matchAll(/(\d{12}_[a-z0-9_]+\.sql)/g)])
    .map((match) => match[1])
);

for (const file of files) {
  const match = FILENAME_RE.exec(file);
  if (!match) {
    fail(
      file,
      "filename must be <YYYYMMDDHHMM>_<snake_case_description>.sql (see supabase/migrations/README.md)"
    );
    continue;
  }

  const [, stamp] = match;
  const year = Number(stamp.slice(0, 4));
  const month = Number(stamp.slice(4, 6));
  const day = Number(stamp.slice(6, 8));
  const hour = Number(stamp.slice(8, 10));
  const minute = Number(stamp.slice(10, 12));
  if (year < 2024 || month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) {
    fail(file, `implausible timestamp prefix "${stamp}"`);
  }

  if (!mirrored.has(file)) {
    fail(
      file,
      `not mirrored in ${BASELINE_FILE} — a blank project would be missing this change. Append a "-- ═══ migrations/${file} ═══" section with its SQL.`
    );
  }

  const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
  const lower = sql.toLowerCase();

  if (!IDEMPOTENCY_MARKERS.some((marker) => lower.includes(marker))) {
    fail(
      file,
      "no idempotency guard found (if not exists / create or replace / drop ... if exists / on conflict). Add one, or document the exception with a `-- not-idempotent: <reason>` comment."
    );
  }

  if (lower.includes("security definer")) {
    if (!lower.includes("set search_path")) {
      fail(
        file,
        "declares a SECURITY DEFINER function without `set search_path` (security audit L-2)"
      );
    }
    if (
      !lower.includes("revoke all on function") &&
      !lower.includes("revoke execute on function")
    ) {
      fail(
        file,
        "declares a SECURITY DEFINER function without revoking the default PUBLIC execute grant (security audit H-1)"
      );
    }
  }
}

if (problems.length > 0) {
  console.error("Migration checks failed:\n");
  for (const problem of problems) console.error(`  ✗ ${problem}`);
  console.error("");
  process.exit(1);
}

console.log(`✓ ${files.length} migrations pass naming, mirroring, and security checks`);

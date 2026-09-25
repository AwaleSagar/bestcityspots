/**
 * Migration policy check — `npm run check:migrations` (part of `npm run verify`).
 *
 * Static rules every file in supabase/migrations/ must follow (see
 * supabase/README.md). They encode the security model; the pgTAP suite
 * (supabase/tests/database/00_security_posture.test.sql) verifies the same
 * posture against a live database.
 *
 *  1. Filenames are Supabase CLI style: `<YYYYMMDDHHMMSS>_<snake_case>.sql`.
 *  2. Every `create table public.x` enables RLS on it and GRANTs it explicitly
 *     in the same file (new projects no longer auto-expose tables).
 *  3. No SECURITY DEFINER functions — they bypass RLS. Use invoker functions
 *     with EXECUTE granted to the roles that need them.
 *  4. Every function pins `search_path` and revokes PUBLIC's default EXECUTE.
 *  5. Every view is `security_invoker = true`.
 *  6. The retired JWT-era key names never reappear outside the allowlist.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const MIGRATIONS_DIR = "supabase/migrations";
const FILENAME_RE = /^(\d{14})_[a-z0-9]+(?:_[a-z0-9]+)*\.sql$/;

const problems: string[] = [];
const fail = (file: string, message: string) => problems.push(`${file}: ${message}`);

/** Drop `--` comments so prose can't satisfy (or trip) a rule. */
function stripComments(sql: string): string {
  return sql.replace(/--[^\n]*/g, "");
}

const files = readdirSync(MIGRATIONS_DIR)
  .filter((name) => name.endsWith(".sql"))
  .sort();

if (files.length === 0) {
  console.error(`No migrations found in ${MIGRATIONS_DIR}`);
  process.exit(1);
}

for (const file of files) {
  const match = FILENAME_RE.exec(file);
  if (!match) {
    fail(
      file,
      "filename must be <YYYYMMDDHHMMSS>_<snake_case>.sql (npx supabase migration new <name>)"
    );
    continue;
  }
  const stamp = match[1];
  const [year, month, day, hour, minute, second] = [
    stamp.slice(0, 4),
    stamp.slice(4, 6),
    stamp.slice(6, 8),
    stamp.slice(8, 10),
    stamp.slice(10, 12),
    stamp.slice(12, 14),
  ].map(Number);
  if (
    year < 2026 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    fail(file, `implausible timestamp prefix "${stamp}"`);
  }

  const sql = stripComments(readFileSync(join(MIGRATIONS_DIR, file), "utf8")).toLowerCase();

  // Rule 2: RLS + explicit grants per table.
  for (const [, table] of sql.matchAll(/create table (?:if not exists )?public\.([a-z0-9_]+)/g)) {
    if (!new RegExp(`alter table public\\.${table} enable row level security`).test(sql)) {
      fail(file, `table public.${table} does not enable row level security`);
    }
    if (!new RegExp(`grant [a-z, ]+ on (?:table )?public\\.${table} to`).test(sql)) {
      fail(file, `table public.${table} has no explicit GRANT`);
    }
  }

  // Rule 3.
  if (/security\s+definer/.test(sql)) {
    fail(file, "SECURITY DEFINER is not allowed (it bypasses RLS) — use an invoker function");
  }

  // Rule 4: inspect each function header (everything before its body).
  for (const fn of sql.matchAll(
    /create (?:or replace )?function ((?:public|private)\.[a-z0-9_]+)\s*\(([\s\S]*?)\bas \$\$/g
  )) {
    const [, name, header] = fn;
    if (!/set search_path\s*=/.test(header)) {
      fail(file, `function ${name} must pin search_path (set search_path = '')`);
    }
    const revoke = new RegExp(
      `revoke all on function ${name.replace(".", "\\.")}\\s*\\([^)]*\\)\\s+from public`
    );
    if (!revoke.test(sql)) {
      fail(file, `function ${name} must revoke PUBLIC's default EXECUTE`);
    }
  }

  // Rule 5.
  for (const view of sql.matchAll(
    /create (?:or replace )?view (public\.[a-z0-9_]+)([\s\S]*?)\bas\b/g
  )) {
    if (!/security_invoker\s*=\s*true/.test(view[2])) {
      fail(file, `view ${view[1]} must be created with (security_invoker = true)`);
    }
  }
}

// Rule 6: legacy credential names. These files mention them on purpose (to
// warn about or document the migration away from them).
const LEGACY =
  /NEXT_PUBLIC_SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY|search_cities_elastic|setup_all_blank_project/;
const LEGACY_ALLOWLIST = new Set([
  "scripts/check-migrations.ts",
  "scripts/db/env.ts",
  "src/lib/env.ts",
  "docs/security-audit-2026-09-12.md",
  "docs/adr-003-reference-data-sources.md",
  "supabase/README.md",
]);
const SCAN_ROOTS = [
  "src",
  "scripts",
  "supabase",
  "deploy",
  ".github",
  "docs",
  "Dockerfile",
  "docker-compose.yml",
  "next.config.ts",
  ".env.example",
  "README.md",
  "CONTRIBUTING.md",
  "AGENTS.md",
  "CLAUDE.md",
];
const TEXT_EXT =
  /\.(ts|tsx|js|mjs|json|md|sql|ya?ml|toml|sh|j2|conf|example|txt)$|^(Dockerfile|\.env\.example)$/;

function walk(path: string): string[] {
  let stats;
  try {
    stats = statSync(path);
  } catch {
    return [];
  }
  if (stats.isFile()) return [path];
  return readdirSync(path)
    .filter((name) => !["node_modules", ".next", ".temp", ".branches"].includes(name))
    .flatMap((name) => walk(join(path, name)));
}

for (const file of SCAN_ROOTS.flatMap(walk)) {
  const rel = relative(".", file);
  if (LEGACY_ALLOWLIST.has(rel) || !TEXT_EXT.test(rel.split("/").pop() ?? "")) continue;
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, index) => {
    if (LEGACY.test(line)) {
      fail(
        `${rel}:${index + 1}`,
        `retired name "${line.match(LEGACY)?.[0]}" — use the new Supabase keys / objects`
      );
    }
  });
}

if (problems.length > 0) {
  console.error(`Migration policy check failed (${problems.length} problem(s)):\n`);
  for (const problem of problems) console.error(`  ✗ ${problem}`);
  process.exit(1);
}

console.log(`✓ ${files.length} migration(s) follow the policy; no retired key names found.`);

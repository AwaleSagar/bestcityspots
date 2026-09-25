/**
 * `npm run check:db` — Docker-free database gate (part of `npm run verify`).
 *
 *   1. Applies every migration, then supabase/seed.sql, to an in-process
 *      PGlite database with a minimal Supabase shim.
 *   2. Runs every pgTAP file in supabase/tests/database/ against it.
 *
 * The same pgTAP files run against the real Supabase stack in CI
 * (`supabase test db`), which stays the authoritative check.
 *
 * Flags:
 *   --no-seed   skip supabase/seed.sql (faster when iterating on migrations)
 */

import { existsSync } from "node:fs";
import { createDatabase, listSqlFiles, runTapFile, SEED_FILE, TESTS_DIR } from "./pglite";

async function main() {
  const withSeed = !process.argv.includes("--no-seed") && existsSync(SEED_FILE);

  console.log(`Applying migrations${withSeed ? " + seed" : ""} to PGlite…`);
  const started = Date.now();
  const db = await createDatabase({
    seed: withSeed,
    onStep: (step) => console.log(`  · ${step}`),
  });
  console.log(`  ✓ schema ready in ${((Date.now() - started) / 1000).toFixed(1)}s\n`);

  const files = existsSync(TESTS_DIR) ? listSqlFiles(TESTS_DIR, ".test.sql") : [];
  let failed = 0;
  let passed = 0;

  for (const file of files) {
    const result = await runTapFile(db, file);
    const planMismatch =
      result.planned !== null && result.planned !== result.passed + result.failures.length;
    const ok =
      !result.error && result.failures.length === 0 && !planMismatch && result.planned !== null;
    passed += result.passed;

    if (ok) {
      console.log(`  ✓ ${file} (${result.passed} assertions)`);
      continue;
    }

    failed += 1;
    console.error(`  ✗ ${file}`);
    if (result.error) console.error(`      error: ${result.error}`);
    if (result.planned === null && !result.error) console.error("      no plan() output");
    if (planMismatch) {
      console.error(
        `      planned ${result.planned}, ran ${result.passed + result.failures.length}`
      );
    }
    for (const failure of result.failures) console.error(`      ${failure}`);
  }

  await db.close();

  if (failed > 0) {
    console.error(`\n${failed} of ${files.length} pgTAP file(s) failed.`);
    process.exit(1);
  }
  console.log(`\nAll ${files.length} pgTAP file(s) passed (${passed} assertions).`);
}

main().catch((error) => {
  console.error(`\n✗ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});

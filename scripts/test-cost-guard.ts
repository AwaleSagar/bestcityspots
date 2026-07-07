/* eslint-disable */
/**
 * Verification for src/lib/cost-guard.ts.
 * Run: tsx scripts/test-cost-guard.ts
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);

// 1. Mock "server-only" to avoid throwing an error in tsx outside Next.js runtime
try {
  const serverOnlyPath = require.resolve("server-only");
  require.cache[serverOnlyPath] = {
    id: serverOnlyPath,
    exports: {},
    loaded: true,
    filename: serverOnlyPath,
    children: [],
    path: "",
    paths: []
  } as any;
} catch (e) {
  // Empty fallback if server-only is not present
}

// 1b. Set environment variables FIRST before importing cost-guard to customize limits
(process.env as any).NODE_ENV = "test";
process.env.GOOGLE_GEMINI_LIVE_FETCH_ENABLED = "true";
process.env.GOOGLE_GEMINI_DAILY_CALL_LIMIT = "2";
process.env.GOOGLE_PLACES_LIVE_FETCH_ENABLED = "false";
process.env.OPENAI_LIVE_FETCH_ENABLED = "true";
process.env.OPENAI_DAILY_CALL_LIMIT = "0"; // limit 0 disables immediately

let failures = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    console.log(`  ✓ ${name}`);
  } else {
    failures += 1;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

console.log("tryClaimPaidProviderUse verification");
async function runClaims() {
  // Dynamically import to ensure process.env changes are loaded
  const { isPaidProviderEnabled, tryClaimPaidProviderUse } = await import("../src/lib/cost-guard");
  const { serverEnv } = await import("../src/lib/env");

  console.log("DIAGNOSTIC - serverEnv is:", JSON.stringify(serverEnv(), null, 2));

  console.log("isPaidProviderEnabled verification");
  check("gemini enabled when live-fetch-enabled is true", isPaidProviderEnabled("gemini") === true);
  check("places disabled when live-fetch-enabled is false", isPaidProviderEnabled("google-places") === false);

  // Test Case A: openai limit of 0 should immediately return false
  const claimOpenAi = await tryClaimPaidProviderUse("openai", "test_openai");
  check("openai claim with limit=0 fails immediately", claimOpenAi === false);

  // Test Case B: places is disabled, so its claim should immediately return false
  const claimPlacesNext = await tryClaimPaidProviderUse("google-places", "test_places");
  check("disabled provider claim fails immediately", claimPlacesNext === false);

  // Test Case C: gemini has limit=2. First two should succeed, third should fail (due to internal/local counting)
  const claim1 = await tryClaimPaidProviderUse("gemini", "call1");
  const claim2 = await tryClaimPaidProviderUse("gemini", "call2");
  const claim3 = await tryClaimPaidProviderUse("gemini", "call3");

  check("first claim under limit succeeds", claim1 === true, `claim1=${claim1}`);
  check("second claim at limit succeeds", claim2 === true, `claim2=${claim2}`);
  check("third claim exceeding limit fails", claim3 === false, `claim3=${claim3}`);

  if (failures > 0) {
    console.error(`\nCost-guard verification failed with ${failures} failure(s)`);
    process.exit(1);
  } else {
    console.log("\nAll cost-guard verification tests passed successfully!");
    process.exit(0);
  }
}

runClaims();
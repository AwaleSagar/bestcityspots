/* eslint-disable */
/**
 * Verification for Next.js Server Actions (src/app/actions.ts).
 * Run: tsx --conditions=react-server scripts/test-actions.ts
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);

// 1. Mock "server-only" to avoid throwing outside Next.js runtime
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
  // Empty
}

// 2. Mock "next/cache" and "react" to allow testing server actions without Next.js booting
try {
  const nextCachePath = require.resolve("next/cache");
  require.cache[nextCachePath] = {
    id: nextCachePath,
    exports: {
      unstable_cache: (fn: any) => fn // identity pass-through
    },
    loaded: true,
    filename: nextCachePath,
    children: [],
    path: ""
  } as any;
} catch (e) {}

try {
  const reactPath = require.resolve("react");
  require.cache[reactPath] = {
    id: reactPath,
    exports: {
      cache: (fn: any) => fn // identity pass-through
    },
    loaded: true,
    filename: reactPath,
    children: [],
    path: ""
  } as any;
} catch (e) {}

let failures = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    console.log(`  ✓ ${name}`);
  } else {
    failures += 1;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function runActionTests() {
  console.log("Server Actions Gating Verification");
  try {
    // Dynamically import to ensure mock is cached first
    const { fetchTrendingDestinations, fetchLivingIndexCities, fetchTrendingCityIds } = await import("../src/app/actions");

    check("fetchTrendingDestinations exists", typeof fetchTrendingDestinations === "function");
    check("fetchLivingIndexCities exists", typeof fetchLivingIndexCities === "function");
    check("fetchTrendingCityIds exists", typeof fetchTrendingCityIds === "function");

    // Call fetchTrendingDestinations — should gracefully degrade or complete
    const trending = await fetchTrendingDestinations();
    check("fetchTrendingDestinations executes without throwing", Array.isArray(trending));

    // Call fetchLivingIndexCities — should gracefully degrade to fallback or complete
    const livingIndex = await fetchLivingIndexCities();
    check("fetchLivingIndexCities executes without throwing", Array.isArray(livingIndex));
    
    // Call fetchTrendingCityIds — should gracefully degrade to fallback or complete
    const trendingIds = await fetchTrendingCityIds();
    check("fetchTrendingCityIds executes without throwing", Array.isArray(trendingIds));
  } catch (err) {
    check("actions execution failed safely", false, err instanceof Error ? err.message : String(err));
  }

  if (failures > 0) {
    console.error(`\nServer Actions verification failed with ${failures} failure(s)`);
    process.exit(1);
  } else {
    console.log("\nAll Server Actions verification tests passed successfully!");
    process.exit(0);
  }
}

runActionTests();
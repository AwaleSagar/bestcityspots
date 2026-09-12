/* eslint-disable */
/**
 * Verification for src/lib/useAnalytics.ts (React custom hook & fallbacks).
 * Run: tsx scripts/test-use-analytics.ts
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
    paths: [],
  } as any;
} catch (e) {
  // Empty
}

import react from "react";
import { useAnalytics } from "../src/lib/useAnalytics";

let failures = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    console.log(`  ✓ ${name}`);
  } else {
    failures += 1;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

console.log("useAnalytics Hook Verification");

// Test Case A: Calling useAnalytics outside of an AnalyticsProvider (context is null)
{
  // Mock React.useContext to return null
  const originalUseContext = react.useContext;
  (react as any).useContext = () => null;

  try {
    const analytics = useAnalytics();

    check("returns safe fallbacks when outside provider boundary", analytics !== undefined);
    check("hasGeoConsent defaults to false", analytics.hasGeoConsent === false);
    check("trackPageView is a no-op function", typeof analytics.trackPageView === "function");
    check("trackAction is a no-op function", typeof analytics.trackAction === "function");
    check("trackCityView is a no-op function", typeof analytics.trackCityView === "function");

    // Call them to ensure they do not throw errors
    let threw = false;
    try {
      analytics.trackPageView("/cities/tokyo");
      analytics.trackAction("search");
      analytics.trackCityView(100);
    } catch {
      threw = true;
    }
    check("calling fallback no-op functions does not throw", threw === false);
  } finally {
    // Restore React.useContext
    react.useContext = originalUseContext;
  }
}

// Test Case B: Calling useAnalytics inside an AnalyticsProvider (context is active)
{
  const mockContextValue = {
    trackPageView: (p: string) => {
      console.log(`      → mockPageTrack: ${p}`);
    },
    trackAction: (a: string) => {
      console.log(`      → mockActionTrack: ${a}`);
    },
    trackCityView: (id: number) => {
      console.log(`      → mockCityTrack: ${id}`);
    },
    setGeoConsent: (c: boolean) => {},
    hasGeoConsent: true,
  };

  const originalUseContext = react.useContext;
  (react as any).useContext = () => mockContextValue;

  try {
    const analytics = useAnalytics();

    check("returns active context value within provider", analytics === mockContextValue);
    check("retrieves true hasGeoConsent state", analytics.hasGeoConsent === true);
    check("retrieves mock analytics functions", typeof analytics.trackPageView === "function");
  } finally {
    react.useContext = originalUseContext;
  }
}

if (failures > 0) {
  console.error(`\npuseAnalytics hook verification failed with ${failures} failure(s)`);
  process.exit(1);
} else {
  console.log("\nAll useAnalytics hook verification tests passed successfully!");
  process.exit(0);
}

#!/usr/bin/env npx tsx
/**
 * US-03 acceptance test: metric selection logic.
 * Run: npm run test:metrics  (exit code non-zero on failure)
 */
import assert from "node:assert/strict";
import type { CityMetrics } from "../src/lib/metrics";
import {
  selectAvailableMetrics,
  shouldRenderMetricsPanel,
  METRICS_PANEL_MINIMUM,
} from "../src/lib/metrics-display";

const base: CityMetrics = {
  cost_index: null,
  homicide_rate_per_100k: null,
  pollution_pm25: null,
  climate_comfort: null,
  health_access_per_100k: null,
  updated_at: null,
  source: null,
};

// 1. All-null metrics → no rows, no panel.
assert.deepEqual(selectAvailableMetrics(base), []);
assert.equal(shouldRenderMetricsPanel([]), false);

// 2. Null metrics object → no rows.
assert.deepEqual(selectAvailableMetrics(null), []);

// 3. A single real metric → row exists, but the panel still doesn't render.
const one = selectAvailableMetrics({ ...base, pollution_pm25: 12.4 });
assert.equal(one.length, 1);
assert.equal(one[0].key, "pollution_pm25");
assert.equal(one[0].unit, "µg/m³");
assert.equal(shouldRenderMetricsPanel(one), false);
assert.equal(METRICS_PANEL_MINIMUM, 2);

// 4. Two real metrics → panel renders; sources mapped from the source record.
const two = selectAvailableMetrics({
  ...base,
  pollution_pm25: 8,
  climate_comfort: "Mild",
  source: { pollution: "Open-Meteo", climate: "Open-Meteo normals" },
});
assert.equal(two.length, 2);
assert.equal(shouldRenderMetricsPanel(two), true);
assert.equal(two[0].source, "Open-Meteo");
assert.equal(two[1].source, "Open-Meteo normals");

// 5. Hollow values are filtered: empty string, NaN, whitespace.
const hollow = selectAvailableMetrics({
  ...base,
  climate_comfort: "   ",
  homicide_rate_per_100k: Number.NaN,
  cost_index: 0, // zero is a real value and must be kept
});
assert.equal(hollow.length, 1);
assert.equal(hollow[0].key, "cost_index");

// 6. Country-level World Bank indicators render with honest labels.
const future = selectAvailableMetrics({ ...base, cost_index: 42, homicide_rate_per_100k: 1.3 });
assert.deepEqual(
  future.map((r) => r.key),
  ["cost_index", "homicide_rate_per_100k"]
);
assert.ok(
  future.every((r) => r.label.includes("country")),
  "labels must say country-level"
);
assert.equal(shouldRenderMetricsPanel(future), true);

console.log("✓ metrics-display: all 6 assertions groups passed");

#!/usr/bin/env npx tsx
/**
 * City presentation helpers (src/lib/city-display.ts).
 * Run: npm run test:city-display  (exit code non-zero on failure)
 */
import assert from "node:assert/strict";
import {
  aqiInfo,
  capitalLabel,
  compactCount,
  formatCoordinates,
  formatPlaceType,
  formatTemperature,
  priceLabel,
  seasonForMonth,
  seasonFromName,
} from "../src/lib/city-display";

// 1. Raw dataset capital values never reach the UI.
assert.equal(capitalLabel("primary"), "National capital");
assert.equal(capitalLabel("admin"), "Regional capital");
assert.equal(capitalLabel("minor"), null);
assert.equal(capitalLabel(""), null);

// 2. Seasons flip south of the equator.
assert.equal(seasonForMonth(0, 51.5), "winter");
assert.equal(seasonForMonth(0, -33.9), "summer");
assert.equal(seasonForMonth(3, -33.9), "autumn");
assert.equal(seasonForMonth(13, 10), "winter", "month index wraps");
assert.equal(seasonFromName("Autumn (Fall)"), "autumn");
assert.equal(seasonFromName("fall"), "autumn");
assert.equal(seasonFromName("Dry season"), null);

// 3. AQI uses the OpenWeather 1–5 scale; anything else is "unknown".
assert.equal(aqiInfo(1).label, "Good");
assert.equal(aqiInfo(5).level, 5);
assert.equal(aqiInfo(0).level, null);
assert.equal(aqiInfo(0, "Unknown").label, "Unknown");
assert.equal(aqiInfo(2.5).level, null);

// 4. Formatting.
assert.equal(formatCoordinates(38.7253, -9.15), "38.73° N, 9.15° W");
assert.equal(formatCoordinates(-33.9, 18.42), "33.90° S, 18.42° E");
assert.equal(formatTemperature(21.6), "22°C");
assert.equal(formatTemperature(Number.NaN), null);
assert.equal(formatPlaceType(["tourist_attraction", "point_of_interest"]), "Tourist attraction");
assert.equal(formatPlaceType(undefined), "Place");
assert.equal(priceLabel("PRICE_LEVEL_MODERATE"), "$$");
assert.equal(priceLabel("PRICE_LEVEL_UNSPECIFIED"), null);
assert.equal(compactCount(980), "980");
assert.equal(compactCount(1250), "1.3k");
assert.equal(compactCount(98_231), "98k");
assert.equal(compactCount(1_500_000), "1.5M");

console.log("✓ city-display: all 4 assertion groups passed");

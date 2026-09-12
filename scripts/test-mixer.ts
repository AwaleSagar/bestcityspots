/**
 * Verification for src/lib/mixer.ts (Priorities Mixer ranking).
 * Run: npm run test:mixer
 */
import { rankCities, type MixerMetricsRow } from "../src/lib/mixer";

let failures = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    console.log(`  ✓ ${name}`);
  } else {
    failures += 1;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const rows: MixerMetricsRow[] = [
  // cheap, clean air, unsafe, slow net
  { city_id: 1, cost_index: 30, pollution_pm25: 5, safety_score: 40, connectivity_mbps: 20 },
  // expensive, dirty air, safe, fast net
  { city_id: 2, cost_index: 90, pollution_pm25: 40, safety_score: 90, connectivity_mbps: 200 },
  // middle everywhere
  { city_id: 3, cost_index: 60, pollution_pm25: 20, safety_score: 65, connectivity_mbps: 100 },
  // missing most data
  { city_id: 4, cost_index: null, pollution_pm25: null, safety_score: 80, connectivity_mbps: null },
];

console.log("weight gating");
{
  check(
    "all-zero weights → empty",
    rankCities(rows, { cost: 0, air: 0, safety: 0, connectivity: 0 }).length === 0
  );
  check(
    "empty rows → empty",
    rankCities([], { cost: 100, air: 0, safety: 0, connectivity: 0 }).length === 0
  );
}

console.log("direction correctness");
{
  const byCost = rankCities(rows, { cost: 100, air: 0, safety: 0, connectivity: 0 });
  check("cheapest city wins on budget", byCost[0]?.city_id === 1, JSON.stringify(byCost));
  const bySafety = rankCities(rows, { cost: 0, air: 0, safety: 100, connectivity: 0 });
  check("safest city wins on safety", bySafety[0]?.city_id === 2, JSON.stringify(bySafety));
  const byAir = rankCities(rows, { cost: 0, air: 100, safety: 0, connectivity: 0 });
  check("cleanest air wins on air", byAir[0]?.city_id === 1, JSON.stringify(byAir));
}

console.log("null handling");
{
  const bySafety = rankCities(rows, { cost: 0, air: 0, safety: 100, connectivity: 0 });
  check(
    "city with only safety data still ranks",
    bySafety.some((r) => r.city_id === 4)
  );
  const byCost = rankCities(rows, { cost: 100, air: 0, safety: 0, connectivity: 0 });
  check("city missing the only active metric is omitted", !byCost.some((r) => r.city_id === 4));
  const mixed = rankCities(rows, { cost: 50, air: 0, safety: 50, connectivity: 0 });
  const partial = mixed.find((r) => r.city_id === 4);
  check(
    "partial-data city reports coverage 1 of 2",
    partial?.coverage === 1 && partial.activeDimensions === 2
  );
}

console.log("score sanity");
{
  const all = rankCities(rows, { cost: 25, air: 25, safety: 25, connectivity: 25 });
  check(
    "scores stay within 0–100",
    all.every((r) => r.score >= 0 && r.score <= 100)
  );
  const again = rankCities(rows, { cost: 25, air: 25, safety: 25, connectivity: 25 });
  check("ranking is deterministic", JSON.stringify(all) === JSON.stringify(again));
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll mixer checks passed");

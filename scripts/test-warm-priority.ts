/**
 * Verification for src/lib/warm-priority.ts (pre-warming priority).
 * Run: npm run test:warm-priority
 */
import {
  POPULAR_DESTINATIONS,
  buildLandmarkQuery,
  landmarkHintsFor,
  mergePriorityLists,
} from "../src/lib/warm-priority";

let failures = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    console.log(`  ✓ ${name}`);
  } else {
    failures += 1;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

console.log("mergePriorityLists");
{
  const demand = [{ id: 10 }, { id: 11 }];
  const curated = [{ id: 11 }, { id: 20 }, { id: 21 }];
  const population = [{ id: 10 }, { id: 30 }, { id: 31 }, { id: 32 }];

  const merged = mergePriorityLists(demand, curated, population, 10);
  check(
    "order is demand → curated → population",
    JSON.stringify(merged.map((c) => c.id)) === JSON.stringify([10, 11, 20, 21, 30, 31, 32])
  );
  check("duplicates removed", new Set(merged.map((c) => c.id)).size === merged.length);

  const limited = mergePriorityLists(demand, curated, population, 3);
  check("limit respected", limited.length === 3);
  check(
    "limit keeps highest priority",
    JSON.stringify(limited.map((c) => c.id)) === JSON.stringify([10, 11, 20])
  );
  check("empty sources → population only", mergePriorityLists([], [], population, 2).length === 2);
  check("all empty → empty", mergePriorityLists([], [], [], 5).length === 0);
}

console.log("buildLandmarkQuery");
{
  check(
    "no hints → base query",
    buildLandmarkQuery("Lagos", []) === "Top landmarks and attractions in Lagos"
  );
  const paris = buildLandmarkQuery("Paris", ["Eiffel Tower", "Louvre Museum"]);
  check("hints appended", paris.includes("including Eiffel Tower, Louvre Museum"), paris);
  const many = buildLandmarkQuery("X", ["a", "b", "c", "d", "e", "f"]);
  check("hints capped at 4", (many.match(/,/g) ?? []).length === 3, many);
}

console.log("landmarkHintsFor");
{
  check("known city resolves", landmarkHintsFor("Bangkok", "Thailand").length > 0);
  check("case-insensitive", landmarkHintsFor("bangkok").length > 0);
  check("country mismatch rejected", landmarkHintsFor("Paris", "United States").length === 0);
  check("unknown city → empty", landmarkHintsFor("Springfield").length === 0);
}

console.log("dataset sanity");
{
  check("20 curated destinations", POPULAR_DESTINATIONS.length === 20);
  check(
    "every destination has hints",
    POPULAR_DESTINATIONS.every((d) => d.landmarkHints.length > 0)
  );
  check(
    "no duplicate city+country",
    new Set(POPULAR_DESTINATIONS.map((d) => `${d.city}|${d.country}`)).size ===
      POPULAR_DESTINATIONS.length
  );
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll warm-priority checks passed");

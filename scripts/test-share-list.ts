#!/usr/bin/env npx tsx
/**
 * US-08/US-10 acceptance tests: shareable saved-places token.
 * Run: npm run test:share  (exit code non-zero on failure)
 */
import assert from "node:assert/strict";
import { encodeSharedList, decodeSharedList, MAX_SHARED_PLACES } from "../src/lib/share-list";

// 1. v1 round-trip (ids only) + 50-place URL budget (US-08 AC: < 2k chars).
const ids = Array.from(
  { length: 50 },
  (_, i) => `ChIJ${"x".repeat(20)}${String(i).padStart(3, "0")}`
);
const v1 = encodeSharedList("Lisbon", ids);
const url = `https://bestcityspots.com/cities/lisbon-portugal?shared=${v1}`;
assert.ok(url.length < 2000, `URL budget exceeded: ${url.length}`);
const decodedV1 = decodeSharedList(v1);
assert.equal(decodedV1?.city, "Lisbon");
assert.deepEqual(decodedV1?.ids, ids);
assert.deepEqual(decodedV1?.days, {});

// 2. v2 round-trip with day assignments (US-10 AC: share carries grouping).
const days = { [ids[0]]: 1, [ids[2]]: 3 };
const v2 = encodeSharedList("Lisbon", ids.slice(0, 5), days);
const decodedV2 = decodeSharedList(v2);
assert.deepEqual(decodedV2?.ids, ids.slice(0, 5));
assert.deepEqual(decodedV2?.days, days);

// 3. Dedupe + cap.
const dup = encodeSharedList("X", [...ids, ...ids, "ChIJextraextraextra"]);
assert.equal(decodeSharedList(dup)?.ids.length, MAX_SHARED_PLACES);

// 4. Garbage tolerance: malformed tokens decode to null, never throw.
for (const bad of ["", "!!!", "AAAA", encodeSharedList("X", []), "a".repeat(5000)]) {
  assert.equal(decodeSharedList(bad), null, `expected null for ${bad.slice(0, 12)}…`);
}

// 5. Unicode city names survive; pipe injection is neutralized.
const unicode = encodeSharedList("São Paulo|evil", ["ChIJabcdefgh"]);
assert.equal(decodeSharedList(unicode)?.city, "São Paulo evil");

// 6. Notes can never leak: the payload type only admits city + ids + days.
const payload = decodeSharedList(encodeSharedList("Y", ["ChIJabcdefgh"], { ChIJabcdefgh: 2 }));
assert.deepEqual(Object.keys(payload ?? {}).sort(), ["city", "days", "ids"]);

console.log("✓ share-list: all 6 assertion groups passed");

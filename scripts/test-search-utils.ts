#!/usr/bin/env npx tsx
/**
 * City search helpers (src/lib/search-utils.ts).
 * Run: npm run test:search-utils  (exit code non-zero on failure)
 */
import assert from "node:assert/strict";
import {
  highlightSegments,
  matchDestinations,
  MAX_QUERY_LENGTH,
  sanitizeSearchInput,
  searchableQuery,
} from "../src/lib/search-utils";

// 1. Sanitizing strips markup-ish characters and caps length.
assert.equal(sanitizeSearchInput("<Lis{bon}>|"), "Lisbon");
assert.equal(sanitizeSearchInput("a".repeat(200)).length, MAX_QUERY_LENGTH);
assert.equal(sanitizeSearchInput("São Paulo"), "São Paulo");

// 2. Queries under two characters are not searchable.
assert.equal(searchableQuery(" l "), null);
assert.equal(searchableQuery("  li "), "li");

// 3. Highlight segments cover every case-insensitive match, in order.
assert.deepEqual(highlightSegments("Lisbon", "lis"), [
  { text: "Lis", match: true },
  { text: "bon", match: false },
]);
assert.deepEqual(highlightSegments("Banana", "an"), [
  { text: "B", match: false },
  { text: "an", match: true },
  { text: "an", match: true },
  { text: "a", match: false },
]);
assert.deepEqual(highlightSegments("Kyoto", ""), [{ text: "Kyoto", match: false }]);
assert.deepEqual(highlightSegments("Kyoto", "x"), [{ text: "Kyoto", match: false }]);
assert.equal(
  highlightSegments("a.b(c)", ".b(")
    .map((s) => s.text)
    .join(""),
  "a.b(c)",
  "regex characters are literal"
);

// 4. Destinations match on every query word (label or keywords).
assert.deepEqual(
  matchDestinations("air").map((d) => d.href),
  ["/best-cities-by-air-quality"]
);
assert.deepEqual(
  matchDestinations("remote work").map((d) => d.href),
  ["/best-cities-for-digital-nomads"]
);
assert.deepEqual(matchDestinations("   "), []);
assert.ok(matchDestinations("a", 2).length <= 2);

console.log("✓ search-utils: all 4 assertion groups passed");

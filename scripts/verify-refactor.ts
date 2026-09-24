import assert from "node:assert/strict";
import { parseStoredNotes, sanitizeKey, sanitizeNotes, topK } from "../src/lib/saved-places";
import { parseReferrer, parseUserAgent } from "../src/lib/analytics";
import { CACHE_TIERS, classifyAge } from "../src/lib/cache-config";

const now = Date.UTC(2026, 3, 25);

assert.deepEqual(
  topK(
    [
      { id: "a", score: 3 },
      { id: "b", score: 9 },
      { id: "c", score: 5 },
    ],
    2,
    (item) => item.score
  ).map((item) => item.id),
  ["b", "c"]
);

const cityKey = sanitizeKey("Mumbai");
const placeKey = sanitizeKey("place/1");
const parsedNotes = parseStoredNotes(
  JSON.stringify({
    Mumbai: { "place/1": "  sunset entry  ", invalid: 7 },
    Skip: ["not", "an", "object"],
  })
);
assert.deepEqual(parsedNotes.get(cityKey), { [placeKey]: "  sunset entry  " });
assert.deepEqual(sanitizeNotes({ "raw id": "note", bad: 42 as unknown as string }), {
  [sanitizeKey("raw id")]: "note",
});

assert.equal(
  classifyAge(new Date(now - 10 * 60 * 1000).toISOString(), CACHE_TIERS.WEATHER, now),
  "fresh"
);
assert.equal(
  classifyAge(new Date(now - 90 * 60 * 1000).toISOString(), CACHE_TIERS.WEATHER, now),
  "stale"
);
assert.equal(
  classifyAge(new Date(now - 25 * 60 * 60 * 1000).toISOString(), CACHE_TIERS.WEATHER, now),
  "expired"
);

assert.deepEqual(parseReferrer("https://www.google.com/search?q=tokyo"), {
  sourceType: "organic",
  sourceName: "Google",
});
assert.equal(
  parseUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/604.1").deviceType,
  "mobile"
);

console.log("Refactor verification passed");

/**
 * Verification for the analytics input hardening added by the 2026-09-12
 * security audit (findings M-3 and M-4).
 *
 * Run: tsx scripts/test-analytics-hardening.ts
 */

import {
  AnalyticsPayloadSchema,
  parseReferrer,
  sanitizeCountryCode,
  sanitizeGeoCity,
} from "../src/lib/analytics";

let failures = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    console.log(`  ✓ ${name}`);
  } else {
    failures += 1;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function payload(event: Record<string, unknown>) {
  return AnalyticsPayloadSchema.safeParse({
    events: [{ type: "pageview", sessionId: "abc123", ...event }],
    timestamp: new Date().toISOString(),
  });
}

console.log("AnalyticsPayloadSchema bounds (M-4)");
check("accepts a normal event", payload({ path: "/cities/lisbon-portugal" }).success);
check("rejects an over-long sessionId", !payload({ sessionId: "x".repeat(65) }).success);
check("rejects an over-long path", !payload({ path: "/".repeat(513) }).success);
check(
  "rejects an over-long referrer",
  !payload({ referrer: "https://e.example/" + "a".repeat(2048) }).success
);
check("rejects a negative sessionDuration", !payload({ sessionDuration: -1 }).success);
check("rejects an absurd sessionDuration", !payload({ sessionDuration: 86_401 }).success);
check("rejects a fractional pageCount", !payload({ pageCount: 1.5 }).success);
check("rejects an absurd pageCount", !payload({ pageCount: 1_001 }).success);
check("rejects a non-positive cityId", !payload({ cityId: 0 }).success);
check("rejects a fractional cityId", !payload({ cityId: 12.5 }).success);
check(
  "still caps the batch at 50 events",
  !AnalyticsPayloadSchema.safeParse({
    events: Array.from({ length: 51 }, () => ({ type: "pageview", sessionId: "abc123" })),
    timestamp: new Date().toISOString(),
  }).success
);

console.log("parseReferrer source_name bounding (M-4)");
check(
  "keeps a known search engine",
  parseReferrer("https://www.google.com/search?q=lisbon").sourceName === "Google"
);
check(
  "keeps a plausible referral hostname",
  parseReferrer("https://blog.example.com/post").sourceName === "blog.example.com"
);
check(
  "lowercases the hostname so casing cannot fork a row",
  parseReferrer("https://BLOG.Example.COM/post").sourceName === "blog.example.com"
);
check(
  "buckets a non-http scheme as unknown",
  parseReferrer("javascript:alert(1)").sourceName === "unknown"
);
check(
  "buckets a garbage referrer as unknown",
  parseReferrer("not a url at all").sourceName === "unknown"
);
check(
  "buckets an over-long hostname as unknown",
  parseReferrer(`https://${"a".repeat(130)}.example/`).sourceName === "unknown"
);
check(
  "buckets a bare host with no dot as unknown",
  parseReferrer("https://localhost/x").sourceName === "unknown"
);
check("treats an empty referrer as direct", parseReferrer("").sourceName === "direct");
check("treats a null referrer as direct", parseReferrer(null).sourceName === "direct");

console.log("Geo header sanitizers (M-3)");
check("accepts a two-letter country code", sanitizeCountryCode("pt") === "PT");
check("trims surrounding whitespace", sanitizeCountryCode("  de ") === "DE");
check("rejects a three-letter code", sanitizeCountryCode("PRT") === null);
check("rejects an injected string", sanitizeCountryCode("PT; drop table") === null);
check("rejects an empty code", sanitizeCountryCode("") === null);
check("passes a normal city through", sanitizeGeoCity("Porto") === "Porto");
check("collapses whitespace", sanitizeGeoCity("  São   Paulo  ") === "São Paulo");
check(
  "strips control characters",
  sanitizeGeoCity("Lis\u0007bon") === "Lis bon" && sanitizeGeoCity("Porto\u0000\u001f") === "Porto"
);
check("bounds the length", (sanitizeGeoCity("x".repeat(200)) ?? "").length === 80);
check("returns null for whitespace-only input", sanitizeGeoCity("   ") === null);
check("returns null for a missing header", sanitizeGeoCity(null) === null);

if (failures > 0) {
  console.error(`\nAnalytics hardening verification failed with ${failures} failure(s)`);
  process.exit(1);
}
console.log("\nAll analytics hardening tests passed successfully!");

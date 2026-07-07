/**
 * Verification for src/lib/json-ld.ts.
 * Run: tsx scripts/test-json-ld.ts
 */
import { serializeJsonLd } from "../src/lib/json-ld";

let failures = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    console.log(`  ✓ ${name}`);
  } else {
    failures += 1;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

console.log("serializeJsonLd verification");
{
  const simpleObject = { name: "Eiffel Tower", rating: 4.8 };
  const serializedSimple = serializeJsonLd(simpleObject);
  check("serializes simple object to valid JSON string", typeof serializedSimple === "string");
  check("serialized JSON is parseable and deep-equals source", JSON.parse(serializedSimple).name === "Eiffel Tower");

  // Threat Scenario 1: Literal </script> block escape / HTML-breakout protection
  const maliciousObject = {
    name: "Cool Landmark</script><script>alert('XSS')</script>",
    description: "Ampersand & bracket < test > content",
  };
  const serializedMalicious = serializeJsonLd(maliciousObject);
  
  check("neutralizes </script> tag by escaping <", !serializedMalicious.includes("</script>"));
  check("neutralizes script start tag", !serializedMalicious.includes("<script>"));
  
  // Checking exact replacements according to target design:
  // replace(/&/g, "&amp;")
  // replace(/</g, "&lt;")
  // replace(/>/g, "&gt;")
  check("& is escaped to &amp;", serializedMalicious.includes("&amp;"));
  check("< is escaped to &lt;", serializedMalicious.includes("&lt;"));
  check("> is escaped to &gt;", serializedMalicious.includes("&gt;"));

  // Threat Scenario 2: JS Line/Paragraph Separator protection (U+2028, U+2029 can breakout JS strings)
  const lineSeparators = {
    text: "line1\u2028line2\u2029line3",
  };
  const serializedSeparators = serializeJsonLd(lineSeparators);
  check("escapes U+2028 line separator", serializedSeparators.includes("\\u2028"));
  check("escapes U+2029 paragraph separator", serializedSeparators.includes("\\u2029"));
}

if (failures > 0) {
  console.error(`\nJSON-LD verification failed with ${failures} failure(s)`);
  process.exit(1);
} else {
  console.log("\nAll JSON-LD serialization tests passed successfully!");
  process.exit(0);
}
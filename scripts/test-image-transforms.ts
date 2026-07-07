/* eslint-disable */
/**
 * Verification for src/lib/image-transforms.ts.
 * Run: tsx scripts/test-image-transforms.ts
 */
import { generateSizes, getQualityValue, QUALITY_PRESETS } from "../src/lib/image-transforms";

let failures = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    console.log(`  ✓ ${name}`);
  } else {
    failures += 1;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

console.log("image-transforms: getQualityValue");
{
  check(
    "resolves high preset",
    getQualityValue("high") === 85,
    `high=${getQualityValue("high")}`
  );
  check(
    "resolves medium preset",
    getQualityValue("medium") === 70,
    `medium=${getQualityValue("medium")}`
  );
  check(
    "resolves low preset",
    getQualityValue("low") === 50,
    `low=${getQualityValue("low")}`
  );
}

console.log("image-transforms: generateSizes");
{
  check(
    "generates sizes for default maxWidth (800)",
    generateSizes() === "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 800px"
  );
  check(
    "generates sizes with custom maxWidth",
    generateSizes(1200) === "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 1200px"
  );
}

if (failures > 0) {
  console.error(`\nImage-transforms verification failed with ${failures} failure(s)`);
  process.exit(1);
} else {
  console.log("\nAll image-transforms verification tests passed successfully!");
  process.exit(0);
}
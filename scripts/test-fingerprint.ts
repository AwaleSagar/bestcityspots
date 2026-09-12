/**
 * Verification for src/lib/fingerprint.ts (City Fingerprints).
 * Run: npm run test:fingerprint
 */
import { getCityFingerprint } from "../src/lib/fingerprint";

let failures = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    console.log(`  ✓ ${name}`);
  } else {
    failures += 1;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

console.log("determinism");
{
  const a = getCityFingerprint({ id: 1620619017, lat: 38.708, lng: -9.139, population: 2986000 });
  const b = getCityFingerprint({ id: 1620619017, lat: 38.708, lng: -9.139, population: 2986000 });
  check("same seed → identical glyph", JSON.stringify(a) === JSON.stringify(b));
}

console.log("distinctness");
{
  const lisbon = getCityFingerprint({ id: 1620619017, lat: 38.708, lng: -9.139 });
  const sydney = getCityFingerprint({ id: 1036074917, lat: -33.865, lng: 151.2094 });
  check(
    "different cities → different glyphs",
    JSON.stringify(lisbon.rings) !== JSON.stringify(sydney.rings)
  );
}

console.log("structure");
{
  const village = getCityFingerprint({ id: 42, population: 40_000 });
  const megacity = getCityFingerprint({ id: 43, population: 12_000_000 });
  const unknown = getCityFingerprint({ id: 44 });
  check("small city has 4 rings", village.rings.length === 4);
  check("megacity has 6 rings", megacity.rings.length === 6);
  check("missing population defaults to 4", unknown.rings.length === 4);

  for (const ring of megacity.rings) {
    if (!ring.d.startsWith("M ") || !ring.d.endsWith(" Z")) {
      check("ring paths are closed", false, ring.d.slice(0, 30));
    }
    if (!ring.color.startsWith("var(--color-")) {
      check("ring colors are theme tokens", false, ring.color);
    }
  }
  check("ring paths are closed", true);
  check("ring colors are theme tokens", true);

  // All coordinates must stay inside the 64×64 viewBox.
  const numbers = megacity.rings.flatMap((ring) => ring.d.match(/-?\d+\.?\d*/g) ?? []).map(Number);
  const inBox = numbers.every((n) => n >= -2 && n <= 66);
  check("coordinates stay in viewBox", inBox);
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll fingerprint checks passed");

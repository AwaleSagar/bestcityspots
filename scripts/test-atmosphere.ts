/**
 * Verification for src/lib/atmosphere.ts (Living Atlas).
 * Run: npm run test:atmosphere
 */
import {
  driftSeconds,
  getCityAtmosphere,
  resolveSkyPhase,
  solarAltitudeDeg,
  temperatureTint,
} from "../src/lib/atmosphere";

let failures = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    console.log(`  ✓ ${name}`);
  } else {
    failures += 1;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

console.log("solarAltitudeDeg / resolveSkyPhase");
{
  // Equator, Greenwich meridian, June 21 noon UTC → sun high in the sky.
  const noon = new Date(Date.UTC(2026, 5, 21, 12, 0, 0));
  const altitude = solarAltitudeDeg(0, 0, noon);
  check("equator solar noon is high", altitude > 55, `altitude=${altitude.toFixed(1)}`);
  check("equator solar noon is day", resolveSkyPhase(0, 0, noon) === "day");

  // Same place at midnight UTC → deep night.
  const midnight = new Date(Date.UTC(2026, 5, 21, 0, 0, 0));
  const nightAlt = solarAltitudeDeg(0, 0, midnight);
  check("equator midnight is far below horizon", nightAlt < -45, `altitude=${nightAlt.toFixed(1)}`);
  check("equator midnight is night", resolveSkyPhase(0, 0, midnight) === "night");

  // Longitude shifts local time: 180°E at 0:00 UTC is local solar noon.
  check("antimeridian at 0 UTC is day", resolveSkyPhase(0, 180, midnight) === "day");

  // Transition band splits into dawn (morning) vs dusk (evening).
  // Lisbon (38.7N, -9.1W) around 05:40 UTC in July ≈ sunrise band.
  const lisbonDawn = new Date(Date.UTC(2026, 6, 6, 5, 40, 0));
  const dawnAlt = solarAltitudeDeg(38.7, -9.1, lisbonDawn);
  if (dawnAlt > -8 && dawnAlt < 8) {
    check("Lisbon sunrise band is dawn", resolveSkyPhase(38.7, -9.1, lisbonDawn) === "dawn");
  } else {
    check("Lisbon sunrise-band sample within band", false, `altitude=${dawnAlt.toFixed(1)}`);
  }

  // Polar winter: Tromsø (69.6N) at local noon in December stays night/dusk.
  const polarNoon = new Date(Date.UTC(2026, 11, 21, 11, 0, 0));
  const polarPhase = resolveSkyPhase(69.6, 18.9, polarNoon);
  check("polar winter noon is not full day", polarPhase !== "day", `phase=${polarPhase}`);
}

console.log("temperatureTint");
{
  check("mild is transparent", temperatureTint(16) === "transparent");
  check("null is transparent", temperatureTint(null) === "transparent");
  check("NaN is transparent", temperatureTint(Number.NaN) === "transparent");
  check("cold tints azure (hue 240)", temperatureTint(-5).includes("240"));
  check("heat tints warm (hue 45)", temperatureTint(35).includes("45"));
  const freezing = temperatureTint(-20);
  const alpha = Number(freezing.match(/\/ ([0-9.]+)\)/)?.[1] ?? "1");
  check("alpha stays subtle (≤0.25)", alpha <= 0.25, freezing);
}

console.log("driftSeconds");
{
  check("calm default is 80s", driftSeconds(null) === 80);
  check("storm clamps at 45s", driftSeconds(50) === 45);
  check("breeze sits between", driftSeconds(6) > 45 && driftSeconds(6) < 80);
}

console.log("getCityAtmosphere");
{
  const noon = new Date(Date.UTC(2026, 5, 21, 12, 0, 0));
  const atmosphere = getCityAtmosphere({ lat: 0, lng: 0, tempC: 31, windSpeed: 4, now: noon });
  check("plate path matches phase", atmosphere.plateSrc === "/images/atlas/atlas-sky-day.webp");
  check("hot tint present", atmosphere.tint !== "transparent");
  check("drift in range", atmosphere.driftSeconds >= 45 && atmosphere.driftSeconds <= 80);
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll atmosphere checks passed");

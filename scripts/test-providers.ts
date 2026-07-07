/**
 * Verification for src/lib/providers/ (External providers logic & fallbacks).
 * Run: tsx --conditions=react-server scripts/test-providers.ts
 */

import { fetchCurrent, fetchPm25, conditionFromWeatherCode } from "../src/lib/providers/openMeteo";
import { fetchCurrentWeather } from "../src/lib/providers/openweather";
import { generateText, PROMPT_VERSIONS } from "../src/lib/providers/gemini";
import { serverEnv } from "../src/lib/env";

let failures = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    console.log(`  ✓ ${name}`);
  } else {
    failures += 1;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function runProviderTests() {
  console.log("Open-Meteo verification (Keyless/Live)");
  try {
    // Test on coordinates near Paris, France (48.8566, 2.3522)
    const currentMeteo = await fetchCurrent(48.8566, 2.3522);
    check("fetched current weather from Open-Meteo", currentMeteo !== null);
    if (currentMeteo) {
      check("temperature is defined or null", typeof currentMeteo.tempC === "number" || currentMeteo.tempC === null);
      check("humidity is defined or null", typeof currentMeteo.humidity === "number" || currentMeteo.humidity === null);
      check("observedAt date is present", typeof currentMeteo.observedAt === "string" && currentMeteo.observedAt.length > 0);
    }

    const pm25Value = await fetchPm25(48.8566, 2.3522);
    check("fetched PM25 from Open-Meteo", pm25Value !== null);
    if (pm25Value !== null) {
      check("PM25 value is a non-negative number", typeof pm25Value === "number" && pm25Value >= 0);
    }
  } catch (err) {
    check("Open-Meteo exceptions are handled", false, err instanceof Error ? err.message : String(err));
  }

  console.log("Open-Meteo Weather-Code Mapping");
  {
    check("code 0 maps to clear", conditionFromWeatherCode(0) === "clear");
    check("code 2 maps to cloudy", conditionFromWeatherCode(2) === "cloudy");
    check("code 45 maps to fog", conditionFromWeatherCode(45) === "fog");
    check("code 51 maps to rain", conditionFromWeatherCode(51) === "rain");
    check("code 73 maps to snow", conditionFromWeatherCode(73) === "snow");
    check("code 95 maps to storm", conditionFromWeatherCode(95) === "storm");
    check("null code maps to unknown", conditionFromWeatherCode(null) === "unknown");
    check("invalid/unmatched code maps to unknown", conditionFromWeatherCode(999) === "unknown");
  }

  console.log("OpenWeatherMap Auth Gating & Fallback behavior");
  {
    // If there is no key, it should return { ok: false, reason: "auth" }
    const apiKey = serverEnv().OPENWEATHERMAP_API_KEY;
    const res = await fetchCurrentWeather(48.8566, 2.3522);
    if (!apiKey) {
      check("without API key, OpenWeatherMap gracefully resolves to auth error", res.ok === false && res.reason === "auth");
    } else {
      check("with API key, OpenWeatherMap query is successful or outage-rejected", res.ok === true || res.reason === "outage");
    }
  }

  console.log("Gemini Provider Gating & Client limits");
  {
    const geminiKey = serverEnv().GOOGLE_GEMINI_API_KEY;
    check("PROMPT_VERSIONS is structured properly", PROMPT_VERSIONS.CITY_INSIGHT === 2 && PROMPT_VERSIONS.TRENDING_CITIES === 3);

    if (!geminiKey) {
      const res = await generateText("Hello Gemini from testing");
      check("without API key, generateText returns auth reason", res.ok === false && res.reason === "auth");
    } else {
      console.log("  → Gemini API key present, skipping expensive synthesis checks to preserve spend.");
    }
  }

  if (failures > 0) {
    console.error(`\nProviders verification failed with ${failures} failure(s)`);
    process.exit(1);
  } else {
    console.log("\nAll provider integration tests passed successfully!");
    process.exit(0);
  }
}

runProviderTests();
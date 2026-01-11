import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [key: string]: Json };

function jsonType(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value; // "string" | "number" | "boolean" | "object" | ...
}

function formatSample(value: unknown): string {
  const t = jsonType(value);
  if (t === "string") return JSON.stringify(value);
  if (t === "number" || t === "boolean" || t === "null") return String(value);
  if (t === "array") return `array(len=${(value as unknown[]).length})`;
  if (t === "object") return "object";
  return t;
}

type PathStats = {
  types: Set<string>;
  samples: Set<string>;
};

function mapJsonLayout(
  root: unknown,
  opts?: {
    maxDepth?: number;
    maxArrayItemsToSample?: number;
    maxSamplesPerPath?: number;
  },
): Map<string, PathStats> {
  const maxDepth = opts?.maxDepth ?? 12;
  const maxArrayItemsToSample = opts?.maxArrayItemsToSample ?? 3;
  const maxSamplesPerPath = opts?.maxSamplesPerPath ?? 2;

  const stats = new Map<string, PathStats>();
  const seen = new WeakSet<object>();

  function record(path: string, value: unknown) {
    const s = stats.get(path) ?? { types: new Set<string>(), samples: new Set<string>() };
    s.types.add(jsonType(value));
    if (s.samples.size < maxSamplesPerPath) s.samples.add(formatSample(value));
    stats.set(path, s);
  }

  function walk(value: unknown, path: string, depth: number) {
    record(path, value);
    if (depth >= maxDepth) return;

    if (value && typeof value === "object") {
      if (seen.has(value as object)) return;
      seen.add(value as object);
    }

    if (Array.isArray(value)) {
      for (let i = 0; i < Math.min(value.length, maxArrayItemsToSample); i++) {
        walk(value[i], `${path}[]`, depth + 1);
      }
      return;
    }

    if (value && typeof value === "object") {
      const obj = value as Record<string, unknown>;
      for (const key of Object.keys(obj).sort()) {
        walk(obj[key], path ? `${path}.${key}` : key, depth + 1);
      }
    }
  }

  walk(root, "", 0);
  return stats;
}

function printJsonLayout(title: string, root: unknown) {
  console.log(`\n===== ${title} =====`);
  const layout = mapJsonLayout(root);
  const paths = Array.from(layout.keys()).sort((a, b) => a.localeCompare(b));

  for (const path of paths) {
    const s = layout.get(path)!;
    const types = Array.from(s.types).sort().join(" | ");
    const samples = Array.from(s.samples).sort().join(", ");
    const label = path === "" ? "<root>" : path;
    console.log(`${label}: ${types}${samples ? `  (e.g. ${samples})` : ""}`);
  }
}

function parseArgs(argv: string[]) {
  const out: { query: string; fieldMask: string } = {
    query: "Top landmarks in Tokyo",
    fieldMask: "places.displayName,places.formattedAddress,places.id",
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--query" && argv[i + 1]) out.query = argv[++i]!;
    else if (a === "--fieldMask" && argv[i + 1]) out.fieldMask = argv[++i]!;
  }

  return out;
}

async function testGooglePlaces() {
  if (!API_KEY) {
    console.error("❌ GOOGLE_PLACES_API_KEY is not set in .env.local");
    console.error("Tip: run with `GOOGLE_PLACES_API_KEY=... node ...` or set it in .env.local");
    return;
  }

  const { query, fieldMask } = parseArgs(process.argv.slice(2));

  console.log("🔍 Testing Google Places API (New)...");
  console.log(`Query: ${query}`);
  console.log(`FieldMask: ${fieldMask}`);

  try {
    // Testing with the New Text Search (ID Service)
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask": fieldMask,
      },
      body: JSON.stringify({
        textQuery: query,
      }),
    });

    const data = (await response.json()) as unknown;

    if (response.ok) {
      console.log("✅ API Key is working!");
      printJsonLayout("FULL RESPONSE LAYOUT", data);

      // If it's the expected response shape, also print a focused mapping of places[] only.
      const maybePlaces = (data as any)?.places;
      if (Array.isArray(maybePlaces)) {
        printJsonLayout("places[] OBJECT LAYOUT (sampled)", maybePlaces.slice(0, 5));
        console.log("\n📍 Sample results:");
        maybePlaces.slice(0, 3).forEach((place: any) => {
          const name = place?.displayName?.text ?? "<no displayName.text>";
          const addr = place?.formattedAddress ?? "<no formattedAddress>";
          console.log(`- ${name} (${addr})`);
        });
      }
    } else {
      const msg = (data as any)?.error?.message || "Unknown error";
      console.error("❌ API Error:", msg);
      printJsonLayout("ERROR RESPONSE LAYOUT", data);
      console.log("\nFull error data:", JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error("❌ Fetch failed:", error);
  }
}

testGooglePlaces();

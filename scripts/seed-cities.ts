/**
 * Seed the `cities` table from a SimpleMaps worldcities CSV.
 *
 * Usage:
 *   npx tsx scripts/seed-cities.ts <path-to-csv>
 *
 * Expected CSV columns (SimpleMaps Basic v1.7+ format):
 *   city,city_ascii,lat,lng,country,iso2,iso3,admin_name,capital,population,id
 *
 * Download (free, CC BY 4.0): https://simplemaps.com/data/world-cities
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local (writes bypass RLS).
 */

import { config as loadEnv } from "dotenv";
import fs from "node:fs";
import readline from "node:readline";
import { createClient } from "@supabase/supabase-js";

loadEnv({ path: ".env.local" });
loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}

const csvPath = process.argv[2];
if (!csvPath || !fs.existsSync(csvPath)) {
  console.error(`CSV not found. Usage: npx tsx scripts/seed-cities.ts <path>`);
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

type Row = {
  id: number;
  city: string;
  city_ascii: string;
  lat: number | null;
  lng: number | null;
  country: string;
  iso2: string;
  iso3: string;
  admin_name: string;
  capital: string;
  population: number | null;
};

// Minimal CSV parser that handles quoted fields with commas.
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

async function main() {
  const stream = fs.createReadStream(csvPath);
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let header: string[] | null = null;
  const batch: Row[] = [];
  const BATCH_SIZE = 500;
  let inserted = 0;
  let skipped = 0;

  const flush = async () => {
    if (batch.length === 0) return;
    const { error } = await admin.from("cities").upsert(batch, { onConflict: "id" });
    if (error) {
      console.error("Batch upsert failed:", error.message);
      process.exit(1);
    }
    inserted += batch.length;
    process.stdout.write(`\rinserted: ${inserted}  skipped: ${skipped}`);
    batch.length = 0;
  };

  for await (const rawLine of rl) {
    const line = rawLine.trim();
    if (!line) continue;
    const fields = parseCsvLine(line);
    if (!header) {
      header = fields.map((h) => h.replace(/^"|"$/g, "").trim());
      continue;
    }

    const get = (col: string) => {
      const idx = header!.indexOf(col);
      return idx >= 0 ? (fields[idx]?.replace(/^"|"$/g, "") ?? "") : "";
    };

    const idStr = get("id");
    const id = Number.parseInt(idStr, 10);
    if (!Number.isFinite(id)) {
      skipped++;
      continue;
    }

    const row: Row = {
      id,
      city: get("city"),
      city_ascii: get("city_ascii"),
      lat: Number.parseFloat(get("lat")) || null,
      lng: Number.parseFloat(get("lng")) || null,
      country: get("country"),
      iso2: get("iso2"),
      iso3: get("iso3"),
      admin_name: get("admin_name"),
      capital: get("capital"),
      population: Number.parseInt(get("population"), 10) || null,
    };

    batch.push(row);
    if (batch.length >= BATCH_SIZE) await flush();
  }
  await flush();

  console.log(`\nDone. Inserted/upserted: ${inserted}, skipped: ${skipped}`);
  console.log(
    "Note: search_document was populated by the BEFORE INSERT/UPDATE trigger. " +
      "If you later add AI insights and want to refresh search vectors, run:\n" +
      "  UPDATE public.cities SET city = city;"
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

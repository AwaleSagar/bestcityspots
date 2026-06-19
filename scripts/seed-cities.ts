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
  /**
   * Computed client-side with full-dataset collision resolution. On a blank
   * project the unique index `cities_slug_key` + naive slug trigger exist
   * BEFORE seeding (unlike production, which seeded first and backfilled),
   * so relying on the trigger aborts the batch on the first duplicate
   * city+country slug. Providing an explicit, pre-deduplicated slug makes
   * seeding order-independent; the trigger leaves non-empty slugs alone.
   */
  slug: string;
};

// Mirrors public.slugify_city(): unaccent + lowercase + non-alnum runs → '-'.
// NFD strip covers combining accents; the map covers common non-decomposable
// letters so client slugs stay close to the SQL function's output.
const CHAR_MAP: Record<string, string> = {
  ø: "o",
  Ø: "o",
  æ: "ae",
  Æ: "ae",
  œ: "oe",
  Œ: "oe",
  ß: "ss",
  đ: "d",
  Đ: "d",
  ð: "d",
  Ð: "d",
  þ: "th",
  Þ: "th",
  ł: "l",
  Ł: "l",
};

function slugifyCity(city: string, country: string): string {
  const raw = `${city ?? ""}-${country ?? ""}`
    .replace(/[øØæÆœŒßđĐðÐþÞłŁ]/g, (ch) => CHAR_MAP[ch] ?? ch)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
  return raw.replace(/^-+|-+$/g, "");
}

/**
 * Assign unique slugs using the same rules as the migration backfill
 * (202605080000): within a colliding group, the highest-population row keeps
 * the base slug; others get `-iso2`; anything still colliding gets `-id`
 * (ids are unique, so this terminates).
 */
function assignUniqueSlugs(rows: Row[]): void {
  const groups = new Map<string, Row[]>();
  for (const row of rows) {
    row.slug = slugifyCity(row.city, row.country) || `city-${row.id}`;
    const list = groups.get(row.slug);
    if (list) list.push(row);
    else groups.set(row.slug, [row]);
  }

  const taken = new Set(groups.keys());
  for (const [base, list] of groups) {
    if (list.length === 1) continue;
    list.sort((a, b) => (b.population ?? -1) - (a.population ?? -1) || a.id - b.id);
    for (const row of list.slice(1)) {
      const withIso = row.iso2 ? `${base}-${row.iso2.toLowerCase()}` : "";
      const candidate = withIso && !taken.has(withIso) ? withIso : `${base}-${row.id}`;
      row.slug = candidate;
      taken.add(candidate);
    }
  }
}

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
  const rows: Row[] = [];
  const BATCH_SIZE = 500;
  let skipped = 0;

  // Pass 1: parse the whole CSV (so slug collisions can be resolved with
  // full knowledge of the dataset, exactly like the migration backfill).
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

    rows.push({
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
      slug: "",
    });
  }

  // Pass 2: collision-free slugs across the entire dataset.
  assignUniqueSlugs(rows);
  console.log(`parsed ${rows.length} rows (${skipped} skipped); slugs deduplicated`);

  // Pass 3: batched upsert.
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await admin.from("cities").upsert(batch, { onConflict: "id" });
    if (error) {
      console.error(`\nBatch upsert failed (rows ${i}-${i + batch.length}):`, error.message);
      process.exit(1);
    }
    inserted += batch.length;
    process.stdout.write(`\rinserted: ${inserted}/${rows.length}`);
  }

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

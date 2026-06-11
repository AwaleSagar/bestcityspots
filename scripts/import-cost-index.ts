#!/usr/bin/env npx tsx
/**
 * US-09 / ADR-001: import cost-of-living indices into city_metrics.
 *
 * Usage:
 *   npm run import:cost                          # data/cost-of-living.csv
 *   npx tsx scripts/import-cost-index.ts <csv>   # explicit path
 *   ... -- --dry-run                             # match + report, no writes
 *
 * CSV columns (header required): city,country,cost_index,source,as_of
 *   cost_index: number (NYC = 100 convention)
 *   source:     short provenance label, e.g. "WhereNext (public domain)"
 *   as_of:      ISO date the figure was published
 *
 * Matching: case-insensitive (city_ascii OR city) + country. Unmatched rows
 * are reported, never guessed. Existing `source` JSON on the row is merged,
 * not replaced — live pollution/climate provenance is preserved.
 */

import { config } from "dotenv";
import { resolve } from "path";
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

function fail(msg: string): never {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

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
  return out.map((s) => s.trim());
}

interface CostRow {
  city: string;
  country: string;
  cost_index: number;
  source: string;
  as_of: string;
}

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== "--");
  const dryRun = args.includes("--dry-run");
  const csvPath = args.find((a) => !a.startsWith("--")) ?? "data/cost-of-living.csv";

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) fail("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");

  let raw: string;
  try {
    raw = readFileSync(resolve(process.cwd(), csvPath), "utf-8");
  } catch {
    fail(
      `CSV not found: ${csvPath}\n  Procure the dataset per docs/adr-001-cost-of-living-source.md`
    );
  }

  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const col = (name: string) => header.indexOf(name);
  for (const required of ["city", "country", "cost_index", "source", "as_of"]) {
    if (col(required) === -1) fail(`CSV missing required column: ${required}`);
  }

  const rows: CostRow[] = [];
  for (const line of lines.slice(1)) {
    const fields = parseCsvLine(line);
    const value = Number.parseFloat(fields[col("cost_index")]);
    if (!Number.isFinite(value) || value <= 0) continue;
    rows.push({
      city: fields[col("city")],
      country: fields[col("country")],
      cost_index: Math.round(value * 10) / 10,
      source: fields[col("source")] || "curated dataset",
      as_of: fields[col("as_of")] || new Date().toISOString().slice(0, 10),
    });
  }
  if (rows.length === 0) fail("No valid rows in CSV");
  console.log(`Parsed ${rows.length} cost rows from ${csvPath}`);

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  let matched = 0;
  let unmatched = 0;
  let written = 0;

  for (const row of rows) {
    const { data: cities, error } = await supabase
      .from("cities")
      .select("id, city, city_ascii, country, population")
      .ilike("country", row.country)
      .or(`city_ascii.ilike.${row.city},city.ilike.${row.city}`)
      .order("population", { ascending: false, nullsFirst: false })
      .limit(1);

    if (error) fail(`City lookup failed for "${row.city}, ${row.country}": ${error.message}`);
    const city = cities?.[0];
    if (!city) {
      unmatched++;
      console.warn(`  – no match: ${row.city}, ${row.country}`);
      continue;
    }
    matched++;
    if (dryRun) continue;

    // Merge source provenance instead of replacing the JSON blob.
    const { data: existing } = await supabase
      .from("city_metrics")
      .select("source")
      .eq("city_id", city.id)
      .maybeSingle();
    const mergedSource = {
      ...((existing?.source as Record<string, unknown>) ?? {}),
      cost: `${row.source} (as of ${row.as_of})`,
    };

    const { error: upsertError } = await supabase.from("city_metrics").upsert(
      {
        city_id: city.id,
        cost_index: row.cost_index,
        source: mergedSource,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "city_id" }
    );
    if (upsertError) fail(`Upsert failed for city ${city.id}: ${upsertError.message}`);
    written++;
  }

  console.log(
    `\n✓ Done. matched=${matched} written=${written} unmatched=${unmatched}` +
      (dryRun ? " (dry run — nothing written)" : "")
  );
  if (matched < 500) {
    console.warn(
      `  Note: matched coverage (${matched}) is below the US-09 target of 500 — ` +
        "consider the Numbeo license upgrade path in ADR-001."
    );
  }
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));

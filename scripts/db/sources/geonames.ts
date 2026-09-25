/**
 * GeoNames reference data (https://www.geonames.org, CC BY 4.0).
 *
 * Downloads (cached under data/geonames/, gitignored):
 *   cities15000.zip       cities with population > 15,000 or national capitals
 *   admin1CodesASCII.txt  first-level admin division names (states, regions…)
 *   countryInfo.txt       country names and ISO codes
 *
 * Produces rows shaped exactly like public.countries / public.cities /
 * public.city_aliases (supabase/migrations/20260925120100_reference_data.sql).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { unzipSync } from "fflate";
import { z } from "zod";

export const GEONAMES_DIR = "data/geonames";
const BASE_URL = "https://download.geonames.org/export/dump";
const FILES = ["cities15000.zip", "admin1CodesASCII.txt", "countryInfo.txt"] as const;

export const GEONAMES_ATTRIBUTION =
  "GeoNames (https://www.geonames.org), licensed CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)";

export interface CountryRow {
  iso2: string;
  iso3: string;
  name: string;
  continent: string | null;
  capital: string | null;
  population: number | null;
}

export interface CityRow {
  id: number;
  city: string;
  city_ascii: string;
  slug: string;
  lat: number;
  lng: number;
  country: string;
  iso2: string;
  iso3: string;
  admin_name: string;
  capital: "" | "primary" | "admin" | "minor";
  population: number;
}

export interface AliasRow {
  city_id: number;
  alias: string;
}

export interface GeoNamesDataset {
  countries: CountryRow[];
  cities: CityRow[];
  aliases: AliasRow[];
  skipped: { invalidRows: number; unknownCountry: number };
}

// ---------------------------------------------------------------------------
// Download
// ---------------------------------------------------------------------------

export async function ensureGeoNamesFiles(
  options: { refresh?: boolean; log?: (m: string) => void } = {}
) {
  const log = options.log ?? (() => {});
  mkdirSync(GEONAMES_DIR, { recursive: true });
  for (const file of FILES) {
    const target = join(GEONAMES_DIR, file);
    if (existsSync(target) && !options.refresh) continue;
    log(`downloading ${BASE_URL}/${file}`);
    const response = await fetch(`${BASE_URL}/${file}`, {
      headers: { "user-agent": "bestcityspots-seed/1.0 (+https://bestcityspots.com)" },
    });
    if (!response.ok) {
      throw new Error(`GeoNames download failed for ${file}: HTTP ${response.status}`);
    }
    writeFileSync(target, Buffer.from(await response.arrayBuffer()));
  }
}

// ---------------------------------------------------------------------------
// Parse
// ---------------------------------------------------------------------------

const countryLine = z.object({
  iso2: z.string().regex(/^[A-Z]{2}$/),
  iso3: z.string().regex(/^[A-Z]{3}$/),
  name: z.string().min(1).max(120),
  capital: z.string().max(200),
  population: z.coerce.number().int().nonnegative(),
  continent: z.enum(["AF", "AN", "AS", "EU", "NA", "OC", "SA"]),
});

const cityLine = z.object({
  id: z.coerce.number().int().positive(),
  name: z.string().min(1).max(200),
  asciiname: z.string().max(200),
  alternatenames: z.string(),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  featureCode: z.string(),
  countryCode: z.string().regex(/^[A-Z]{2}$/),
  admin1: z.string(),
  population: z.coerce.number().int().nonnegative(),
});

function lines(text: string): string[][] {
  return text
    .split("\n")
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .map((line) => line.replace(/\r$/, "").split("\t"));
}

function parseCountries(text: string): CountryRow[] {
  const rows: CountryRow[] = [];
  for (const cols of lines(text)) {
    const parsed = countryLine.safeParse({
      iso2: cols[0],
      iso3: cols[1],
      name: cols[4],
      capital: cols[5] ?? "",
      population: cols[7] || 0,
      continent: cols[8],
    });
    if (!parsed.success) continue;
    const c = parsed.data;
    rows.push({
      iso2: c.iso2,
      iso3: c.iso3,
      name: c.name,
      continent: c.continent,
      capital: c.capital || null,
      population: c.population || null,
    });
  }
  return rows;
}

function parseAdmin1(text: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const cols of lines(text)) {
    if (cols[0] && cols[1]) map.set(cols[0], cols[1]);
  }
  return map;
}

/** GeoNames feature codes → the app's `capital` vocabulary (see city-display.ts). */
function capitalFromFeatureCode(code: string): CityRow["capital"] {
  if (code === "PPLC") return "primary";
  if (code === "PPLA") return "admin";
  if (code === "PPLA2" || code === "PPLA3" || code === "PPLA4") return "minor";
  return "";
}

// Letters NFD can't decompose; keeps slugs/ASCII names readable (ø → o, ß → ss).
const CHAR_MAP: Record<string, string> = {
  ø: "o",
  Ø: "O",
  æ: "ae",
  Æ: "AE",
  œ: "oe",
  Œ: "OE",
  ß: "ss",
  đ: "d",
  Đ: "D",
  ð: "d",
  Ð: "D",
  þ: "th",
  Þ: "Th",
  ł: "l",
  Ł: "L",
  ı: "i",
};

export function toAscii(value: string): string {
  return value
    .replace(/[øØæÆœŒßđĐðÐþÞłŁı]/g, (ch) => CHAR_MAP[ch] ?? ch)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7e]/g, "")
    .trim();
}

export function slugify(city: string, country: string): string {
  return toAscii(`${city}-${country}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * The production URL rule, unchanged from the previous backend: base slug
 * `city-country`; within a colliding group the most populous city keeps it,
 * the rest get `-<iso2>`, then `-<id>` (ids are unique, so this terminates).
 */
export function assignUniqueSlugs(rows: CityRow[]): void {
  const groups = new Map<string, CityRow[]>();
  for (const row of rows) {
    row.slug =
      slugify(row.city, row.country) || slugify(row.city_ascii, row.country) || `city-${row.id}`;
    const group = groups.get(row.slug);
    if (group) group.push(row);
    else groups.set(row.slug, [row]);
  }

  const taken = new Set(groups.keys());
  for (const [base, group] of groups) {
    if (group.length === 1) continue;
    group.sort((a, b) => b.population - a.population || a.id - b.id);
    for (const row of group.slice(1)) {
      const withIso = `${base}-${row.iso2.toLowerCase()}`;
      const candidate = taken.has(withIso) ? `${base}-${row.id}` : withIso;
      row.slug = candidate;
      taken.add(candidate);
    }
  }
}

// Capitalised Latin-script names only: GeoNames also lists lowercase machine
// romanisations of other scripts ("bmbyy", "dong jing") that are search noise.
const ALIAS_RE = /^[A-Z][A-Za-z .'-]*[A-Za-z.]$/;
const MAX_ALIASES_PER_CITY = 25;

/**
 * ASCII-only alternate names useful for search (Bombay → Mumbai, Peking →
 * Beijing). Drops airport/IATA-style codes, duplicates and the city's own name.
 */
export function pickAliases(alternateNames: string, own: string[]): string[] {
  const seen = new Set(own.map((name) => name.toLowerCase()));
  const candidates: string[] = [];
  for (const raw of alternateNames.split(",")) {
    const alias = raw.trim().replace(/\s+/g, " ");
    if (alias.length < 3 || alias.length > 60) continue;
    if (!ALIAS_RE.test(alias)) continue;
    if (/^[A-Z]{2,5}$/.test(alias)) continue; // IATA / ICAO / abbreviations
    const key = alias.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push(alias);
  }
  // GeoNames lists names alphabetically; well-known exonyms (Peking, Bombay,
  // Londres) are short, so keep the shortest names when capping.
  return candidates
    .sort((a, b) => a.length - b.length || a.localeCompare(b))
    .slice(0, MAX_ALIASES_PER_CITY);
}

export function loadGeoNames(): GeoNamesDataset {
  const countries = parseCountries(readFileSync(join(GEONAMES_DIR, "countryInfo.txt"), "utf8"));
  const admin1 = parseAdmin1(readFileSync(join(GEONAMES_DIR, "admin1CodesASCII.txt"), "utf8"));
  const zip = unzipSync(readFileSync(join(GEONAMES_DIR, "cities15000.zip")));
  const citiesText = zip["cities15000.txt"];
  if (!citiesText) throw new Error("cities15000.zip does not contain cities15000.txt");

  const byIso2 = new Map(countries.map((c) => [c.iso2, c]));
  const cities: CityRow[] = [];
  const aliases: AliasRow[] = [];
  let invalidRows = 0;
  let unknownCountry = 0;

  for (const cols of lines(new TextDecoder("utf-8").decode(citiesText))) {
    const parsed = cityLine.safeParse({
      id: cols[0],
      name: cols[1],
      asciiname: cols[2] ?? "",
      alternatenames: cols[3] ?? "",
      lat: cols[4],
      lng: cols[5],
      featureCode: cols[7] ?? "",
      countryCode: cols[8],
      admin1: cols[10] ?? "",
      population: cols[14] || 0,
    });
    if (!parsed.success) {
      invalidRows += 1;
      continue;
    }
    const row = parsed.data;
    const country = byIso2.get(row.countryCode);
    if (!country) {
      unknownCountry += 1;
      continue;
    }

    const cityAscii = (row.asciiname || toAscii(row.name)).slice(0, 200);
    if (!cityAscii) {
      invalidRows += 1;
      continue;
    }

    cities.push({
      id: row.id,
      city: row.name,
      city_ascii: cityAscii,
      slug: "",
      lat: row.lat,
      lng: row.lng,
      country: country.name,
      iso2: country.iso2,
      iso3: country.iso3,
      admin_name: (admin1.get(`${row.countryCode}.${row.admin1}`) ?? "").slice(0, 200),
      capital: capitalFromFeatureCode(row.featureCode),
      population: row.population,
    });

    for (const alias of pickAliases(row.alternatenames, [row.name, cityAscii])) {
      aliases.push({ city_id: row.id, alias });
    }
  }

  assignUniqueSlugs(cities);
  cities.sort((a, b) => b.population - a.population || a.id - b.id);

  return { countries, cities, aliases, skipped: { invalidRows, unknownCountry } };
}

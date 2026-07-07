/**
 * Component pattern aggregator — extracts button/input patterns from raw
 * per-site scrapes and buckets them into a peer-evidence summary.
 *
 * Emits docs/component-patterns.json — the file cited by the redesign plan's
 * C pillar ("Component system 2.0") and A3 (radius law).
 *
 * Usage:
 *   npx tsx scripts/design-scrape/components.ts
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { SOURCES } from "./sources";
import { normalizeHex, type SiteScrape } from "./schema";

const SITES_DIR = resolve(".firecrawl/design/sites");
const OUT = resolve("docs/component-patterns.json");

// ---------------------------------------------------------------------------
// Source lookup
// ---------------------------------------------------------------------------

const SOURCE_MAP = new Map(SOURCES.map((s) => [s.slug, s]));

// ---------------------------------------------------------------------------
// Radius parsing + bucketing
// ---------------------------------------------------------------------------

function parseRadiusPx(raw: unknown): number | null {
  if (typeof raw === "number") return raw;
  if (typeof raw !== "string") return null;
  const m = raw.match(/([\d.]+)\s*px/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return Number.isFinite(n) ? n : null;
}

type RadiusBucket = "sharp" | "soft" | "rounded" | "pill";

function bucketRadius(px: number): RadiusBucket {
  if (px <= 4) return "sharp";
  if (px <= 12) return "soft";
  if (px <= 24) return "rounded";
  return "pill"; // includes 9999px and the 33M sentinel Firecrawl uses for pills
}

// ---------------------------------------------------------------------------
// Fill classification
// ---------------------------------------------------------------------------

type FillType = "brand" | "light" | "dark" | "ghost";

function hexToRgb(hex: string): [number, number, number] | null {
  const h = hex.replace("#", "");
  if (h.length !== 6) return null;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function luminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function classifyFill(bgRaw: unknown, primaryHex?: string): FillType {
  const bg = normalizeHex(bgRaw);
  if (!bg) return "ghost"; // transparent / null
  const rgb = hexToRgb(bg);
  if (!rgb) return "ghost";

  // Brand-colored? Compare to site primary.
  if (primaryHex) {
    const prgb = hexToRgb(primaryHex);
    if (prgb) {
      const dist =
        Math.abs(rgb[0] - prgb[0]) + Math.abs(rgb[1] - prgb[1]) + Math.abs(rgb[2] - prgb[2]);
      if (dist < 90) return "brand";
    }
  }
  // Otherwise by luminance
  const lum = luminance(rgb);
  if (lum > 0.8) return "light";
  if (lum < 0.25) return "dark";
  return "brand"; // saturated mid — treat as brand-ish
}

// ---------------------------------------------------------------------------
// Component extraction per site
// ---------------------------------------------------------------------------

interface CompSample {
  slug: string;
  name: string;
  url: string;
  segment: string;
  radiusPx: number;
  radiusBucket: RadiusBucket;
  fill: FillType;
  flat: boolean; // shadow === "none"
}

interface ComponentAgg {
  sampleCount: number;
  radiusBuckets: Record<RadiusBucket, number>;
  fillTypes: Record<FillType, number>;
  flatCount: number;
  examples: Record<RadiusBucket, CompSample[]>; // one example per bucket
  notablePeers: CompSample[]; // named examples for citation
}

function emptyAgg(): ComponentAgg {
  return {
    sampleCount: 0,
    radiusBuckets: { sharp: 0, soft: 0, rounded: 0, pill: 0 },
    fillTypes: { brand: 0, light: 0, dark: 0, ghost: 0 },
    flatCount: 0,
    examples: { sharp: [], soft: [], rounded: [], pill: [] },
    notablePeers: [],
  };
}

function addSample(agg: ComponentAgg, s: CompSample) {
  agg.sampleCount++;
  agg.radiusBuckets[s.radiusBucket]++;
  agg.fillTypes[s.fill]++;
  if (s.flat) agg.flatCount++;
  if (agg.examples[s.radiusBucket].length < 3) agg.examples[s.radiusBucket].push(s);
  // Keep named peers (prefer brand-colored, flat, well-known)
  if (s.flat && (s.fill === "brand" || s.fill === "light") && agg.notablePeers.length < 8) {
    agg.notablePeers.push(s);
  }
}

function extractComponent(
  data: SiteScrape,
  key: "buttonPrimary" | "buttonSecondary" | "input",
  slug: string,
  primaryHex?: string
): CompSample | null {
  const c = data?.branding?.components?.[key];
  if (!c) return null;
  const px = parseRadiusPx(c.borderRadius);
  if (px === null) return null;
  const src = SOURCE_MAP.get(slug);
  return {
    slug,
    name: src?.name ?? slug,
    url: src?.url ?? "",
    segment: src?.segment ?? "unknown",
    radiusPx: px,
    radiusBucket: bucketRadius(px),
    fill: classifyFill(c.background, key === "input" ? undefined : primaryHex),
    flat: !c.shadow || c.shadow === "none",
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const files = readdirSync(SITES_DIR).filter((f) => f.endsWith(".json"));
  const primary = emptyAgg();
  const secondary = emptyAgg();
  const input = emptyAgg();

  for (const f of files) {
    const slug = f.replace(/\.json$/, "");
    let data: SiteScrape;
    try {
      data = JSON.parse(readFileSync(resolve(SITES_DIR, f), "utf8")) as SiteScrape;
    } catch {
      continue;
    }
    const primaryHex = normalizeHex(data?.branding?.colors?.primary);

    const p = extractComponent(data, "buttonPrimary", slug, primaryHex);
    if (p) addSample(primary, p);
    const s = extractComponent(data, "buttonSecondary", slug, primaryHex);
    if (s) addSample(secondary, s);
    const i = extractComponent(data, "input", slug, primaryHex);
    if (i) addSample(input, i);
  }

  const out = {
    generated: new Date().toISOString(),
    sourceCount: files.length,
    summary: {
      buttonPrimary: { n: primary.sampleCount, ...summarize(primary) },
      buttonSecondary: { n: secondary.sampleCount, ...summarize(secondary) },
      input: { n: input.sampleCount, ...summarize(input) },
    },
    details: { buttonPrimary: primary, buttonSecondary: secondary, input },
    citation: {
      purpose:
        "Peer evidence for component decisions. Each redesign choice cites the dominant field pattern and our deliberate divergence where applicable.",
      generatedBy: "scripts/design-scrape/components.ts",
    },
  };

  writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(`Wrote ${OUT}`);
  console.log(`buttonPrimary n=${primary.sampleCount}: ${JSON.stringify(summarize(primary))}`);
  console.log(
    `buttonSecondary n=${secondary.sampleCount}: ${JSON.stringify(summarize(secondary))}`
  );
  console.log(`input n=${input.sampleCount}: ${JSON.stringify(summarize(input))}`);
}

function summarize(agg: ComponentAgg) {
  const r = agg.radiusBuckets;
  const f = agg.fillTypes;
  const total = agg.sampleCount || 1;
  return {
    radius: r,
    radiusDominant: (Object.entries(r) as Array<[RadiusBucket, number]>).sort(
      (a, b) => b[1] - a[1]
    )[0][0],
    fillDominant: (Object.entries(f) as Array<[FillType, number]>).sort(
      (a, b) => b[1] - a[1]
    )[0][0],
    flatPct: `${Math.round((agg.flatCount / total) * 100)}%`,
    peersForCitation: agg.notablePeers.slice(0, 5).map((p) => p.name),
  };
}

main();

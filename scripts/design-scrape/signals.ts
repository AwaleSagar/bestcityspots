/**
 * Generates docs/competitor-design-signals.md — the slim, reviewable
 * headline-signals doc cited by the redesign plan. Computes color families
 * by hue (not prefix matching), radius/typography/tone distributions.
 *
 * Also copies the generated catalog into docs/competitor-design-catalog.md.
 *
 * Usage:
 *   npx tsx scripts/design-scrape/signals.ts
 */

import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { resolve } from "node:path";
import { readdirSync } from "node:fs";
import { SOURCES } from "./sources";
import type { DesignTokens } from "./schema";

const SITES_DIR = resolve(".firecrawl/design/sites");
const TOKENS = resolve(".firecrawl/design/tokens.json");
const SIGNALS_OUT = resolve("docs/competitor-design-signals.md");
const CATALOG_OUT = resolve("docs/competitor-design-catalog.md");
const CATALOG_SRC = resolve(".firecrawl/design/index.md");

// ---------------------------------------------------------------------------
// Color classification by hue
// ---------------------------------------------------------------------------

function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const h = hex.replace("#", "");
  if (h.length !== 6) return null;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let s = 0;
  let hue = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        hue = ((g - b) / d + (g < b ? 6 : 0)) * 60;
        break;
      case g:
        hue = ((b - r) / d + 2) * 60;
        break;
      default:
        hue = ((r - g) / d + 4) * 60;
    }
  }
  return { h: hue, s: s * 100, l: l * 100 };
}

type ColorFamily =
  | "blue"
  | "coral/orange/red"
  | "green"
  | "purple"
  | "yellow/gold"
  | "neutral/dark"
  | "white/light";

function classifyFamily(hex: string): ColorFamily {
  const hsl = hexToHsl(hex);
  if (!hsl) return "neutral/dark";
  const { h, s, l } = hsl;
  if (s < 12) return l > 80 ? "white/light" : "neutral/dark";
  if (h < 15 || h >= 345) return "coral/orange/red";
  if (h < 45) return "coral/orange/red";
  if (h < 70) return "yellow/gold";
  if (h < 165) return "green";
  if (h < 255) return "blue";
  return "purple";
}

// ---------------------------------------------------------------------------
// Radius parsing
// ---------------------------------------------------------------------------

function parseRadius(raw: unknown): number | null {
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const m = raw.match(/([\d.]+)\s*px/i);
    if (m) return parseFloat(m[1]);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const SRC_MAP = new Map(SOURCES.map((s) => [s.slug, s])); // reserved for per-site enrichment
void SRC_MAP;

function main() {
  const tokens = JSON.parse(readFileSync(TOKENS, "utf8")) as DesignTokens[];

  // --- Color families ---
  const colorFamilies = new Map<ColorFamily, string[]>();
  for (const t of tokens) {
    const p = t.colors?.primary;
    if (!p) continue;
    const fam = classifyFamily(p);
    if (!colorFamilies.has(fam)) colorFamilies.set(fam, []);
    colorFamilies.get(fam)!.push(t.name || t.slug);
  }

  // --- Radius (from component-patterns + raw tokens borderRadius) ---
  const radii: number[] = [];
  const files = readdirSync(SITES_DIR).filter((f) => f.endsWith(".json"));
  for (const f of files) {
    try {
      const d = JSON.parse(readFileSync(resolve(SITES_DIR, f), "utf8"));
      const comps = d?.branding?.components ?? {};
      for (const k of ["buttonPrimary", "buttonSecondary", "input"]) {
        const px = parseRadius(comps[k]?.borderRadius);
        if (px !== null && px < 1000) radii.push(px);
      }
    } catch {
      /* skip */
    }
  }

  // --- Typography ---
  const bodyFonts = new Map<string, string[]>();
  for (const t of tokens) {
    const f = t.primaryBodyFont;
    if (!f) continue;
    if (!bodyFonts.has(f)) bodyFonts.set(f, []);
    bodyFonts.get(f)!.push(t.name || t.slug);
  }

  // --- Tone ---
  const tones = new Map<string, number>();
  for (const t of tokens) {
    if (t.tone) tones.set(t.tone, (tones.get(t.tone) ?? 0) + 1);
  }

  // --- Build markdown ---
  const L: string[] = [];
  L.push("# Competitor Design Signals");
  L.push("");
  L.push("> Slim headline-signals doc. Computed from the 98-site dataset");
  L.push("> (`.firecrawl/design/tokens.json`) by `scripts/design-scrape/signals.ts`.");
  L.push("> Full per-site detail in");
  L.push("> `competitor-design-catalog.md`; component-level stats in");
  L.push("> `component-patterns.json`.");
  L.push("");
  L.push(`Generated: ${new Date().toISOString().slice(0, 10)} · n = ${tokens.length}`);
  L.push("");

  L.push("## Primary color family");
  L.push("");
  L.push("| Family | Sites | Examples |");
  L.push("| --- | --- | --- |");
  const colorRows = [...colorFamilies.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [fam, names] of colorRows) {
    const ex = names.slice(0, 4).join(", ");
    L.push(`| ${fam} | ${names.length} | ${ex} |`);
  }
  L.push("");
  L.push("> **Our position:** Coral Spark `#E8543F` is in the coral/orange/red family —");
  L.push("> a small cluster vs the blue and neutral/dark majority. Scarcity = distinction.");
  L.push("");

  L.push("## Border radius (components, n=" + radii.length + ")");
  L.push("");
  const sharp = radii.filter((r) => r <= 4).length;
  const soft = radii.filter((r) => r > 4 && r <= 12).length;
  const rounded = radii.filter((r) => r > 12 && r <= 24).length;
  const pill = radii.filter((r) => r > 24).length;
  L.push("| Bucket | Count | Share |");
  L.push("| --- | --- | --- |");
  L.push(`| sharp (0–4px) | ${sharp} | ${pct(sharp, radii.length)} |`);
  L.push(`| soft (5–12px) | ${soft} | ${pct(soft, radii.length)} |`);
  L.push(`| rounded (13–24px) | ${rounded} | ${pct(rounded, radii.length)} |`);
  L.push(`| pill (25px+) | ${pill} | ${pct(pill, radii.length)} |`);
  L.push("");
  L.push("> **Our position:** 8–40px organic scale. The field is sharp-dominant;");
  L.push("> we are deliberately the softest tier. Inputs especially — field skews");
  L.push("> sharp, we stay soft as a documented divergence (see component-patterns.json).");
  L.push("");

  L.push("## Top body fonts");
  L.push("");
  L.push("| Font | Sites |");
  L.push("| --- | --- |");
  const fontRows = [...bodyFonts.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 8);
  for (const [font, names] of fontRows) {
    L.push(`| \`${font}\` | ${names.length} |`);
  }
  L.push("");
  L.push("> **Our position:** Instrument Sans (not in the top 8) + Cormorant Garamond");
  L.push("> display. Reads beside AFAR/Monocle, not beside Booking/Kayak.");
  L.push("");

  L.push("## Perceived tone");
  L.push("");
  L.push("| Tone | Sites |");
  L.push("| --- | --- |");
  const toneRows = [...tones.entries()].sort((a, b) => b[1] - a[1]);
  for (const [tone, n] of toneRows) {
    L.push(`| ${tone} | ${n} |`);
  }
  L.push("");
  L.push("> **Our position:** editorial-calm — outside both the professional and modern");
  L.push("> clusters. Calm is a feature, codified in the motion policy doc.");
  L.push("");

  L.push("## Component patterns");
  L.push("");
  L.push("See `docs/component-patterns.json` for buttonPrimary (n=67), buttonSecondary");
  L.push("(n=56), and input (n=70) radius/fill/shadow distributions with named peer");
  L.push("citations.");
  L.push("");

  writeFileSync(SIGNALS_OUT, L.join("\n"));
  console.log(`Wrote ${SIGNALS_OUT}`);

  copyFileSync(CATALOG_SRC, CATALOG_OUT);
  console.log(`Copied catalog → ${CATALOG_OUT}`);

  // Console summary
  console.log("\nColor families:");
  for (const [fam, names] of colorRows) console.log(`  ${fam}: ${names.length}`);
  console.log(`\nRadius: sharp ${sharp}, soft ${soft}, rounded ${rounded}, pill ${pill}`);
}

function pct(n: number, total: number): string {
  return `${Math.round((n / total) * 100)}%`;
}

main();

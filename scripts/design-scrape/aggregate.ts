/**
 * Design System Aggregator — reads all per-site scrapes, normalizes to a
 * strict DesignTokens shape, and emits:
 *
 *   .firecrawl/design/tokens.json  — normalized array (for code reuse)
 *   .firecrawl/design/index.md     — human-readable catalog by segment
 *
 * Usage:
 *   npx tsx scripts/design-scrape/aggregate.ts
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { SiteScrapeSchema, DesignTokensSchema, normalizeHex, type DesignTokens } from "./schema";
import { SOURCES, SEGMENTS, type Segment } from "./sources";

// ---------------------------------------------------------------------------
// Lookup source metadata by slug
// ---------------------------------------------------------------------------

const SOURCE_MAP = new Map(SOURCES.map((s) => [s.slug, s]));

// ---------------------------------------------------------------------------
// Normalize one scrape file → DesignTokens
// ---------------------------------------------------------------------------

function pickHeadingFont(
  fonts: Array<{ family: string; role?: string }>,
  typography?: {
    fontFamilies?: Record<string, string>;
  }
): string | undefined {
  const heading = fonts.find((f) => /heading|display/i.test(f.role ?? ""));
  if (heading) return heading.family;
  if (typography?.fontFamilies?.heading) return typography.fontFamilies.heading;
  return fonts[0]?.family;
}

function pickBodyFont(
  fonts: Array<{ family: string; role?: string }>,
  typography?: {
    fontFamilies?: Record<string, string>;
  }
): string | undefined {
  const body = fonts.find((f) => /body|paragraph|text/i.test(f.role ?? ""));
  if (body) return body.family;
  if (typography?.fontFamilies?.primary) return typography.fontFamilies.primary;
  return fonts[1]?.family ?? fonts[0]?.family;
}

function normalizeFile(slug: string, filePath: string): DesignTokens | null {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    console.warn(`  ! ${slug}: invalid JSON, skipped`);
    return null;
  }

  const parsed = SiteScrapeSchema.safeParse(raw);
  if (!parsed.success) {
    console.warn(`  ! ${slug}: schema mismatch, skipped`);
    return null;
  }
  const data = parsed.data;
  const src = SOURCE_MAP.get(slug);

  const b = data.branding;
  const colors: Record<string, string> = {};
  if (b?.colors) {
    for (const [k, v] of Object.entries(b.colors)) {
      const norm = normalizeHex(v);
      if (norm) colors[k] = norm;
    }
  }

  const metaStr = (key: string): string | undefined => {
    const v = data.metadata?.[key];
    if (typeof v === "string") return v;
    if (Array.isArray(v)) return v.find((x) => typeof x === "string");
    return undefined;
  };

  const fonts = (b?.fonts ?? []).map((f) => f.family).filter(Boolean);
  const heading = pickHeadingFont(b?.fonts ?? [], b?.typography);
  const body = pickBodyFont(b?.fonts ?? [], b?.typography);

  const tokens: DesignTokens = {
    slug,
    url: src?.url ?? "",
    name: src?.name ?? slug,
    segment: src?.segment ?? "unknown",
    title: metaStr("og:site_name") ?? metaStr("title") ?? undefined,
    colorScheme: b?.colorScheme,
    colors: Object.keys(colors).length
      ? {
          primary: colors.primary,
          secondary: colors.secondary,
          accent: colors.accent,
          background: colors.background,
          textPrimary: colors.textPrimary,
          link: colors.link,
        }
      : undefined,
    fonts: fonts.length ? fonts : undefined,
    primaryHeadingFont: heading,
    primaryBodyFont: body,
    fontSizes: b?.typography?.fontSizes,
    spacingBaseUnit: b?.spacing?.baseUnit,
    borderRadius: b?.spacing?.borderRadius,
    framework: b?.designSystem?.framework,
    componentLibrary: b?.designSystem?.componentLibrary,
    tone: b?.personality?.tone,
    energy: b?.personality?.energy,
    targetAudience: b?.personality?.targetAudience,
    confidence: b?.confidence?.overall,
  };

  const v = DesignTokensSchema.safeParse(tokens);
  if (!v.success) {
    console.warn(`  ! ${slug}: normalized tokens failed validation`);
    return null;
  }
  return v.data;
}

// ---------------------------------------------------------------------------
// Aggregation helpers
// ---------------------------------------------------------------------------

function topFonts(tokens: DesignTokens[], key: "primaryHeadingFont" | "primaryBodyFont", n = 10) {
  const counts = new Map<string, number>();
  for (const t of tokens) {
    const f = t[key];
    if (f) counts.set(f, (counts.get(f) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([font, count]) => ({ font, count }));
}

function topColors(
  tokens: DesignTokens[],
  field: keyof NonNullable<DesignTokens["colors"]>,
  n = 10
) {
  const counts = new Map<string, number>();
  for (const t of tokens) {
    const c = t.colors?.[field];
    if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([color, count]) => ({ color, count }));
}

function swatch(hex?: string): string {
  if (!hex) return "";
  return `![](${swatchUrl(hex)})`;
}

function swatchUrl(hex: string): string {
  // 16x16 color chip via placeholder service, embeddable in markdown
  return `https://placehold.co/16x16/${hex.replace("#", "")}/${hex.replace("#", "")}.png`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const SITES_DIR = resolve(".firecrawl/design/sites");
const TOKENS_OUT = resolve(".firecrawl/design/tokens.json");
const INDEX_OUT = resolve(".firecrawl/design/index.md");

function main() {
  const files = readdirSync(SITES_DIR).filter((f) => f.endsWith(".json"));
  console.log(`Aggregating ${files.length} scrape files...`);

  const tokens: DesignTokens[] = [];
  for (const f of files) {
    const slug = f.replace(/\.json$/, "");
    const t = normalizeFile(slug, resolve(SITES_DIR, f));
    if (t) tokens.push(t);
  }

  tokens.sort((a, b) => a.segment.localeCompare(b.segment) || a.name.localeCompare(b.name));

  writeFileSync(TOKENS_OUT, JSON.stringify(tokens, null, 2));
  console.log(`Wrote ${tokens.length} tokens → ${TOKENS_OUT}`);

  // ----- Build markdown index -----
  const bySeg = new Map<Segment | "unknown", DesignTokens[]>();
  for (const t of tokens) {
    const arr = bySeg.get(t.segment as Segment) ?? [];
    arr.push(t);
    bySeg.set(t.segment as Segment, arr);
  }

  const lines: string[] = [];
  lines.push("# Travel Competitor Design System Catalog");
  lines.push("");
  lines.push(`> Auto-generated from ${tokens.length} sites via Firecrawl branding extraction.`);
  lines.push(`> Tokens: \`tokens.json\` · Raw scrapes: \`.firecrawl/design/sites/\``);
  lines.push("");

  // Aggregate stats
  lines.push("## Aggregate signals");
  lines.push("");
  lines.push("### Top heading fonts");
  for (const { font, count } of topFonts(tokens, "primaryHeadingFont")) {
    lines.push(`- \`${font}\` — ${count} sites`);
  }
  lines.push("");
  lines.push("### Top body fonts");
  for (const { font, count } of topFonts(tokens, "primaryBodyFont")) {
    lines.push(`- \`${font}\` — ${count} sites`);
  }
  lines.push("");
  lines.push("### Most common primary colors");
  for (const { color, count } of topColors(tokens, "primary")) {
    lines.push(`- ${swatch(color)}  \`${color}\` — ${count} sites`);
  }
  lines.push("");

  // Per-segment tables
  for (const seg of [...SEGMENTS, "unknown" as const]) {
    const arr = bySeg.get(seg);
    if (!arr || arr.length === 0) continue;
    lines.push(`## ${seg} (${arr.length})`);
    lines.push("");
    lines.push("| Site | Primary | Accent | Heading font | Body font | Tone | Conf |");
    lines.push("| --- | --- | --- | --- | --- | --- | --- |");
    for (const t of arr) {
      const primary = t.colors?.primary ?? "—";
      const accent = t.colors?.accent ?? "—";
      const heading = t.primaryHeadingFont ?? "—";
      const body = t.primaryBodyFont ?? "—";
      const tone = t.tone ?? "—";
      const conf = t.confidence != null ? `${(t.confidence * 100).toFixed(0)}%` : "—";
      const nameCell = `[${t.name}](<${t.url}>)`;
      const primaryCell = primary !== "—" ? `${swatch(primary)} \`${primary}\`` : "—";
      const accentCell = accent !== "—" ? `${swatch(accent)} \`${accent}\`` : "—";
      lines.push(
        `| ${nameCell} | ${primaryCell} | ${accentCell} | \`${heading}\` | \`${body}\` | ${tone} | ${conf} |`
      );
    }
    lines.push("");
  }

  writeFileSync(INDEX_OUT, lines.join("\n"));
  console.log(`Wrote catalog → ${INDEX_OUT}`);
  console.log(`\nSegments:`);
  for (const seg of [...SEGMENTS, "unknown" as const]) {
    const n = bySeg.get(seg)?.length ?? 0;
    if (n) console.log(`  ${seg.padEnd(16)} ${n}`);
  }
}

main();

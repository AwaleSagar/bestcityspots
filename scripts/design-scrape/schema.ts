/**
 * Zod schemas for Firecrawl branding output + normalized design tokens.
 *
 * The branding format varies per site (some fields optional), so the raw
 * schema is lenient. The normalized DesignTokens schema is strict and is
 * what aggregate.ts emits to tokens.json.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Raw Firecrawl branding output (lenient — fields vary per site)
// ---------------------------------------------------------------------------

export const ColorsSchema = z
  .object({
    primary: z.string().optional(),
    secondary: z.string().optional(),
    accent: z.string().optional(),
    background: z.string().optional(),
    textPrimary: z.string().optional(),
    textSecondary: z.string().optional(),
    link: z.string().optional(),
  })
  .passthrough();

export const FontSchema = z.object({
  family: z.string(),
  role: z.string().optional(),
});

export const TypographySchema = z
  .object({
    fontFamilies: z.record(z.string(), z.string()).optional(),
    fontStacks: z.record(z.string(), z.array(z.string())).optional(),
    fontSizes: z.record(z.string(), z.string()).optional(),
  })
  .passthrough();

export const SpacingSchema = z
  .object({
    baseUnit: z.union([z.number(), z.string()]).optional(),
    borderRadius: z.union([z.number(), z.string()]).optional(),
  })
  .passthrough();

export const ButtonSchema = z
  .object({
    background: z.string().optional(),
    textColor: z.string().optional(),
    borderColor: z.string().optional(),
    borderRadius: z.union([z.number(), z.string()]).optional(),
    shadow: z.string().optional(),
  })
  .passthrough();

export const ComponentsSchema = z
  .object({
    buttonPrimary: ButtonSchema.optional(),
    buttonSecondary: ButtonSchema.optional(),
    input: ButtonSchema.optional(),
  })
  .passthrough();

export const PersonalitySchema = z
  .object({
    tone: z.string().optional(),
    energy: z.string().optional(),
    targetAudience: z.string().optional(),
  })
  .passthrough();

export const ConfidenceSchema = z
  .object({
    overall: z.number().optional(),
    colors: z.number().optional(),
    buttons: z.number().optional(),
  })
  .passthrough();

export const DesignSystemSchema = z
  .object({
    framework: z.string().optional(),
    componentLibrary: z.string().optional(),
  })
  .passthrough();

export const ImagesSchema = z
  .object({
    logo: z.string().optional(),
    favicon: z.string().optional(),
    logoHref: z.string().optional(),
    ogImage: z.string().optional(),
  })
  .passthrough();

export const BrandingSchema = z
  .object({
    colors: ColorsSchema.optional(),
    fonts: z.array(FontSchema).optional(),
    typography: TypographySchema.optional(),
    spacing: SpacingSchema.optional(),
    colorScheme: z.string().optional(),
    designSystem: DesignSystemSchema.optional(),
    components: ComponentsSchema.optional(),
    personality: PersonalitySchema.optional(),
    confidence: ConfidenceSchema.optional(),
    images: z.any().optional(),
  })
  .passthrough();

export const MetadataSchema = z.any().optional();

export const SiteScrapeSchema = z.object({
  branding: BrandingSchema.optional(),
  markdown: z.string().optional(),
  metadata: MetadataSchema.optional(),
});

export type Branding = z.infer<typeof BrandingSchema>;
export type SiteScrape = z.infer<typeof SiteScrapeSchema>;

// ---------------------------------------------------------------------------
// Normalized DesignTokens (strict — what aggregate.ts emits)
// ---------------------------------------------------------------------------

export const DesignTokensSchema = z.object({
  slug: z.string(),
  url: z.string(),
  name: z.string(),
  segment: z.string(),
  title: z.string().optional(),
  colorScheme: z.string().optional(),
  colors: z
    .object({
      primary: z.string().optional(),
      secondary: z.string().optional(),
      accent: z.string().optional(),
      background: z.string().optional(),
      textPrimary: z.string().optional(),
      link: z.string().optional(),
    })
    .optional(),
  fonts: z.array(z.string()).optional(),
  primaryHeadingFont: z.string().optional(),
  primaryBodyFont: z.string().optional(),
  fontSizes: z.record(z.string(), z.string()).optional(),
  spacingBaseUnit: z.union([z.number(), z.string()]).optional(),
  borderRadius: z.union([z.number(), z.string()]).optional(),
  framework: z.string().optional(),
  componentLibrary: z.string().optional(),
  tone: z.string().optional(),
  energy: z.string().optional(),
  targetAudience: z.string().optional(),
  confidence: z.number().optional(),
});

export type DesignTokens = z.infer<typeof DesignTokensSchema>;

// ---------------------------------------------------------------------------
// Color normalization helper — strip alpha, validate hex
// ---------------------------------------------------------------------------

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export function normalizeHex(input: unknown): string | undefined {
  if (typeof input !== "string") return undefined;
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  if (HEX_RE.test(trimmed)) return trimmed.toLowerCase().slice(0, 7);
  // rgb()/rgba() → hex
  const m = trimmed.match(/rgba?\(([^)]+)\)/i);
  if (m) {
    const parts = m[1].split(",").map((p) => parseFloat(p));
    const [r, g, b] = parts;
    if ([r, g, b].every((n) => Number.isFinite(n))) {
      return (
        "#" +
        [r, g, b]
          .map((n) =>
            Math.max(0, Math.min(255, Math.round(n)))
              .toString(16)
              .padStart(2, "0")
          )
          .join("")
      );
    }
  }
  return undefined;
}

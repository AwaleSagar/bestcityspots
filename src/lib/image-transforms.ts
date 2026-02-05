/**
 * Image Transformation Utilities
 *
 * Provides quality presets and responsive sizing helpers.
 * Relies on Next.js Image optimization for format conversion and resizing.
 */

// Quality presets based on network conditions
export const QUALITY_PRESETS = {
  high: 85,
  medium: 70,
  low: 50,
} as const;

export type QualityTier = keyof typeof QUALITY_PRESETS;

/**
 * Generate sizes attribute for responsive images
 * Used by Next.js Image for srcset generation
 */
export function generateSizes(maxWidth: number = 800): string {
  return `(max-width: 640px) 100vw, (max-width: 1024px) 50vw, ${maxWidth}px`;
}

/**
 * Get quality value from network tier
 * Maps network quality tier to Next.js Image quality prop
 */
export function getQualityValue(quality: QualityTier): number {
  return QUALITY_PRESETS[quality];
}

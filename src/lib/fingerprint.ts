/**
 * City Fingerprints (UI innovation proposal, Idea 2).
 *
 * A deterministic, generative contour glyph per city — concentric organic
 * rings in the brand palette, seeded from stable city attributes so the same
 * city always draws the same mark, on the server or the client, forever.
 *
 * v1 is an *identity* mark (identicon-style): rings derive from id/geo/
 * population only, so list surfaces (which don't carry the metrics vector)
 * render the same mark as the city page.
 *
 * v2 (redesign 2026 H2, S4 polish): when metrics are supplied (city page
 * only), they subtly modulate ring amplitude and stroke — clean-air cities
 * read smoother, safe cities read slightly more confident. The modulation is
 * capped at ±25% so identity stays stable and recognizable. Colors are CSS
 * custom properties so glyphs adapt to theme.
 */

export interface FingerprintMetrics {
  pollution_pm25?: number | null;
  safety_score?: number | null;
  cost_index?: number | null;
  connectivity_mbps?: number | null;
}

export interface FingerprintSeed {
  id: string | number;
  lat?: number | null;
  lng?: number | null;
  population?: number | null;
  /** v2: optional metrics that subtly modulate ring shape (city page only). */
  metrics?: FingerprintMetrics | null;
}

export interface FingerprintRing {
  /** Closed SVG path in a 64×64 viewBox. */
  d: string;
  /** CSS color expression (custom-property reference). */
  color: string;
  strokeWidth: number;
}

export interface Fingerprint {
  rings: FingerprintRing[];
  /** Center dot color (same palette rotation). */
  coreColor: string;
}

/** Palette rotation — token refs, never raw hexes, so themes restyle glyphs. */
const RING_COLORS = [
  "var(--color-accent)",
  "var(--color-water)",
  "var(--color-leaf)",
  "var(--color-brand-accent)",
  "var(--color-muted)",
] as const;

/** FNV-1a 32-bit — tiny, stable string hash. */
function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Mulberry32 — deterministic PRNG from a 32-bit seed. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedString(seed: FingerprintSeed): string {
  const geo =
    seed.lat != null && seed.lng != null ? `${seed.lat.toFixed(2)},${seed.lng.toFixed(2)}` : "";
  return `bcs:${seed.id}:${geo}`;
}

/** Population buckets → ring count: hamlets read simpler than megacities. */
function ringCount(population: number | null | undefined): number {
  if (population == null || !Number.isFinite(population)) return 4;
  if (population >= 5_000_000) return 6;
  if (population >= 500_000) return 5;
  return 4;
}

/**
 * One organic ring: a radius modulated by two sine harmonics, sampled and
 * joined with a smooth closed midpoint-quadratic path.
 */
function ringPath(
  random: () => number,
  baseRadius: number,
  cx: number,
  cy: number,
  amplitudeScale = 1
): string {
  const harmonicA = 2 + Math.floor(random() * 3); // 2–4 lobes
  const harmonicB = 5 + Math.floor(random() * 3); // 5–7 ripples
  // v2: amplitude scales with metrics (clean air → smooth, polluted → textured).
  const amplitudeA = (0.05 + random() * 0.07) * amplitudeScale;
  const amplitudeB = (0.02 + random() * 0.03) * amplitudeScale;
  const phaseA = random() * Math.PI * 2;
  const phaseB = random() * Math.PI * 2;

  const steps = 36;
  const points: Array<[number, number]> = [];
  for (let i = 0; i < steps; i += 1) {
    const theta = (i / steps) * Math.PI * 2;
    const radius =
      baseRadius *
      (1 +
        amplitudeA * Math.sin(harmonicA * theta + phaseA) +
        amplitudeB * Math.sin(harmonicB * theta + phaseB));
    points.push([cx + radius * Math.cos(theta), cy + radius * Math.sin(theta)]);
  }

  // Smooth closed curve through midpoints (quadratic segments): start at
  // mid(p0,p1), then for each vertex curve through it to the next midpoint,
  // wrapping past p0 back to the start.
  const mid = (a: [number, number], b: [number, number]): [number, number] => [
    (a[0] + b[0]) / 2,
    (a[1] + b[1]) / 2,
  ];
  const point = (i: number): [number, number] => points.at(i % steps) as [number, number];

  const start = mid(point(0), point(1));
  let d = `M ${start[0].toFixed(2)} ${start[1].toFixed(2)}`;
  for (let i = 1; i <= steps; i += 1) {
    const vertex = point(i);
    const nextMid = mid(vertex, point(i + 1));
    d += ` Q ${vertex[0].toFixed(2)} ${vertex[1].toFixed(2)} ${nextMid[0].toFixed(2)} ${nextMid[1].toFixed(2)}`;
  }
  return `${d} Z`;
}

export function getCityFingerprint(seed: FingerprintSeed): Fingerprint {
  const random = mulberry32(fnv1a(seedString(seed)));
  const count = ringCount(seed.population);
  const colorOffset = Math.floor(random() * RING_COLORS.length);

  // v2: metric modulation — subtle (±25%), identity-preserving.
  // Clean air (low pm25) → smoother rings; polluted → slightly more textured.
  const pm = seed.metrics?.pollution_pm25;
  const amplitudeScale =
    pm != null && Number.isFinite(pm) ? 1 + Math.max(0, Math.min(0.25, (pm - 10) / 140)) : 1;
  // Safe cities read slightly more confident (bolder stroke).
  const safety = seed.metrics?.safety_score;
  const strokeScale =
    safety != null && Number.isFinite(safety)
      ? 0.9 + Math.max(0, Math.min(0.25, (safety / 100) * 0.25))
      : 1;

  const cx = 32;
  const cy = 32;
  const outerRadius = 26;
  const innerRadius = 7;

  const rings: FingerprintRing[] = [];
  for (let i = 0; i < count; i += 1) {
    // Slightly uneven radial spacing keeps the contour-map feel.
    const t = count === 1 ? 0 : i / (count - 1);
    const jitter = (random() - 0.5) * 2.5;
    const baseRadius = innerRadius + (outerRadius - innerRadius) * t + jitter;
    const isOuter = i === count - 1;
    rings.push({
      d: ringPath(random, Math.max(4, baseRadius), cx, cy, amplitudeScale),
      color: RING_COLORS.at((colorOffset + i) % RING_COLORS.length) ?? RING_COLORS[0],
      strokeWidth: (isOuter ? 2 : 1.5) * strokeScale,
    });
  }

  return {
    rings,
    coreColor: RING_COLORS.at(colorOffset % RING_COLORS.length) ?? RING_COLORS[0],
  };
}

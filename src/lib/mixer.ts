/**
 * Priorities Mixer (UI innovation proposal, Idea 3).
 *
 * Personal, private city ranking: the visitor weights what matters (budget,
 * air, safety, connectivity) and the candidate set re-ranks entirely
 * client-side from the public `city_metrics` cache. Weights live in
 * localStorage — consistent with the "planning remains personal, no account
 * gate" principle. No provider spend: one batched cache read per page.
 *
 * This module is pure (no imports) so scripts/test-mixer.ts can run it
 * directly; the metrics fetch lives with the client component.
 */

export interface MixerWeights {
  cost: number;
  air: number;
  safety: number;
  connectivity: number;
}

export const DEFAULT_WEIGHTS: MixerWeights = { cost: 0, air: 0, safety: 0, connectivity: 0 };

export const WEIGHTS_STORAGE_KEY = "atlas_priority_weights";

export interface MixerMetricsRow {
  city_id: number;
  cost_index: number | null;
  pollution_pm25: number | null;
  safety_score: number | null;
  connectivity_mbps: number | null;
}

export interface RankedCity {
  city_id: number;
  /** 0–100 weighted score across the dimensions this city has data for. */
  score: number;
  /** How many of the active dimensions had data (honesty affordance). */
  coverage: number;
  activeDimensions: number;
}

interface Dimension {
  key: keyof MixerWeights;
  metric: keyof Omit<MixerMetricsRow, "city_id">;
  /** true when a *lower* raw value is better (cost, pollution). */
  invert: boolean;
}

const DIMENSIONS: Dimension[] = [
  { key: "cost", metric: "cost_index", invert: true },
  { key: "air", metric: "pollution_pm25", invert: true },
  { key: "safety", metric: "safety_score", invert: false },
  { key: "connectivity", metric: "connectivity_mbps", invert: false },
];

function readMetric(row: MixerMetricsRow, dimension: Dimension): number | null {
  switch (dimension.metric) {
    case "cost_index":
      return row.cost_index;
    case "pollution_pm25":
      return row.pollution_pm25;
    case "safety_score":
      return row.safety_score;
    case "connectivity_mbps":
      return row.connectivity_mbps;
  }
}

function readWeight(weights: MixerWeights, key: keyof MixerWeights): number {
  switch (key) {
    case "cost":
      return weights.cost;
    case "air":
      return weights.air;
    case "safety":
      return weights.safety;
    case "connectivity":
      return weights.connectivity;
  }
}

/**
 * Min–max normalize each active dimension across the candidate set, invert
 * where lower-is-better, then weight-average per city over the dimensions it
 * actually has (weights renormalized per city so missing data never silently
 * zeroes a score). Cities with no data on any active dimension are omitted.
 */
export function rankCities(rows: MixerMetricsRow[], weights: MixerWeights): RankedCity[] {
  const active = DIMENSIONS.filter((d) => readWeight(weights, d.key) > 0);
  if (active.length === 0 || rows.length === 0) return [];

  // Per-dimension min/max over cities that have the value.
  const bounds = active.map((dimension) => {
    let min = Infinity;
    let max = -Infinity;
    for (const row of rows) {
      const value = readMetric(row, dimension);
      if (value == null || !Number.isFinite(value)) continue;
      if (value < min) min = value;
      if (value > max) max = value;
    }
    return { dimension, min, max };
  });

  const ranked: RankedCity[] = [];
  for (const row of rows) {
    let weightSum = 0;
    let scoreSum = 0;
    let coverage = 0;
    for (const { dimension, min, max } of bounds) {
      const value = readMetric(row, dimension);
      if (value == null || !Number.isFinite(value) || min === Infinity) continue;
      const span = max - min;
      let normalized = span === 0 ? 0.5 : (value - min) / span;
      if (dimension.invert) normalized = 1 - normalized;
      const weight = readWeight(weights, dimension.key);
      weightSum += weight;
      scoreSum += normalized * weight;
      coverage += 1;
    }
    if (weightSum === 0) continue;
    ranked.push({
      city_id: row.city_id,
      score: Math.round((scoreSum / weightSum) * 100),
      coverage,
      activeDimensions: active.length,
    });
  }

  ranked.sort((a, b) => b.score - a.score || a.city_id - b.city_id);
  return ranked;
}

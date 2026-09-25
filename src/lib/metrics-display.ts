import type { CityMetrics } from "./metrics";

/**
 * US-03 (product audit AF-2): only metrics with real values may render.
 * Pure selection logic lives here so it is unit-testable and shared by the
 * city page and the future comparison view (US-07). When new data sources
 * land (e.g. cost of living via US-09), populating the field is enough —
 * the panel picks it up automatically.
 */

export type MetricKey =
  | "pollution_pm25"
  | "climate_comfort"
  | "cost_index"
  | "homicide_rate_per_100k"
  | "health_access_per_100k";

export interface DisplayMetric {
  key: MetricKey;
  label: string;
  value: string | number;
  unit?: string;
  source?: string;
}

interface MetricSpec {
  key: MetricKey;
  label: string;
  unit?: string;
  /** Key inside `CityMetrics.source` that names this metric's provenance. */
  sourceKey: string;
}

const METRIC_SPECS: readonly MetricSpec[] = [
  { key: "pollution_pm25", label: "Pollution (PM2.5)", unit: "µg/m³", sourceKey: "pollution" },
  { key: "climate_comfort", label: "Climate Comfort", sourceKey: "climate" },
  // Country-level World Bank indicators — the labels say so, and `source`
  // carries the year (docs/adr-003-reference-data-sources.md).
  { key: "cost_index", label: "Price level (country, US = 100)", sourceKey: "cost" },
  {
    key: "homicide_rate_per_100k",
    label: "Homicide rate (country)",
    unit: "per 100k",
    sourceKey: "safety",
  },
  {
    key: "health_access_per_100k",
    label: "Physicians (country)",
    unit: "per 100k",
    sourceKey: "health",
  },
];

function hasValue(value: unknown): value is string | number {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  return false;
}

/** Returns only the metrics that hold a real value, in display order. */
export function selectAvailableMetrics(metrics: CityMetrics | null): DisplayMetric[] {
  if (!metrics) return [];
  const sources = (metrics.source ?? {}) as Record<string, unknown>;

  return METRIC_SPECS.flatMap((spec) => {
    const raw = metrics[spec.key];
    if (!hasValue(raw)) return [];
    const source = sources[spec.sourceKey];
    return [
      {
        key: spec.key,
        label: spec.label,
        value: raw,
        unit: spec.unit,
        source: typeof source === "string" ? source : undefined,
      },
    ];
  });
}

/**
 * The panel renders only when it earns its space: with fewer than two real
 * metrics, the live weather/AQI vitals alone tell the story (US-03 AC).
 */
export const METRICS_PANEL_MINIMUM = 2;

export function shouldRenderMetricsPanel(rows: readonly DisplayMetric[]): boolean {
  return rows.length >= METRICS_PANEL_MINIMUM;
}

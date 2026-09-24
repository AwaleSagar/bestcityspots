import type { CityMetrics } from "@/lib/metrics";
import { selectAvailableMetrics, shouldRenderMetricsPanel } from "@/lib/metrics-display";
import { SpecList } from "@/components/ui/SpecList";

function formatValue(value: string | number, unit?: string) {
  const text = typeof value === "number" ? value.toLocaleString("en-US") : value;
  return unit ? `${text} ${unit}` : text;
}

/**
 * "Key numbers" spec sheet. US-03: only metrics with real values render, and
 * fewer than two means the block is omitted entirely.
 */
export function MetricsSpec({ metrics }: { metrics: CityMetrics | null }) {
  const rows = selectAvailableMetrics(metrics);
  if (!shouldRenderMetricsPanel(rows)) return null;
  const verified = metrics?.updated_at
    ? new Date(metrics.updated_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      })
    : null;
  return (
    <div>
      <SpecList
        rows={rows.map((row) => ({
          key: row.key,
          label: row.label,
          value: formatValue(row.value, row.unit),
          note: row.source ? `Source: ${row.source}` : undefined,
        }))}
      />
      {verified ? <p className="text-ink-muted mt-3 text-xs">Last verified {verified}</p> : null}
    </div>
  );
}

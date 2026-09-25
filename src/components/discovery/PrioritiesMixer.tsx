"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import type { City } from "@/lib/cities";
import {
  DEFAULT_WEIGHTS,
  rankCities,
  WEIGHTS_STORAGE_KEY,
  type MixerMetricsRow,
  type MixerWeights,
} from "@/lib/mixer";
import { useStoredValue } from "@/hooks/useStoredValue";
import { Button } from "@/components/ui/Button";
import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";
import { CityRow } from "@/components/city/CityRow";

export type MixerCity = Pick<City, "id" | "slug" | "city" | "admin_name" | "country">;

const SLIDERS: ReadonlyArray<{ key: keyof MixerWeights; label: string; hint: string }> = [
  { key: "cost", label: "Budget", hint: "Lower national price level ranks higher" },
  { key: "air", label: "Air quality", hint: "Lower PM2.5 ranks higher" },
  { key: "safety", label: "Safety", hint: "Lower national homicide rate ranks higher" },
];

function clamp(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(100, Math.max(0, Math.round(value)))
    : 0;
}

function parseWeights(raw: string | null): MixerWeights {
  if (!raw) return DEFAULT_WEIGHTS;
  try {
    const parsed = JSON.parse(raw) as Partial<Record<keyof MixerWeights, unknown>>;
    return {
      cost: clamp(parsed.cost),
      air: clamp(parsed.air),
      safety: clamp(parsed.safety),
    };
  } catch {
    return DEFAULT_WEIGHTS;
  }
}

function weightOf(weights: MixerWeights, key: keyof MixerWeights): number {
  switch (key) {
    case "cost":
      return weights.cost;
    case "air":
      return weights.air;
    case "safety":
      return weights.safety;
  }
}

/** Public `city_metrics` view read for the candidate set (RLS: public SELECT). */
async function fetchMetrics(cityIds: number[]): Promise<MixerMetricsRow[]> {
  if (cityIds.length === 0) return [];
  try {
    // Lazy: the Supabase client only loads once a slider is moved.
    const { supabase } = await import("@/lib/supabase");
    const { data, error } = await supabase
      .from("city_metrics")
      .select("city_id, cost_index, pollution_pm25, homicide_rate_per_100k")
      .in("city_id", cityIds);
    if (error || !data) return [];
    return data.flatMap((row) => (row.city_id === null ? [] : [{ ...row, city_id: row.city_id }]));
  } catch {
    return [];
  }
}

/**
 * Personal re-ranking of the Top 250 from three weights. Computed in the
 * browser from the public metrics cache; weights persist in localStorage
 * and never leave the device. Metrics load only once a weight is set.
 */
export function PrioritiesMixer({ cities }: { cities: readonly MixerCity[] }) {
  const baseId = useId();
  const [weights, setWeights] = useStoredValue(WEIGHTS_STORAGE_KEY, parseWeights, DEFAULT_WEIGHTS);
  const [metrics, setMetrics] = useState<MixerMetricsRow[] | null>(null);
  const requested = useRef(false);
  const isActive = SLIDERS.some(({ key }) => weightOf(weights, key) > 0);

  useEffect(() => {
    if (!isActive || requested.current) return;
    requested.current = true;
    void fetchMetrics(cities.map((city) => city.id)).then(setMetrics);
  }, [isActive, cities]);

  const byId = useMemo(() => new Map(cities.map((city) => [city.id, city])), [cities]);
  const ranked = useMemo(
    () => (isActive && metrics ? rankCities(metrics, weights).slice(0, 10) : []),
    [isActive, metrics, weights]
  );
  const scored = metrics ? new Set(metrics.map((row) => row.city_id)).size : 0;

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-16">
      <div>
        <div className="space-y-6">
          {SLIDERS.map(({ key, label, hint }) => {
            const value = weightOf(weights, key);
            const id = `${baseId}-${key}`;
            return (
              <div key={key}>
                <div className="flex items-baseline justify-between gap-3">
                  <label htmlFor={id} className="font-medium">
                    {label}
                  </label>
                  <output htmlFor={id} className="text-ink-muted text-sm tabular-nums">
                    {value === 0 ? "Off" : `${value}%`}
                  </output>
                </div>
                <input
                  id={id}
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={value}
                  aria-describedby={`${id}-hint`}
                  onChange={(event) =>
                    setWeights((previous) => ({ ...previous, [key]: Number(event.target.value) }))
                  }
                  className="accent-accent mt-2 h-6 w-full cursor-pointer"
                />
                <p id={`${id}-hint`} className="text-ink-muted text-xs">
                  {hint}
                </p>
              </div>
            );
          })}
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="mt-6"
          disabled={!isActive}
          onClick={() => setWeights(DEFAULT_WEIGHTS)}
        >
          <RotateCcw aria-hidden />
          Reset priorities
        </Button>
      </div>

      <div aria-live="polite">
        {!isActive ? (
          <div className="border-rule-strong text-ink-muted rounded-md border border-dashed p-6 text-sm">
            Move any slider to re-rank the Top 250 by what matters to you. Weights are saved in this
            browser only.
          </div>
        ) : metrics === null ? (
          <LoadingRegion label="Scoring cities" className="space-y-2">
            {[0, 1, 2, 3].map((key) => (
              <Skeleton key={key} className="h-14 w-full" />
            ))}
          </LoadingRegion>
        ) : ranked.length === 0 ? (
          <div className="border-rule-strong text-ink-muted rounded-md border border-dashed p-6 text-sm">
            No cities have data for the priorities you picked yet. Try a different mix.
          </div>
        ) : (
          <>
            <h3 className="font-sans text-base font-semibold">Your top 10</h3>
            <ol className="border-rule mt-2 border-t">
              {ranked.map((entry, index) => {
                const city = byId.get(entry.city_id);
                if (!city) return null;
                return (
                  <CityRow
                    key={entry.city_id}
                    city={city}
                    rank={index + 1}
                    meta={
                      <span className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className="bg-sunken hidden h-1.5 w-20 overflow-hidden rounded-full sm:block"
                        >
                          <span
                            className="bg-accent block h-full rounded-full"
                            style={{ width: `${entry.score}%` }}
                          />
                        </span>
                        <span className="text-ink-muted w-14 text-right tabular-nums">
                          {Math.round(entry.score)}
                          <span className="sr-only"> out of 100</span>
                          {entry.coverage < entry.activeDimensions ? (
                            <span title="Some of your priorities have no data for this city">
                              *
                            </span>
                          ) : null}
                        </span>
                      </span>
                    }
                  />
                );
              })}
            </ol>
            <p className="text-ink-muted mt-3 text-xs">
              Scored across {scored} of {cities.length} cities with metrics. * = partial data.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

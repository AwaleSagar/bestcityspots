"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, RotateCcw, SlidersHorizontal } from "lucide-react";
import { cityHref } from "@/lib/cities";
import { supabase } from "@/lib/supabase";
import {
  DEFAULT_WEIGHTS,
  WEIGHTS_STORAGE_KEY,
  rankCities,
  type MixerMetricsRow,
  type MixerWeights,
} from "@/lib/mixer";
import { getJsonStorageItem, setJsonStorageItem } from "@/lib/storage";
import CityFingerprint from "@/components/ui/CityFingerprint";

export interface MixerCity {
  id: number;
  city: string;
  country: string;
  slug?: string;
  lat: number;
  lng: number;
  population: number;
}

interface PrioritiesMixerProps {
  cities: MixerCity[];
}

/** Batched public cache read for the candidate set (RLS: public SELECT). */
async function fetchMixerMetrics(cityIds: number[]): Promise<MixerMetricsRow[]> {
  if (cityIds.length === 0) return [];
  try {
    const { data, error } = await supabase
      .from("city_metrics")
      .select("city_id, cost_index, pollution_pm25, safety_score, connectivity_mbps")
      .in("city_id", cityIds);
    if (error || !data) return [];
    return data as MixerMetricsRow[];
  } catch {
    return [];
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
    case "connectivity":
      return weights.connectivity;
  }
}

const SLIDERS: Array<{ key: keyof MixerWeights; label: string; hint: string }> = [
  { key: "cost", label: "Budget", hint: "lower cost of living ranks higher" },
  { key: "air", label: "Air quality", hint: "lower PM2.5 ranks higher" },
  { key: "safety", label: "Safety", hint: "higher safety score ranks higher" },
  { key: "connectivity", label: "Connectivity", hint: "faster internet ranks higher" },
];

function sanitizeWeights(value: unknown): MixerWeights {
  const raw = (value ?? {}) as Partial<Record<keyof MixerWeights, unknown>>;
  const clamp = (n: unknown) =>
    typeof n === "number" && Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : 0;
  return {
    cost: clamp(raw.cost),
    air: clamp(raw.air),
    safety: clamp(raw.safety),
    connectivity: clamp(raw.connectivity),
  };
}

/**
 * Priorities Mixer (proposal Idea 3): personal weights → private re-ranking
 * of the candidate cities, computed client-side from the public metrics
 * cache. Weights persist in localStorage; nothing leaves the device.
 */
export default function PrioritiesMixer({ cities }: PrioritiesMixerProps) {
  const [weights, setWeights] = useState<MixerWeights>(DEFAULT_WEIGHTS);
  const [metrics, setMetrics] = useState<MixerMetricsRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const hydrated = useRef(false);

  // Restore persisted weights after mount (SSR-safe); deferred per the
  // codebase's React Compiler convention (no sync setState in effects).
  useEffect(() => {
    const saved = sanitizeWeights(getJsonStorageItem(WEIGHTS_STORAGE_KEY, DEFAULT_WEIGHTS));
    queueMicrotask(() => {
      setWeights(saved);
      hydrated.current = true;
    });
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    setJsonStorageItem(WEIGHTS_STORAGE_KEY, weights);
  }, [weights]);

  const isActive = Object.values(weights).some((w) => w > 0);

  // Lazy metrics load on first activation — zero cost for passive readers.
  useEffect(() => {
    if (!isActive || metrics !== null || loading) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setLoading(true);
    });
    fetchMixerMetrics(cities.map((c) => c.id)).then((rows) => {
      if (cancelled) return;
      setMetrics(rows);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [isActive, metrics, loading, cities]);

  const ranked = useMemo(() => {
    if (!isActive || !metrics) return [];
    return rankCities(metrics, weights).slice(0, 10);
  }, [isActive, metrics, weights]);

  const cityById = useMemo(() => new Map(cities.map((c) => [c.id, c])), [cities]);
  const coveredCount = useMemo(
    () => (metrics ? rankCities(metrics, weights).length : 0),
    [metrics, weights]
  );

  return (
    <section
      aria-labelledby="priorities-mixer-heading"
      className="atlas-panel mt-12 rounded-2xl p-6 sm:rounded-3xl md:p-10"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2
          id="priorities-mixer-heading"
          className="flex items-center gap-3 text-xl font-bold tracking-tight md:text-2xl"
        >
          <SlidersHorizontal className="text-accent h-5 w-5" aria-hidden />
          Your priorities, your atlas
        </h2>
        {isActive && (
          <button
            type="button"
            onClick={() => setWeights(DEFAULT_WEIGHTS)}
            className="text-muted hover:text-foreground inline-flex min-h-[var(--touch-target-min)] items-center gap-2 text-xs font-semibold tracking-[0.14em] uppercase transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Reset
          </button>
        )}
      </div>
      <p className="text-muted mt-2 max-w-2xl text-sm leading-relaxed">
        Slide what matters to you and The Global 50 re-ranks privately on your device — weights
        never leave this browser.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {SLIDERS.map(({ key, label, hint }) => (
          <div key={key}>
            <div className="flex items-baseline justify-between">
              <label htmlFor={`mixer-${key}`} className="text-sm font-semibold">
                {label}
              </label>
              <span className="text-muted text-xs tabular-nums" aria-hidden>
                {weightOf(weights, key)}
              </span>
            </div>
            <input
              id={`mixer-${key}`}
              type="range"
              min={0}
              max={100}
              step={5}
              value={weightOf(weights, key)}
              onChange={(event) =>
                setWeights((prev) => ({ ...prev, [key]: Number(event.target.value) }))
              }
              aria-describedby={`mixer-${key}-hint`}
              className="mixer-slider mt-2 w-full"
            />
            <p id={`mixer-${key}-hint`} className="text-muted mt-1 text-xs">
              {hint}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8" aria-live="polite">
        {!isActive ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center sm:flex-row sm:text-left">
            <Image
              src="/illustrations/mixer-balance.svg"
              alt=""
              width={160}
              height={120}
              className="mixer-empty-art h-28 w-auto"
            />
            <p className="text-muted max-w-sm text-sm leading-relaxed">
              All weights are at zero, so the editorial ranking below stands untouched. Raise a
              slider to see your personal order.
            </p>
          </div>
        ) : loading || metrics === null ? (
          <p className="text-muted text-sm">Reading the metrics cache…</p>
        ) : ranked.length === 0 ? (
          <p className="text-muted text-sm">
            None of these cities have cached data for the dimensions you picked yet.
          </p>
        ) : (
          <>
            <ol className="divide-line border-line divide-y rounded-xl border">
              {ranked.map((entry, index) => {
                const city = cityById.get(entry.city_id);
                if (!city) return null;
                return (
                  <li key={entry.city_id}>
                    <Link
                      href={cityHref(city, { lat: city.lat, lng: city.lng })}
                      className="hover:bg-surface/72 group flex items-center gap-4 px-4 py-3 transition-colors"
                    >
                      <span className="text-muted w-6 shrink-0 text-sm font-bold tabular-nums">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <CityFingerprint
                        city={{
                          id: city.id,
                          lat: city.lat,
                          lng: city.lng,
                          population: city.population,
                        }}
                        className="h-8 w-8 shrink-0"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{city.city}</span>
                        <span className="text-muted block truncate text-xs">{city.country}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-3">
                        <span
                          className="bg-accent-soft relative h-1.5 w-20 overflow-hidden rounded-full"
                          aria-hidden
                        >
                          <span
                            className="bg-accent absolute inset-y-0 left-0 rounded-full"
                            style={{ width: `${entry.score}%` }}
                          />
                        </span>
                        <span className="text-muted-strong w-8 text-right text-sm font-bold tabular-nums">
                          {entry.score}
                        </span>
                        <ArrowRight
                          className="text-muted group-hover:text-accent h-4 w-4 transition-colors"
                          aria-hidden
                        />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
            <p className="text-muted mt-3 text-xs">
              Scored across {coveredCount} of {cities.length} cities with cached data for your
              chosen dimensions. Sources stay visible on each city page.
            </p>
          </>
        )}
      </div>
    </section>
  );
}

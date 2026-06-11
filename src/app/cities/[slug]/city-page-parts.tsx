import type { ComponentType } from "react";

export function CityVitalsFallback() {
  return (
    <div className="atlas-panel rounded-3xl p-7 md:p-8">
      <div className="text-muted text-xs font-semibold tracking-[0.2em] uppercase">
        Live City Vitals
      </div>
      <p className="text-muted mt-4 text-sm">
        Vitals unavailable right now. Please check back soon.
      </p>
    </div>
  );
}

// US-03 (audit AF-2): `value` is required and non-null — callers must filter
// with selectAvailableMetrics() first. The old "N/A / Pending Discovery"
// placeholder path is intentionally gone: hollow metrics erode trust.
export function MetricCard({
  label,
  value,
  unit,
  icon: Icon,
  source,
}: {
  label: string;
  value: string | number;
  unit?: string;
  icon: ComponentType<{ className?: string }>;
  source?: string;
}) {
  const display = (
    <div className="flex flex-col items-start leading-tight">
      <span className="text-foreground text-2xl font-bold tracking-tight">
        {typeof value === "number" ? value.toLocaleString() : value}
      </span>
      {unit && (
        <span className="text-foreground/45 text-xs font-semibold tracking-[0.15em] uppercase">
          {unit}
        </span>
      )}
    </div>
  );

  return (
    <div className="atlas-panel group/metric md:hover:border-accent/14 flex flex-col gap-3 rounded-lg p-4 transition-all duration-300 active:scale-[0.98] sm:gap-4 sm:rounded-xl sm:p-5 md:duration-500">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="border-line bg-background/55 md:group-hover/metric:border-accent/20 md:group-hover/metric:bg-accent-soft/60 flex h-10 w-10 items-center justify-center rounded-md border transition-all duration-300">
            <Icon className="text-accent h-5 w-5 transition-colors duration-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <div className="text-muted text-xs font-semibold tracking-[0.15em] uppercase">
                {label}
              </div>
            </div>
            {display}
          </div>
        </div>
      </div>
      <div className="border-line flex items-center justify-between border-t pt-3">
        <div className="text-muted text-xs font-semibold tracking-[0.15em] uppercase">
          Data Source
        </div>
        <div className="text-muted-strong max-w-[120px] text-right text-xs leading-relaxed font-semibold tracking-[0.1em] uppercase">
          {source || "Live data"}
        </div>
      </div>
    </div>
  );
}

export function getArrivalMood(temp?: number) {
  if (typeof temp !== "number") {
    return "A practical first read before you compare neighborhoods, seasons, and places.";
  }
  if (temp <= 8)
    return "Cold-weather pacing: plan warm interiors, museums, and shorter outdoor loops.";
  if (temp <= 18)
    return "Comfortable walking weather: a good day for slow neighborhoods and long routes.";
  if (temp <= 28)
    return "Balanced conditions: keep outdoor landmarks, dining, and transit options in play.";
  return "Heat-aware planning: favor shaded routes, early starts, and indoor pauses.";
}

export function CityVitalsSkeleton() {
  return (
    <div className="atlas-panel animate-pulse rounded-3xl p-7 md:p-8">
      <div className="bg-foreground/10 h-2 w-32 rounded" />
      <div className="bg-foreground/10 mt-4 h-6 w-24 rounded" />
      <div className="bg-foreground/10 mt-6 h-10 w-full rounded" />
    </div>
  );
}

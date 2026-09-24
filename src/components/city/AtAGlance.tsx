import type { WeatherData } from "@/lib/weather";
import { aqiInfo, formatTemperature } from "@/lib/city-display";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";
import { AqiBadge } from "./AqiBadge";

/** Three live facts under the city title; details live in the Conditions section. */
export function AtAGlance({ weather }: { weather: WeatherData | null }) {
  if (!weather) {
    return (
      <p className="text-ink-muted text-sm">
        Live conditions are unavailable right now — seasons and places below still apply.
      </p>
    );
  }
  const aqi = aqiInfo(weather.aqi, weather.aqi_label);
  return (
    <div>
      <dl className="divide-rule border-rule bg-surface grid grid-cols-3 divide-x rounded-md border">
        <div className="px-3 py-3 sm:px-4">
          <dt className="text-ink-muted text-xs">Now</dt>
          <dd className="mt-0.5 text-lg font-medium tabular-nums">
            {formatTemperature(weather.temp) ?? "—"}
          </dd>
        </div>
        <div className="min-w-0 px-3 py-3 sm:px-4">
          <dt className="text-ink-muted text-xs">Sky</dt>
          <dd className="mt-0.5 text-base leading-snug font-medium first-letter:uppercase sm:text-lg">
            {weather.description}
          </dd>
        </div>
        <div className="px-3 py-3 sm:px-4">
          <dt className="text-ink-muted text-xs">Air</dt>
          <dd className="mt-0.5 text-lg font-medium">
            <AqiBadge aqi={weather.aqi} label={aqi.label} />
          </dd>
        </div>
      </dl>
      <p className="text-ink-muted mt-2 text-xs">
        <RelativeTime iso={weather.updated_at} prefix="Updated" /> ·{" "}
        <a href="#conditions" className="hover:text-ink underline underline-offset-2">
          Full conditions
        </a>
      </p>
    </div>
  );
}

export function AtAGlanceSkeleton() {
  return (
    <LoadingRegion label="Loading current conditions">
      <Skeleton className="h-18 w-full rounded-md" />
      <Skeleton className="mt-2 h-3 w-40" />
    </LoadingRegion>
  );
}

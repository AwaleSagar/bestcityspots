import type { WeatherData } from "@/lib/weather";
import { AQI_LABELS, aqiInfo, formatTemperature } from "@/lib/city-display";
import { cn } from "@/components/ui/cn";
import { Notice } from "@/components/ui/Notice";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";
import { SpecList } from "@/components/ui/SpecList";
import { aqiSwatchClass } from "./AqiBadge";

function capitalize(text: string) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

export function ConditionsUnavailable({ cityName }: { cityName: string }) {
  return (
    <Notice title="Live conditions aren't available right now.">
      We couldn&apos;t reach the weather services for {cityName}. Seasons and places below are
      unaffected.
    </Notice>
  );
}

/** Full live-conditions breakdown: temperature, comfort, wind and the AQI scale. */
export function ConditionsPanel({ weather }: { weather: WeatherData }) {
  const aqi = aqiInfo(weather.aqi, weather.aqi_label);
  const temp = formatTemperature(weather.temp);
  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div>
        <p className="font-display text-6xl leading-none tabular-nums">{temp ?? "—"}</p>
        <p className="mt-2 text-lg">{capitalize(weather.description)}</p>
        <SpecList
          className="border-rule mt-4 border-t"
          rows={[
            {
              key: "feels",
              label: "Feels like",
              value: formatTemperature(weather.feels_like) ?? "—",
            },
            {
              key: "range",
              label: "Today's range",
              value: `${formatTemperature(weather.temp_min) ?? "—"} – ${formatTemperature(weather.temp_max) ?? "—"}`,
            },
            { key: "humidity", label: "Humidity", value: `${Math.round(weather.humidity)}%` },
            { key: "wind", label: "Wind", value: `${Math.round(weather.wind_speed)} km/h` },
          ]}
        />
      </div>

      <div>
        <h3 className="text-ink-muted text-sm font-medium">Air quality</h3>
        <p className="font-display mt-1 text-3xl">{aqi.label}</p>
        <ol aria-label="Air quality scale" className="mt-4 grid grid-cols-5 gap-1">
          {AQI_LABELS.map((label, index) => {
            const level = index + 1;
            const current = aqi.level === level;
            return (
              <li key={label} aria-current={current ? "true" : undefined} className="min-w-0">
                <span
                  aria-hidden
                  className={cn(
                    "block h-2 rounded-full",
                    aqiSwatchClass(level),
                    current ? "outline-ink outline-2 outline-offset-2" : "opacity-45"
                  )}
                />
                <span
                  className={cn(
                    "mt-2 block truncate text-center text-xs",
                    current ? "text-ink font-semibold" : "text-ink-muted"
                  )}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="text-ink-muted mt-4 text-sm">{aqi.advice}</p>
      </div>

      <p className="text-ink-muted text-xs md:col-span-2">
        Source: OpenWeather (Open-Meteo fallback) ·{" "}
        <RelativeTime iso={weather.updated_at} prefix="Updated" />
      </p>
    </div>
  );
}

export function ConditionsSkeleton() {
  return (
    <LoadingRegion label="Loading live conditions" className="grid gap-8 md:grid-cols-2">
      <div className="space-y-3">
        <Skeleton className="h-14 w-32" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-32 w-full" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-5 w-3/4" />
      </div>
    </LoadingRegion>
  );
}

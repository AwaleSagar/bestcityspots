import { WeatherData } from "@/lib/weather";
import { Wind, Droplets, Gauge, Thermometer } from "lucide-react";
import { Card, Caption, Mono, Row, Stack, cx } from "@/components/atlas";

interface CityVitalsProps {
  data: WeatherData;
}

function aqiColor(aqi: number): string {
  // single-hue ramp, no season/brand palette
  if (aqi <= 1) return "text-emerald-700 dark:text-emerald-400";
  if (aqi === 2) return "text-lime-700 dark:text-lime-400";
  if (aqi === 3) return "text-amber-700 dark:text-amber-400";
  if (aqi === 4) return "text-orange-700 dark:text-orange-400";
  return "text-red-700 dark:text-red-400";
}

export default function CityVitals({ data }: CityVitalsProps) {
  return (
    <Card className="p-5 sm:p-6">
      <Row justify="between" align="baseline" className="mb-5">
        <Caption>Live city vitals</Caption>
        <span className="text-[0.7rem] text-[color:var(--color-muted-soft)]">
          Updated{" "}
          {new Date(data.updated_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </Row>

      <div className="grid grid-cols-2 gap-4">
        <Stack gap={1}>
          <Row gap={2} className="text-[color:var(--color-muted)]">
            <Thermometer className="h-3.5 w-3.5" aria-hidden />
            <span className="text-[0.7rem] font-semibold uppercase tracking-wider">
              Temperature
            </span>
          </Row>
          <div className="flex items-baseline gap-1">
            <Mono size="lg" className="font-semibold text-[color:var(--color-foreground)]">
              {Math.round(data.temp)}°
            </Mono>
            <span className="text-sm text-[color:var(--color-muted)]">C</span>
          </div>
          <p className="text-xs text-[color:var(--color-muted)]">
            Feels like {Math.round(data.feels_like)}°
          </p>
        </Stack>

        <Stack gap={1}>
          <Row gap={2} className="text-[color:var(--color-muted)]">
            <Gauge className="h-3.5 w-3.5" aria-hidden />
            <span className="text-[0.7rem] font-semibold uppercase tracking-wider">
              Air quality
            </span>
          </Row>
          <span
            className={cx(
              "inline-flex w-fit items-center rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface-muted)] px-2.5 py-0.5 text-xs font-semibold",
              aqiColor(data.aqi),
            )}
          >
            {data.aqi_label}
          </span>
          <p className="text-xs text-[color:var(--color-muted)]">
            Index {data.aqi}/5
          </p>
        </Stack>
      </div>

      <Row
        gap={6}
        className="mt-5 border-t border-[color:var(--color-line)] pt-4 text-[color:var(--color-muted)]"
      >
        <Row gap={2}>
          <Droplets className="h-3.5 w-3.5" aria-hidden />
          <div>
            <span className="block text-[0.65rem] font-semibold uppercase tracking-wider">
              Humidity
            </span>
            <Mono size="sm" className="text-[color:var(--color-foreground)]">
              {data.humidity}%
            </Mono>
          </div>
        </Row>
        <Row gap={2}>
          <Wind className="h-3.5 w-3.5" aria-hidden />
          <div>
            <span className="block text-[0.65rem] font-semibold uppercase tracking-wider">
              Wind
            </span>
            <Mono size="sm" className="text-[color:var(--color-foreground)]">
              {Math.round(data.wind_speed)} km/h
            </Mono>
          </div>
        </Row>
      </Row>
    </Card>
  );
}

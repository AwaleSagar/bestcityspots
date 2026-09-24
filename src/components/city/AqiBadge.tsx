import { aqiInfo } from "@/lib/city-display";
import { cn } from "@/components/ui/cn";

const SWATCH = ["bg-aqi-1", "bg-aqi-2", "bg-aqi-3", "bg-aqi-4", "bg-aqi-5"] as const;

export function aqiSwatchClass(level: number | null): string {
  return level ? (SWATCH.at(level - 1) ?? "bg-rule-strong") : "bg-rule-strong";
}

/** Colored dot + text label (color is never the only signal). */
export function AqiBadge({
  aqi,
  label,
  className,
}: {
  aqi: number | null | undefined;
  label?: string;
  className?: string;
}) {
  const info = aqiInfo(aqi, label);
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap", className)}>
      <span aria-hidden className={cn("size-2.5 rounded-full", aqiSwatchClass(info.level))} />
      <span>
        <span className="sr-only">Air quality: </span>
        {info.label}
      </span>
    </span>
  );
}

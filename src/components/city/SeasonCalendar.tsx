import Link from "next/link";
import { seasonForMonth, type Season } from "@/lib/city-display";
import { cn } from "@/components/ui/cn";
import { seasonFillClass, seasonLabel } from "./season-classes";

const MONTHS = [
  ["january", "Jan"],
  ["february", "Feb"],
  ["march", "Mar"],
  ["april", "Apr"],
  ["may", "May"],
  ["june", "Jun"],
  ["july", "Jul"],
  ["august", "Aug"],
  ["september", "Sep"],
  ["october", "Oct"],
  ["november", "Nov"],
  ["december", "Dec"],
] as const;

const LEGEND: readonly Season[] = ["winter", "spring", "summer", "autumn"];

interface SeasonCalendarProps {
  cityName: string;
  lat: number;
  /** 0–11; the month to mark as "now". */
  currentMonth: number;
}

/**
 * Twelve-month strip colored by meteorological season for the city's
 * hemisphere. Each month links to that month's ranked guide.
 */
export function SeasonCalendar({ cityName, lat, currentMonth }: SeasonCalendarProps) {
  const hemisphere = lat >= 0 ? "northern" : "southern";
  return (
    <div>
      <ol
        aria-label={`Seasons in ${cityName} by month`}
        className="grid grid-cols-6 gap-1.5 sm:grid-cols-12"
      >
        {MONTHS.map(([slug, label], index) => {
          const season = seasonForMonth(index, lat);
          const isNow = index === currentMonth;
          return (
            <li key={slug}>
              <Link
                href={`/best-cities-to-visit-in/${slug}`}
                aria-current={isNow ? "date" : undefined}
                aria-label={`${label}: ${season} in ${cityName}${isNow ? " (this month)" : ""}. See the best cities to visit in ${label}.`}
                className={cn(
                  "group bg-surface ease-standard hover:border-accent flex h-full flex-col overflow-hidden rounded-md border transition-colors duration-150",
                  isNow ? "border-ink" : "border-rule"
                )}
              >
                <span aria-hidden className={cn("h-2 w-full", seasonFillClass(season))} />
                <span className="flex flex-col items-center px-1 py-2.5">
                  <span className="group-hover:text-accent text-sm font-medium">{label}</span>
                  <span className="text-highlight-ink mt-0.5 h-4 text-xs font-medium">
                    {isNow ? "Now" : ""}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
      <div className="text-ink-muted mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        {LEGEND.map((season) => (
          <span key={season} className="inline-flex items-center gap-1.5">
            <span aria-hidden className={cn("size-2.5 rounded-sm", seasonFillClass(season))} />
            {seasonLabel(season)}
          </span>
        ))}
        <span>· Meteorological seasons, {hemisphere} hemisphere</span>
      </div>
    </div>
  );
}

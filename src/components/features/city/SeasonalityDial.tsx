import Link from "next/link";
import { CalendarDays } from "lucide-react";

/**
 * Seasonality Dial (innovation proposal Idea 5, navigation version): a
 * twelve-segment circular month dial that routes into the existing
 * `best-cities-to-visit-in/[month]` hubs. Segments are tinted by
 * *meteorological season at the city's hemisphere* (flipped south of the
 * equator) and the current month carries the accent highlight.
 *
 * Honesty note: v1 encodes season + "you are here", nothing else — no
 * fabricated per-city climate curves. When climate normals land in the
 * warmer cache, per-month comfort can modulate segment opacity.
 */

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
] as const;

const MONTH_INITIALS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"] as const;

type Season = "winter" | "spring" | "summer" | "autumn";

/** Meteorological seasons; flipped for the southern hemisphere. */
function seasonForMonth(monthIndex: number, lat: number): Season {
  const northern: Season[] = [
    "winter",
    "winter",
    "spring",
    "spring",
    "spring",
    "summer",
    "summer",
    "summer",
    "autumn",
    "autumn",
    "autumn",
    "winter",
  ];
  const season = northern.at(monthIndex % 12) ?? "winter";
  if (lat >= 0) return season;
  switch (season) {
    case "winter":
      return "summer";
    case "spring":
      return "autumn";
    case "summer":
      return "winter";
    case "autumn":
      return "spring";
  }
}

function wedgePath(index: number, cx: number, cy: number, r0: number, r1: number): string {
  const start = ((index * 30 - 90) * Math.PI) / 180;
  const end = (((index + 1) * 30 - 90 - 2) * Math.PI) / 180; // 2° gap between wedges
  const p = (radius: number, angle: number) =>
    `${(cx + radius * Math.cos(angle)).toFixed(2)} ${(cy + radius * Math.sin(angle)).toFixed(2)}`;
  return [
    `M ${p(r0, start)}`,
    `A ${r0} ${r0} 0 0 1 ${p(r0, end)}`,
    `L ${p(r1, end)}`,
    `A ${r1} ${r1} 0 0 0 ${p(r1, start)}`,
    "Z",
  ].join(" ");
}

function labelPosition(index: number, cx: number, cy: number, radius: number): [number, number] {
  const mid = ((index * 30 + 14 - 90) * Math.PI) / 180;
  return [cx + radius * Math.cos(mid), cy + radius * Math.sin(mid)];
}

interface SeasonalityDialProps {
  cityName: string;
  lat: number;
}

export default function SeasonalityDial({ cityName, lat }: SeasonalityDialProps) {
  const currentMonth = new Date().getUTCMonth();

  return (
    <section
      aria-labelledby="seasonality-dial-heading"
      className="atlas-panel rounded-2xl p-6 sm:rounded-3xl md:p-10"
    >
      <h2
        id="seasonality-dial-heading"
        className="flex items-center gap-3 text-xl font-bold tracking-tight md:text-2xl"
      >
        <CalendarDays className="text-accent h-5 w-5" aria-hidden />
        When to go
      </h2>
      <p className="text-muted mt-2 max-w-2xl text-sm leading-relaxed">
        Pick a month on the dial to see which cities shine then — {cityName} included where its
        cached climate band qualifies. Colors follow {lat >= 0 ? "northern" : "southern"}-hemisphere
        seasons.
      </p>

      <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:items-center">
        <svg
          viewBox="0 0 200 200"
          className="season-dial h-52 w-52 shrink-0 sm:h-60 sm:w-60"
          role="list"
          aria-label="Months of the year"
        >
          {MONTHS.map((month, index) => {
            const season = seasonForMonth(index, lat);
            const isNow = index === currentMonth;
            const [lx, ly] = labelPosition(index, 100, 100, 74);
            return (
              <Link key={month} href={`/best-cities-to-visit-in/${month}`} role="listitem">
                <path
                  d={wedgePath(index, 100, 100, 92, 52)}
                  className="season-dial-wedge"
                  style={{
                    fill: `var(--color-season-${season})`,
                    opacity: isNow ? 1 : 0.45,
                    stroke: isNow ? "var(--color-accent)" : "transparent",
                    strokeWidth: isNow ? 2.5 : 0,
                  }}
                >
                  <title>{`Best cities to visit in ${month.charAt(0).toUpperCase()}${month.slice(1)}`}</title>
                </path>
                <text
                  x={lx}
                  y={ly}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="season-dial-label"
                  aria-hidden
                >
                  {MONTH_INITIALS.at(index)}
                </text>
              </Link>
            );
          })}
          <circle cx={100} cy={100} r={40} fill="var(--color-surface)" stroke="var(--color-line)" />
          <text x={100} y={94} textAnchor="middle" className="season-dial-center" aria-hidden>
            now
          </text>
          <text
            x={100}
            y={112}
            textAnchor="middle"
            className="season-dial-center-month"
            aria-hidden
          >
            {MONTH_INITIALS.at(currentMonth)}
            {(MONTHS.at(currentMonth) ?? "").slice(1, 3)}
          </text>
        </svg>

        <ul className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm" aria-hidden>
          {(["spring", "summer", "autumn", "winter"] as const).map((season) => (
            <li key={season} className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full"
                style={{ background: `var(--color-season-${season})` }}
              />
              <span className="text-muted capitalize">{season}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

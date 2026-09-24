"use client";

import { mergeSeasons } from "@/lib/briefing-stream";
import { seasonFromName } from "@/lib/city-display";
import { cn } from "@/components/ui/cn";
import { seasonFillClass } from "../season-classes";
import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";
import { useInsight } from "./InsightProvider";

/** The briefing's season-by-season notes, joined with its weather notes. */
export function BriefingSeasons() {
  const { insight, status } = useInsight();
  const seasons = insight ? mergeSeasons(insight) : [];

  if (seasons.length === 0) {
    if (status === "streaming") {
      return (
        <LoadingRegion label="Loading seasonal notes" className="grid gap-4 sm:grid-cols-2">
          {[0, 1].map((key) => (
            <Skeleton key={key} className="h-28 w-full" />
          ))}
        </LoadingRegion>
      );
    }
    return null;
  }

  return (
    <div>
      <h3 className="text-h3">Season by season</h3>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2">
        {seasons.map((season) => (
          <li
            key={season.name}
            className="border-rule bg-surface relative overflow-hidden rounded-md border p-4 pl-5"
          >
            <span
              aria-hidden
              className={cn(
                "absolute inset-y-0 left-0 w-1",
                seasonFillClass(seasonFromName(season.name))
              )}
            />
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <p className="font-medium">{season.name}</p>
              {season.tempC ? (
                <p className="text-ink-muted text-sm tabular-nums">{season.tempC}</p>
              ) : null}
            </div>
            {season.months ? <p className="text-ink-muted text-sm">{season.months}</p> : null}
            {season.summary ? <p className="mt-2 text-sm">{season.summary}</p> : null}
            {season.notes ? <p className="text-ink-muted mt-2 text-sm">{season.notes}</p> : null}
          </li>
        ))}
      </ul>
      <p className="text-ink-muted mt-3 text-xs">
        Seasonal notes are part of the AI-written briefing.
      </p>
    </div>
  );
}

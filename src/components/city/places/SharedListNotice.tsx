"use client";

import { Import, Users } from "lucide-react";
import type { Landmark, PlaceType } from "@/lib/places";
import { Button } from "@/components/ui/Button";

export interface ResolvedSharedPlace {
  place: Landmark;
  type: PlaceType;
  day?: number;
}

interface SharedListNoticeProps {
  cityName: string;
  places: readonly ResolvedSharedPlace[];
  unresolvedCount: number;
  imported: boolean;
  onImport: () => void;
}

/** Shown when the page is opened from someone's `?shared=` list link. */
export function SharedListNotice({
  cityName,
  places,
  unresolvedCount,
  imported,
  onImport,
}: SharedListNoticeProps) {
  return (
    <section
      aria-labelledby="shared-list-title"
      className="border-accent/40 bg-accent-soft mb-8 rounded-md border p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 id="shared-list-title" className="flex items-center gap-2 font-semibold">
            <Users aria-hidden className="text-accent size-4" />A shared list for {cityName}
          </h3>
          <p className="text-ink-muted mt-1 text-sm">
            {places.length} {places.length === 1 ? "place" : "places"}
            {unresolvedCount > 0
              ? ` · ${unresolvedCount} ${unresolvedCount === 1 ? "place is" : "places are"} no longer in today's list`
              : ""}
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={onImport}
          disabled={imported || places.length === 0}
        >
          <Import aria-hidden />
          {imported ? "Added to your saved places" : "Add to my saved places"}
        </Button>
      </div>
      {places.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {places.map(({ place, day }) => (
            <li
              key={place.id}
              className="border-rule bg-surface rounded-full border px-3 py-1 text-sm"
            >
              {place.displayName.text}
              {day ? <span className="text-ink-muted"> · Day {day}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

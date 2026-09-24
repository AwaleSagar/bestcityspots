"use client";

import { Bookmark } from "lucide-react";
import { useSavedPlaces } from "@/hooks/useSavedPlaces";
import { useHydrated } from "@/hooks/useStoredValue";

/** Sidebar pointer to the day plan (or how to start one). */
export function PlanSummary({ cityName }: { cityName: string }) {
  const hydrated = useHydrated();
  const { places } = useSavedPlaces();
  const forCity = places.filter((place) => place.city === cityName);
  const days = new Set(forCity.map((place) => place.day).filter((day) => day && day > 0)).size;

  return (
    <div className="border-rule bg-surface rounded-md border p-4">
      <p className="flex items-center gap-2 font-medium">
        <Bookmark aria-hidden className="text-accent size-4" />
        Your plan
      </p>
      {hydrated && forCity.length > 0 ? (
        <p className="text-ink-muted mt-1.5 text-sm">
          {forCity.length} saved {forCity.length === 1 ? "place" : "places"}
          {days > 0 ? ` across ${days} ${days === 1 ? "day" : "days"}` : ""}.{" "}
          <a href="#plan" className="text-accent underline underline-offset-2">
            Open plan
          </a>
        </p>
      ) : (
        <p className="text-ink-muted mt-1.5 text-sm">
          Save places below to build a day-by-day walking plan.{" "}
          <a href="#places" className="text-accent underline underline-offset-2">
            Browse places
          </a>
        </p>
      )}
    </div>
  );
}

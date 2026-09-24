"use client";

import { useMemo } from "react";
import { ExternalLink, Printer, Share2, X } from "lucide-react";
import { buildDayDirectionsUrl, MAX_ITINERARY_DAYS, type SavedPlace } from "@/lib/saved-places";
import { encodeSharedList, SHARE_PARAM } from "@/lib/share-list";
import { useAnalytics } from "@/lib/useAnalytics";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Toast, useToast } from "@/components/ui/Toast";
import { tabLabel } from "./place-helpers";

interface PlanPanelProps {
  cityName: string;
  places: readonly SavedPlace[];
  onSetDay: (id: string, day: number) => void;
  onRemove: (id: string) => void;
}

/**
 * US-10 day plan for this city's saved places: assign days, open each day
 * as a Google Maps walking route, print it, or share it as a link (place ids
 * + days only — notes never leave the device).
 */
export function PlanPanel({ cityName, places, onSetDay, onRemove }: PlanPanelProps) {
  const { trackAction } = useAnalytics();
  const toast = useToast();

  const groups = useMemo(() => {
    const byDay = new Map<number, SavedPlace[]>();
    for (const place of places) {
      const day = place.day && place.day > 0 ? place.day : 0;
      byDay.set(day, [...(byDay.get(day) ?? []), place]);
    }
    return [...byDay.entries()].sort(([a], [b]) => (a === 0 ? 1 : b === 0 ? -1 : a - b));
  }, [places]);

  const dayOptions = useMemo(() => {
    const highest = Math.max(0, ...places.map((place) => place.day ?? 0));
    return Array.from(
      { length: Math.min(highest + 1, MAX_ITINERARY_DAYS) },
      (_, index) => index + 1
    );
  }, [places]);

  const share = async () => {
    const days = Object.fromEntries(
      places
        .filter((place) => place.day && place.day > 0)
        .map((place) => [place.id, place.day as number])
    );
    const token = encodeSharedList(
      cityName,
      places.map((place) => place.id),
      days
    );
    const url = `${window.location.origin}${window.location.pathname}?${SHARE_PARAM}=${token}`;
    trackAction("share");
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: `Saved places in ${cityName}`, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.show("Link to your list copied");
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") toast.show("Couldn't share the list");
    }
  };

  const print = () => {
    trackAction("download_itinerary");
    const root = document.documentElement;
    root.dataset.print = "plan";
    const reset = () => {
      delete root.dataset.print;
      window.removeEventListener("afterprint", reset);
    };
    window.addEventListener("afterprint", reset);
    window.print();
  };

  return (
    <section
      id="plan"
      aria-labelledby="plan-title"
      data-print-region="plan"
      className="border-rule bg-surface mt-12 scroll-mt-32 rounded-md border p-4 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 id="plan-title" className="text-h3">
            Your {cityName} plan
          </h3>
          <p className="text-ink-muted mt-1 text-sm">
            {places.length} saved {places.length === 1 ? "place" : "places"}. Group them into days
            to get a walking route for each.
          </p>
        </div>
        <div data-print-hide className="flex flex-wrap gap-2">
          <Button size="sm" onClick={share}>
            <Share2 aria-hidden />
            Share list
          </Button>
          <Button size="sm" variant="ghost" onClick={print}>
            <Printer aria-hidden />
            Print
          </Button>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {groups.map(([day, dayPlaces]) => {
          const directions = day > 0 ? buildDayDirectionsUrl(dayPlaces) : null;
          return (
            <div key={day}>
              <div className="border-rule flex flex-wrap items-baseline justify-between gap-2 border-b pb-2">
                <h4 className="font-semibold">{day === 0 ? "Not scheduled yet" : `Day ${day}`}</h4>
                {directions ? (
                  <a
                    href={directions}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackAction("click_maps_link")}
                    data-print-hide
                    className={buttonClasses({ variant: "link", className: "text-sm" })}
                  >
                    <ExternalLink aria-hidden />
                    Day {day} route in Google Maps
                  </a>
                ) : null}
              </div>
              <ul className="divide-rule divide-y">
                {dayPlaces.map((place) => (
                  <li key={place.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{place.name}</p>
                      <p className="text-ink-muted truncate text-sm">
                        {tabLabel(place.type)}
                        {place.address ? ` · ${place.address}` : ""}
                      </p>
                    </div>
                    <label data-print-hide className="flex items-center gap-2 text-sm">
                      <span className="sr-only">Day for {place.name}</span>
                      <select
                        value={place.day ?? 0}
                        onChange={(event) => onSetDay(place.id, Number(event.target.value))}
                        className="border-rule-strong bg-paper h-9 rounded-md border px-2 text-sm pointer-coarse:h-11"
                      >
                        <option value={0}>Not scheduled</option>
                        {dayOptions.map((option) => (
                          <option key={option} value={option}>
                            Day {option}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      data-print-hide
                      onClick={() => onRemove(place.id)}
                      aria-label={`Remove ${place.name} from saved places`}
                      className="text-ink-muted hover:bg-sunken hover:text-ink inline-flex size-9 items-center justify-center rounded-md pointer-coarse:size-11"
                    >
                      <X aria-hidden className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <Toast message={toast.message} />
    </section>
  );
}

"use client";

import Link from "next/link";
import { Bookmark, History, Trash2, X } from "lucide-react";
import { cityHref } from "@/lib/city-href";
import type { SavedPlace } from "@/lib/saved-places";
import { useRecentCities } from "@/hooks/useRecentCities";
import { useSavedPlaces } from "@/hooks/useSavedPlaces";
import { useHydrated } from "@/hooks/useStoredValue";
import { Button, buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Notice } from "@/components/ui/Notice";
import { Section } from "@/components/ui/Section";
import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";
import { CityRow } from "@/components/city/CityRow";
import { tabLabel } from "@/components/city/places/place-helpers";

function groupByCity(places: readonly SavedPlace[]) {
  const groups = new Map<string, SavedPlace[]>();
  for (const place of places) groups.set(place.city, [...(groups.get(place.city) ?? []), place]);
  return [...groups.entries()];
}

/** Everything the visitor saved, read from this browser's storage. */
export function SavedContent() {
  const hydrated = useHydrated();
  const saved = useSavedPlaces();
  const { recent, removeRecent, clearRecent } = useRecentCities();

  if (!hydrated) {
    return (
      <LoadingRegion label="Loading your saved places" className="space-y-4 py-12">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </LoadingRegion>
    );
  }

  const groups = groupByCity(saved.places);
  const recentByName = new Map(recent.map((city) => [city.city, city]));

  return (
    <div className="space-y-16 py-12 pb-20">
      <Notice>
        Saved on this device only — nothing is uploaded, and there&apos;s no account. Clearing your
        browser data removes it. To move a list, open a city plan and use Share list.
      </Notice>

      <Section id="places" title="Saved places">
        {groups.length === 0 ? (
          <EmptyState
            icon={<Bookmark aria-hidden />}
            title="No saved places yet"
            action={
              <Link href="/resources/top-cities" className={buttonClasses({ variant: "primary" })}>
                Find a city to explore
              </Link>
            }
          >
            Open any city guide and press Save on sights, food or stays. They&apos;ll collect here,
            grouped by city, ready to plan by day.
          </EmptyState>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {groups.map(([cityName, places]) => {
              const known = recentByName.get(cityName);
              const guideHref = known
                ? cityHref(known)
                : `/search?q=${encodeURIComponent(cityName)}`;
              const days = new Set(places.map((place) => place.day).filter((day) => day && day > 0))
                .size;
              return (
                <article
                  key={cityName}
                  aria-labelledby={`saved-${cityName}`}
                  className="border-rule bg-surface rounded-md border p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 id={`saved-${cityName}`} className="font-display text-2xl">
                      {cityName}
                    </h3>
                    <p className="text-ink-muted text-sm">
                      {places.length} {places.length === 1 ? "place" : "places"}
                      {days > 0 ? ` · ${days} ${days === 1 ? "day" : "days"} planned` : ""}
                    </p>
                  </div>
                  <ul className="divide-rule border-rule mt-3 divide-y border-y">
                    {places.map((place) => (
                      <li key={place.id} className="flex items-center gap-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{place.name}</p>
                          <p className="text-ink-muted text-sm">
                            {tabLabel(place.type)}
                            {place.day ? ` · Day ${place.day}` : ""}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => saved.remove(place.id, cityName)}
                          aria-label={`Remove ${place.name}`}
                          className="text-ink-muted hover:bg-sunken hover:text-ink inline-flex size-9 items-center justify-center rounded-md pointer-coarse:size-11"
                        >
                          <X aria-hidden className="size-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Link
                      href={known ? `${guideHref}#plan` : guideHref}
                      className={buttonClasses({ size: "sm" })}
                    >
                      {known ? "Open plan" : `Find ${cityName}`}
                    </Link>
                    <Button size="sm" variant="ghost" onClick={() => saved.clearCity(cityName)}>
                      <Trash2 aria-hidden />
                      Clear {cityName}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Section>

      <Section
        id="recent"
        title="Recently viewed"
        actions={
          recent.length > 0 ? (
            <Button size="sm" variant="ghost" onClick={clearRecent}>
              Clear history
            </Button>
          ) : null
        }
      >
        {recent.length === 0 ? (
          <EmptyState icon={<History aria-hidden />} title="No history yet">
            City guides you open appear here, so you can pick up where you left off.
          </EmptyState>
        ) : (
          <ol className="border-rule border-t">
            {recent.map((city) => (
              <CityRow
                key={city.id}
                city={city}
                action={
                  <button
                    type="button"
                    onClick={() => removeRecent(city.id)}
                    aria-label={`Remove ${city.city} from history`}
                    className="text-ink-muted hover:bg-sunken hover:text-ink inline-flex size-9 items-center justify-center rounded-md pointer-coarse:size-11"
                  >
                    <X aria-hidden className="size-4" />
                  </button>
                }
              />
            ))}
          </ol>
        )}
      </Section>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import type { City } from "@/lib/cities";
import { SearchField } from "@/components/search/SearchField";
import { MAX_COMPARE } from "./compare-config";

/** Adds a city to `/compare?cities=…` (the URL is the comparison). */
export function ComparePicker({
  current,
  currentIds,
}: {
  current: string[];
  currentIds: number[];
}) {
  const router = useRouter();
  if (current.length >= MAX_COMPARE) {
    return (
      <p className="text-ink-muted text-sm">
        Comparing the maximum of {MAX_COMPARE} cities. Remove one to add another.
      </p>
    );
  }
  const add = (city: City) => {
    if (!city.slug) return;
    const next = [...current.filter((slug) => slug !== city.slug), city.slug].slice(-MAX_COMPARE);
    router.push(`/compare?cities=${next.join(",")}`);
  };
  return (
    <div className="max-w-xl">
      <SearchField
        mode="select"
        onSelect={add}
        showRecent
        excludeIds={currentIds}
        label={current.length === 0 ? "Add a city to compare" : "Add another city"}
        placeholder={current.length === 0 ? "Add a city, e.g. Lisbon" : "Add another city"}
      />
      <p className="text-ink-muted mt-2 text-sm">
        {current.length === 0
          ? `Pick up to ${MAX_COMPARE} cities.`
          : `${MAX_COMPARE - current.length} more ${MAX_COMPARE - current.length === 1 ? "slot" : "slots"} available.`}
      </p>
    </div>
  );
}

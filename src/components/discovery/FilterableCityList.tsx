"use client";

import { useDeferredValue, useId, useMemo, useState } from "react";
import { SearchX } from "lucide-react";
import type { City } from "@/lib/cities";
import { formatPopulation } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { CityRow } from "@/components/city/CityRow";

export type ListCity = Pick<
  City,
  "id" | "slug" | "city" | "admin_name" | "country" | "population"
> & {
  /** Among the most-viewed guides on the site (aggregate counts). */
  trending?: boolean;
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Ranked city list with an instant, accent-insensitive text filter. */
export function FilterableCityList({ cities, label }: { cities: ListCity[]; label: string }) {
  const inputId = useId();
  const [value, setValue] = useState("");
  const query = useDeferredValue(normalize(value.trim()));

  const indexed = useMemo(
    () =>
      cities.map((city, index) => ({
        city,
        rank: index + 1,
        haystack: normalize(`${city.city} ${city.admin_name ?? ""} ${city.country}`),
      })),
    [cities]
  );
  const visible = query ? indexed.filter((entry) => entry.haystack.includes(query)) : indexed;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="w-full max-w-sm">
          <label htmlFor={inputId} className="text-sm font-medium">
            Filter this list
          </label>
          <input
            id={inputId}
            type="search"
            value={value}
            onChange={(event) => setValue(event.target.value.slice(0, 80))}
            placeholder="City, region or country"
            className="border-rule-strong bg-surface placeholder:text-ink-subtle mt-1.5 h-11 w-full rounded-md border px-3 text-base"
          />
        </div>
        <p role="status" className="text-ink-muted text-sm tabular-nums">
          {query ? `${visible.length} of ${cities.length} ${label}` : `${cities.length} ${label}`}
        </p>
      </div>
      {visible.length > 0 ? (
        <ol className="border-rule mt-6 border-t">
          {visible.map(({ city, rank }) => (
            <CityRow
              key={city.id}
              city={city}
              rank={rank}
              meta={
                <>
                  {city.trending ? <Badge tone="highlight">Trending</Badge> : null}
                  {city.population ? (
                    <span className="text-ink-muted hidden w-12 text-right tabular-nums sm:inline">
                      {formatPopulation(city.population)}
                    </span>
                  ) : null}
                </>
              }
            />
          ))}
        </ol>
      ) : (
        <EmptyState
          className="mt-6"
          icon={<SearchX aria-hidden />}
          title="No cities match that filter"
        >
          Try a shorter name, or use search to look beyond this list.
        </EmptyState>
      )}
    </div>
  );
}

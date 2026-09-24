import Link from "next/link";
import type { ReactNode } from "react";
import type { City } from "@/lib/cities";
import { cityHref } from "@/lib/city-href";
import { capitalLabel } from "@/lib/city-display";
import { formatPopulation } from "@/lib/format";

interface CityCardProps {
  city: Pick<City, "id" | "slug" | "city" | "admin_name" | "country" | "population" | "capital">;
  meta?: ReactNode;
}

/** Compact card for grids (related cities, suggestions). */
export function CityCard({ city, meta }: CityCardProps) {
  const capital = capitalLabel(city.capital);
  return (
    <Link
      href={cityHref(city)}
      className="group border-rule bg-surface ease-standard hover:border-rule-strong flex h-full flex-col rounded-md border p-4 transition-colors duration-150"
    >
      <span className="font-display group-hover:text-accent text-xl leading-tight">
        {city.city}
      </span>
      <span className="text-ink-muted mt-0.5 text-sm">
        {[city.admin_name, city.country].filter(Boolean).join(", ")}
      </span>
      <span className="text-ink-muted mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-4 text-xs">
        {city.population ? (
          <span className="tabular-nums">{formatPopulation(city.population)} people</span>
        ) : null}
        {capital ? <span>{capital}</span> : null}
        {meta}
      </span>
    </Link>
  );
}

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import type { City } from "@/lib/cities";
import { cityHref } from "@/lib/city-href";
import { regionLine } from "@/lib/city-display";

interface CityRowProps {
  city: Pick<City, "id" | "slug" | "city" | "admin_name" | "country">;
  rank?: number;
  /** Right-aligned data (metric, temperature, badges). */
  meta?: ReactNode;
  /** Secondary line override; defaults to "{region}, {country}". */
  detail?: ReactNode;
  /** Trailing control outside the link (e.g. a remove button). */
  action?: ReactNode;
}

/** Ranked, scannable list row — the workhorse of every index and hub. */
export function CityRow({ city, rank, meta, detail, action }: CityRowProps) {
  return (
    <li className="relative">
      <Link
        href={cityHref(city)}
        className={`group border-rule ease-standard hover:bg-sunken/60 grid min-h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 border-b py-3 transition-colors duration-150 sm:px-2 ${action ? "pr-12 sm:pr-14" : ""}`}
      >
        {typeof rank === "number" ? (
          <span className="font-display text-ink-subtle w-8 text-2xl leading-none tabular-nums">
            {String(rank).padStart(2, "0")}
          </span>
        ) : (
          <span aria-hidden />
        )}
        <span className="min-w-0">
          <span className="group-hover:text-accent block truncate font-medium">{city.city}</span>
          <span className="text-ink-muted block truncate text-sm">
            {detail ?? regionLine(city)}
          </span>
        </span>
        <span className="flex items-center gap-3 text-sm">
          {meta}
          <ArrowRight
            aria-hidden
            className="text-ink-subtle ease-standard group-hover:text-accent size-4 transition-transform duration-150 group-hover:translate-x-0.5"
          />
        </span>
      </Link>
      {action ? (
        <div className="absolute top-1/2 right-0 -translate-y-1/2 sm:right-2">{action}</div>
      ) : null}
    </li>
  );
}

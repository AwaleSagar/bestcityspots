import { MapPin } from "lucide-react";
import type { City, CitySearchResult } from "@/lib/cities";
import { cn } from "@/components/ui/cn";
import { Highlight } from "./Highlight";

interface CityOptionProps {
  id: string;
  city: City | CitySearchResult;
  query: string | null;
  active: boolean;
  onSelect: () => void;
  onHover: () => void;
}

function matchNote(city: City | CitySearchResult): string | null {
  if (!("match_type" in city)) return null;
  if (city.match_type === "alias") return "Also known as";
  if (city.match_type === "fuzzy") return "Close match";
  return null;
}

/** One listbox row: city name (highlighted), region + country, match hint. */
export function CityOption({ id, city, query, active, onSelect, onHover }: CityOptionProps) {
  const region = [city.admin_name, city.country].filter(Boolean).join(", ");
  const note = matchNote(city);
  return (
    <li
      id={id}
      role="option"
      aria-selected={active}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onSelect}
      onMouseMove={onHover}
      className={cn(
        "flex min-h-12 cursor-pointer items-center gap-3 rounded-md px-3 py-2",
        active ? "bg-accent-soft" : "hover:bg-sunken"
      )}
    >
      <MapPin aria-hidden className="text-ink-subtle size-4 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">
          <Highlight text={city.city} query={query} />
        </span>
        <span className="text-ink-muted block truncate text-sm">{region}</span>
      </span>
      {note ? <span className="text-ink-muted shrink-0 text-xs">{note}</span> : null}
    </li>
  );
}

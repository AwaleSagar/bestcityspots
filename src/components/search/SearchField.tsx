"use client";

import { useId, useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Search, X } from "lucide-react";
import type { City } from "@/lib/cities";
import { cityHref } from "@/lib/city-href";
import { sanitizeSearchInput } from "@/lib/search-utils";
import { useRecentCities } from "@/hooks/useRecentCities";
import { cn } from "@/components/ui/cn";
import { CityOption } from "./CityOption";
import { LocateButton } from "./LocateButton";
import { useActiveIndex } from "./useActiveIndex";
import { useCitySearch } from "./useCitySearch";

interface SearchFieldProps {
  /** navigate: open the city guide. select: hand the city to `onSelect`. */
  mode?: "navigate" | "select";
  onSelect?: (city: City) => void;
  label?: string;
  placeholder?: string;
  size?: "md" | "lg";
  defaultQuery?: string;
  showLocate?: boolean;
  showRecent?: boolean;
  autoFocus?: boolean;
  /** Cities to leave out of the results (e.g. already compared). */
  excludeIds?: readonly number[];
  className?: string;
}

/**
 * Inline city search: an ARIA 1.2 combobox inside a real GET form, so
 * without JavaScript (or on Enter with no active option) it submits to
 * /search?q=… .
 */
export function SearchField({
  mode = "navigate",
  onSelect,
  label = "Search cities",
  placeholder = "Search a city, e.g. Lisbon",
  size = "md",
  defaultQuery = "",
  showLocate = false,
  showRecent = true,
  autoFocus = false,
  excludeIds,
  className,
}: SearchFieldProps) {
  const inputId = useId();
  const listId = useId();
  const router = useRouter();
  const [value, setValue] = useState(defaultQuery);
  const [open, setOpen] = useState(false);
  const { recent, addRecent } = useRecentCities();
  const { query, results, status } = useCitySearch(value, 8);

  const excluded = new Set(excludeIds ?? []);
  const cities: City[] = (query ? results : showRecent ? recent.slice(0, 5) : []).filter(
    (city) => !excluded.has(city.id)
  );
  const { activeIndex, setActiveIndex, onArrowKeys } = useActiveIndex(
    cities.length,
    `${query ?? ""}:${cities.length}`
  );

  const showNoResults = Boolean(query) && status === "ready" && cities.length === 0;
  const listVisible = open && (cities.length > 0 || showNoResults);

  const choose = (city: City) => {
    setOpen(false);
    if (mode === "select") {
      onSelect?.(city);
      setValue("");
      return;
    }
    addRecent(city);
    router.push(cityHref(city));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      if (listVisible) setOpen(false);
      else setValue("");
      return;
    }
    if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) setOpen(true);
    if (onArrowKeys(event)) return;
    if (event.key === "Enter" && activeIndex >= 0) {
      const city = cities.at(activeIndex);
      if (city) {
        event.preventDefault();
        choose(city);
      }
    }
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (mode === "select") {
      event.preventDefault();
      const first = cities.at(0);
      if (query && first) choose(first);
      return;
    }
    if (!query) event.preventDefault();
  };

  const activeId = activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined;
  const statusMessage =
    status === "loading"
      ? "Searching…"
      : query
        ? `${cities.length} ${cities.length === 1 ? "city" : "cities"} found`
        : "";

  return (
    <form
      role="search"
      action="/search"
      method="get"
      onSubmit={onSubmit}
      className={cn("relative", className)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <div
        data-focus-within-ring
        className={cn(
          "border-rule-strong bg-surface ease-standard hover:border-ink-subtle flex items-center gap-2 rounded-md border pr-1.5 pl-3.5 transition-colors duration-150",
          size === "lg" ? "h-14" : "h-12"
        )}
      >
        <Search aria-hidden className="text-ink-muted size-5 shrink-0" />
        <input
          id={inputId}
          name="q"
          type="search"
          role="combobox"
          aria-expanded={listVisible}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          autoFocus={autoFocus}
          placeholder={placeholder}
          value={value}
          maxLength={100}
          onChange={(event) => {
            setValue(sanitizeSearchInput(event.target.value));
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className={cn(
            "placeholder:text-ink-subtle h-full min-w-0 flex-1 bg-transparent outline-none [&::-webkit-search-cancel-button]:hidden",
            size === "lg" ? "text-lg" : "text-base"
          )}
        />
        {status === "loading" ? (
          <LoaderCircle aria-hidden className="text-ink-muted size-4 shrink-0 animate-spin" />
        ) : null}
        {value ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setValue("")}
            className="text-ink-muted hover:bg-sunken hover:text-ink inline-flex size-9 shrink-0 items-center justify-center rounded-md pointer-coarse:size-11"
          >
            <X aria-hidden className="size-4" />
          </button>
        ) : null}
        {showLocate && !value ? <LocateButton /> : null}
      </div>

      <div
        hidden={!listVisible}
        className="border-rule bg-surface shadow-overlay absolute inset-x-0 top-full z-30 mt-2 rounded-lg border p-1.5"
      >
        {!query && cities.length > 0 ? (
          <p className="text-ink-muted px-3 pt-1.5 pb-1 text-xs font-medium">Recent</p>
        ) : null}
        <ul id={listId} role="listbox" aria-label={query ? "Matching cities" : "Recent cities"}>
          {cities.map((city, index) => (
            <CityOption
              key={city.id}
              id={`${listId}-${index}`}
              city={city}
              query={query}
              active={index === activeIndex}
              onSelect={() => choose(city)}
              onHover={() => setActiveIndex(index)}
            />
          ))}
        </ul>
        {showNoResults ? (
          <p className="text-ink-muted px-3 py-3 text-sm">
            No cities match “{query}”. Check the spelling or try the English name.
          </p>
        ) : null}
      </div>
      <p role="status" className="sr-only">
        {open ? statusMessage : ""}
      </p>
    </form>
  );
}

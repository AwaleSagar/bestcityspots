"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { searchCities, type CitySearchResult } from "@/lib/cities";

interface ComparePickerProps {
  /** Slugs already in the comparison (max 3 total). */
  current: string[];
}

/**
 * US-07: add a city to the comparison. Reuses the existing elastic
 * `searchCities()` engine (FTS + fuzzy + alias). A dedicated picker rather
 * than `<CitySearch>` itself because that component hard-navigates to city
 * pages on select; here selection appends to the `?cities=` URL state.
 */
export default function ComparePicker({ current }: ComparePickerProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CitySearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    // All state updates run inside the (debounced) timeout — never
    // synchronously in the effect body, which would cascade renders.
    debounceRef.current = window.setTimeout(
      async () => {
        if (trimmed.length < 2) {
          setResults([]);
          setOpen(false);
          return;
        }
        const found = await searchCities(trimmed, 6);
        setResults(found.filter((c) => typeof c.slug === "string" && c.slug.length > 0));
        setOpen(true);
      },
      trimmed.length < 2 ? 0 : 200
    );
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query]);

  const addCity = (slug: string) => {
    const next = [...current.filter((s) => s !== slug), slug].slice(-3);
    setQuery("");
    setResults([]);
    setOpen(false);
    router.push(`/compare?cities=${next.join(",")}`);
  };

  if (current.length >= 3) {
    return (
      <p className="text-muted text-sm">
        Three cities is the comparison limit — remove one to add another.
      </p>
    );
  }

  return (
    <div className="relative max-w-md">
      <label htmlFor="compare-search" className="eyebrow mb-2 block">
        <Plus className="text-accent h-3.5 w-3.5" aria-hidden />
        Add a city
      </label>
      <div className="border-line bg-surface flex items-center gap-2 rounded-xl border px-4 py-3">
        <Search className="text-muted h-4 w-4 shrink-0" aria-hidden />
        <input
          id="compare-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search cities to compare…"
          autoComplete="off"
          className="text-foreground placeholder:text-muted w-full bg-transparent text-base outline-none"
          role="combobox"
          aria-expanded={open}
          aria-controls="compare-results"
        />
      </div>
      {open && results.length > 0 && (
        <ul
          id="compare-results"
          role="listbox"
          aria-label="City results"
          className="glass-dropdown absolute z-20 mt-2 w-full overflow-hidden rounded-xl"
        >
          {results.map((city) => (
            <li key={city.id} role="option" aria-selected="false">
              <button
                type="button"
                onClick={() => addCity(city.slug as string)}
                className="hover:bg-surface-strong text-foreground flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition-colors"
              >
                <span className="font-semibold">{city.city}</span>
                <span className="text-muted truncate text-xs">{city.country}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

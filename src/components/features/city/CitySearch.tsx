"use client";

import type { KeyboardEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, MapPin, ArrowRight, LocateFixed, Sparkles } from "lucide-react";
import { searchCities, findNearestCity, type City, type CitySearchResult } from "@/lib/cities";
import { useRecentSearches } from "@/hooks/useRecentSearches";
import { useDeviceType } from "@/hooks/useDeviceType";
import { useAnalytics } from "@/lib/useAnalytics";
import { Chip, cx } from "@/components/atlas";

interface CitySearchProps {
  topCities: City[];
  /** Optional overline hint shown below the input. */
  autoFocus?: boolean;
}

const KEYBOARD_ANIMATION_DELAY = 300;
const DEBOUNCE_MS = 200;
const MIN_QUERY_LEN = 2;
const MAX_QUERY_LEN = 100;

const PLACEHOLDER_HINTS = [
  "Search by city or country…",
  "Try 'Tokyo' or 'Bangkok'",
  "Try 'Lisbon' or 'Mexico City'",
  "Try 'New York' or 'Cape Town'",
];

function highlight(text: string, query: string) {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={i}
            className="rounded-sm bg-[color:var(--color-accent-soft)] px-0.5 text-[color:var(--color-accent-strong)]"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function matchTypeLabel(r: CitySearchResult) {
  if (r.match_type === "fuzzy") return "Similar match";
  if (r.match_type === "alias") return "Also known as";
  return null;
}

export default function CitySearch({ topCities, autoFocus }: CitySearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CitySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [filter, setFilter] = useState<"megacity" | "capital" | null>(null);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasTrackedSearch = useRef(false);

  const router = useRouter();
  const { trackAction } = useAnalytics();
  const { recentCities, addRecentCity } = useRecentSearches();
  const { isMobile, isTablet, isVirtualKeyboardOpen } = useDeviceType();
  const isTouchDevice = isMobile || isTablet;

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  // Rotating placeholder
  useEffect(() => {
    if (query) return;
    const interval = setInterval(() => {
      setPlaceholderIdx((prev) => (prev + 1) % PLACEHOLDER_HINTS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [query]);

  // Scroll into view when virtual keyboard opens
  useEffect(() => {
    if (!isVirtualKeyboardOpen || !isTouchDevice) return;
    const timeout = setTimeout(() => {
      containerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, KEYBOARD_ANIMATION_DELAY);
    return () => clearTimeout(timeout);
  }, [isVirtualKeyboardOpen, isTouchDevice]);

  // Debounced search
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if (query.length >= MIN_QUERY_LEN) {
        setIsSearching(true);
        let found = await searchCities(query, 15, controller.signal);

        if (filter === "megacity") {
          found = found.filter((c) => c.population > 5000000);
        } else if (filter === "capital") {
          found = found.filter((c) => c.capital === "primary");
        }

        if (controller.signal.aborted) return;
        setResults(found.slice(0, 10));
        setActiveIndex(-1);
        setIsSearching(false);

        if (!hasTrackedSearch.current && found.length > 0) {
          trackAction("search");
          hasTrackedSearch.current = true;
        }
      } else {
        controller.abort();
        setResults([]);
        setActiveIndex(-1);
        setIsSearching(false);
        hasTrackedSearch.current = false;
      }
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, filter, trackAction]);

  const showResults = query.trim().length >= MIN_QUERY_LEN;

  const fuzzyHint = useMemo(() => {
    if (!showResults || results.length === 0) return null;
    const first = results[0];
    if (first.match_type === "fuzzy" || first.match_type === "alias") return first.city;
    return null;
  }, [showResults, results]);

  const resultsListId = "city-search-results";
  const activeCity = activeIndex >= 0 ? results.at(activeIndex) : undefined;
  const activeOptionId = activeCity ? `city-option-${activeCity.id}` : undefined;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => {
          if (results.length === 0) return -1;
          return prev >= results.length - 1 ? 0 : prev + 1;
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => {
          if (results.length === 0) return -1;
          return prev <= 0 ? results.length - 1 : prev - 1;
        });
      } else if (e.key === "Enter") {
        const picked = activeIndex >= 0 ? results.at(activeIndex) : results.at(0);
        if (picked) {
          addRecentCity(picked);
          router.push(`/cities/${picked.id}?lat=${picked.lat}&lng=${picked.lng}`);
        }
      } else if (e.key === "Escape") {
        setQuery("");
        setResults([]);
        setActiveIndex(-1);
      }
    },
    [activeIndex, results, router, addRecentCity],
  );

  const handleLocate = useCallback(() => {
    if (isLocating || typeof navigator === "undefined" || !navigator.geolocation) {
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const nearest = await findNearestCity(latitude, longitude);
          if (!nearest) {
            setIsLocating(false);
            return;
          }
          addRecentCity(nearest);
          router.push(`/cities/${nearest.id}?lat=${latitude}&lng=${longitude}`);
        } catch {
          setIsLocating(false);
        }
      },
      () => setIsLocating(false),
    );
  }, [isLocating, router, addRecentCity]);

  return (
    <div ref={containerRef} className="relative w-full">
      <label htmlFor="city-search" className="sr-only">
        Search for a city
      </label>

      {/* Input shell */}
      <div className="group relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[color:var(--color-muted)] transition-colors group-focus-within:text-[color:var(--color-foreground)]"
          aria-hidden="true"
        />
        <input
          id="city-search"
          ref={inputRef}
          type="text"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(e) => {
            const val = e.target.value.replace(/[^a-zA-Z0-9\s-]/g, "");
            if (val.length <= MAX_QUERY_LEN) setQuery(val);
          }}
          onKeyDown={handleKeyDown}
          placeholder={PLACEHOLDER_HINTS.at(placeholderIdx) ?? PLACEHOLDER_HINTS[0]}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showResults}
          aria-controls={resultsListId}
          aria-activedescendant={activeOptionId}
          className={cx(
            "h-14 w-full rounded-[var(--radius-lg)] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)]",
            "pl-12 pr-14 text-base text-[color:var(--color-foreground)] placeholder:text-[color:var(--color-muted)]",
            "shadow-[var(--shadow-sm)] outline-none transition-[border-color,box-shadow] focus-visible:border-[color:var(--color-accent)] focus-visible:shadow-[var(--shadow-md)]",
            "sm:h-16 sm:text-lg",
          )}
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {(isSearching || isLocating) && (
            <span
              aria-hidden="true"
              className="h-5 w-5 animate-spin rounded-full border-2 border-[color:var(--color-line)] border-t-[color:var(--color-accent)]"
            />
          )}
          <button
            type="button"
            onClick={handleLocate}
            disabled={isLocating}
            aria-label="Use current location"
            className={cx(
              "inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] transition-colors",
              "text-[color:var(--color-muted)] hover:bg-[color:var(--color-surface-muted)] hover:text-[color:var(--color-foreground)]",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            <LocateFixed className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Live status line */}
      <p
        className="mt-2 min-h-[1.25rem] px-1 text-xs text-[color:var(--color-muted)]"
        aria-live="polite"
      >
        {isLocating ? (
          "Finding your location…"
        ) : isSearching ? (
          "Searching…"
        ) : showResults && fuzzyHint ? (
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-[color:var(--color-accent)]" aria-hidden />
            Did you mean{" "}
            <span className="font-semibold text-[color:var(--color-foreground)]">
              {fuzzyHint}
            </span>
            ? · {results.length} results
          </span>
        ) : showResults ? (
          `${results.length} ${results.length === 1 ? "result" : "results"}`
        ) : (
          "Press Enter to open the top result."
        )}
      </p>

      {/* Results */}
      {showResults && (
        <div className={cx("mt-4", isVirtualKeyboardOpen && "pb-[50vh]")}>
          <div className="mb-3 flex flex-wrap gap-2 px-1">
            <Chip
              size="sm"
              selected={filter === "megacity"}
              onClick={() => setFilter(filter === "megacity" ? null : "megacity")}
            >
              Megacities
            </Chip>
            <Chip
              size="sm"
              selected={filter === "capital"}
              onClick={() => setFilter(filter === "capital" ? null : "capital")}
            >
              Capitals
            </Chip>
          </div>

          <ul
            id={resultsListId}
            role="listbox"
            aria-label="City search results"
            className={cx(
              "divide-y divide-[color:var(--color-line)] overflow-hidden rounded-[var(--radius-lg)]",
              "border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] shadow-[var(--shadow-md)]",
              isVirtualKeyboardOpen && "max-h-[40vh] overflow-y-auto",
            )}
          >
            {results.map((city, idx) => {
              const active = activeIndex === idx;
              return (
                <li
                  key={city.id}
                  id={`city-option-${city.id}`}
                  role="option"
                  aria-selected={active}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={cx(active && "bg-[color:var(--color-surface-muted)]")}
                >
                  <Link
                    href={`/cities/${city.id}?lat=${city.lat}&lng=${city.lng}`}
                    onClick={() => addRecentCity(city)}
                    className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={cx(
                          "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[var(--radius-md)] border transition-colors",
                          active
                            ? "border-[color:var(--color-accent)] bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent-strong)]"
                            : "border-[color:var(--color-line)] bg-[color:var(--color-surface-muted)] text-[color:var(--color-muted)]",
                        )}
                        aria-hidden="true"
                      >
                        <MapPin className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-base font-semibold text-[color:var(--color-foreground)]">
                          {highlight(city.city, query)}
                        </div>
                        <div className="truncate text-xs text-[color:var(--color-muted)]">
                          {city.country}
                          {city.admin_name ? ` · ${city.admin_name}` : ""}
                          {matchTypeLabel(city) ? ` · ${matchTypeLabel(city)}` : ""}
                        </div>
                      </div>
                    </div>
                    <ArrowRight
                      className={cx(
                        "h-4 w-4 flex-shrink-0 transition-colors",
                        active
                          ? "text-[color:var(--color-accent-strong)]"
                          : "text-[color:var(--color-muted-soft)]",
                      )}
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              );
            })}
            {results.length === 0 && !isSearching && (
              <li className="px-5 py-10 text-center" role="status" aria-live="polite">
                <p className="text-sm font-semibold text-[color:var(--color-foreground)]">
                  No matches for &ldquo;{query}&rdquo;
                </p>
                <p className="mt-1 text-sm text-[color:var(--color-muted)]">
                  Try searching for another city or country.
                </p>
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Discovery: recents / trending chips when empty */}
      {!showResults && (recentCities.length > 0 || topCities.length > 0) && (
        <div className="mt-8">
          <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--color-muted)]">
            {recentCities.length > 0 ? "Recent" : "Trending"}
          </h2>
          <ul className="flex flex-wrap gap-2 px-1" role="list">
            {(recentCities.length > 0 ? recentCities : topCities).map((city) => (
              <li key={`chip-${city.id}`}>
                <Link
                  href={`/cities/${city.id}?lat=${city.lat}&lng=${city.lng}`}
                  onClick={() => addRecentCity(city)}
                  className={cx(
                    "inline-flex min-h-[var(--touch-target-min)] items-center rounded-full border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)]",
                    "px-4 py-2 text-sm font-medium text-[color:var(--color-foreground)] transition-colors",
                    "hover:border-[color:var(--color-foreground)]",
                  )}
                >
                  {city.city}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

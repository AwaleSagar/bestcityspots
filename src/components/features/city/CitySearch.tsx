"use client";

import type { KeyboardEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { searchCities, City, CitySearchResult, findNearestCity } from "@/lib/cities";
import { formatPopulation } from "@/lib/format";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, ArrowRight, Activity, LocateFixed, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRecentSearches } from "@/hooks/useRecentSearches";
import { useDeviceType } from "@/hooks/useDeviceType";
import { useAnalytics } from "@/lib/useAnalytics";

interface CitySearchProps {
  topCities: City[];
}

const KEYBOARD_ANIMATION_DELAY = 300;
const DROPDOWN_MAX_HEIGHT = "40vh";

const PLACEHOLDER_HINTS = [
  "Where do you want to explore?",
  "Try 'NYC' or 'Bangkok'...",
  "Search 'beaches' or 'gastronomy'...",
  "Try 'Eiffel Tower' or 'Colosseum'...",
  "Search by city, country, or attraction...",
];

export default function CitySearch({ topCities }: CitySearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CitySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { trackAction } = useAnalytics();
  const hasTrackedSearch = useRef(false);

  const { recentCities, addRecentCity } = useRecentSearches();
  const { isMobile, isTablet, isVirtualKeyboardOpen } = useDeviceType();
  const isTouchDevice = isMobile || isTablet;

  // Rotate placeholder hints
  useEffect(() => {
    if (searchQuery) return;
    const interval = setInterval(() => {
      setPlaceholderIdx((prev) => (prev + 1) % PLACEHOLDER_HINTS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [searchQuery]);

  const matchTypeLabel = useCallback((r: CitySearchResult) => {
    if (r.match_type === "fuzzy") return "Similar match";
    if (r.match_type === "alias") return "Also known as";
    return null;
  }, []);

  // Scroll search container into view when virtual keyboard opens on touch devices
  useEffect(() => {
    if (!isVirtualKeyboardOpen || !isTouchDevice) return;
    const timeout = setTimeout(() => {
      containerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }, KEYBOARD_ANIMATION_DELAY);
    return () => clearTimeout(timeout);
  }, [isVirtualKeyboardOpen, isTouchDevice]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setIsSearching(true);
        let results = await searchCities(searchQuery, 15, controller.signal);

        if (activeFilter === "megacity") {
          results = results.filter(c => c.population > 5000000);
        } else if (activeFilter === "capital") {
          results = results.filter(c => c.capital === "primary");
        }

        if (controller.signal.aborted) return;
        setSearchResults(results.slice(0, 10));
        setActiveIndex(-1);
        setIsSearching(false);

        if (!hasTrackedSearch.current && results.length > 0) {
          trackAction("search");
          hasTrackedSearch.current = true;
        }
      } else {
        controller.abort();
        setSearchResults([]);
        setActiveIndex(-1);
        setIsSearching(false);
        hasTrackedSearch.current = false;
      }
    }, 200);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [searchQuery, activeFilter, trackAction]);

  const shouldShowResults = searchQuery.trim().length >= 2;

  const topFuzzyHint = useMemo(() => {
    if (!shouldShowResults || searchResults.length === 0) return null;
    const first = searchResults[0];
    if (first.match_type === "fuzzy" || first.match_type === "alias") {
      return first.city;
    }
    return null;
  }, [shouldShowResults, searchResults]);

  const highlightMatch = useMemo(() => {
    const highlightFn = (text: string, query: string) => {
      if (!query) return text;
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const parts = text.split(new RegExp(`(${escaped})`, "gi"));
      return (
        <span>
          {parts.map((part, i) =>
            part.toLowerCase() === query.toLowerCase() ? (
              <mark
                key={i}
                className="rounded-sm bg-accent-soft px-0.5 font-bold text-accent-strong shadow-sm"
              >
                {part}
              </mark>
            ) : (
              <span key={i}>{part}</span>
            )
          )}
        </span>
      );
    };
    return highlightFn;
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => {
        if (searchResults.length === 0) return -1;
        return prev >= searchResults.length - 1 ? 0 : prev + 1;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => {
        if (searchResults.length === 0) return -1;
        return prev <= 0 ? searchResults.length - 1 : prev - 1;
      });
    } else if (e.key === "Enter") {
      const selectedCity = activeIndex >= 0 ? searchResults.at(activeIndex) : undefined;
      if (selectedCity) {
        router.push(`/cities/${selectedCity.id}`);
      } else if (searchResults.length > 0) {
        const firstCity = searchResults.at(0);
        if (firstCity) router.push(`/cities/${firstCity.id}`);
      }
    } else if (e.key === "Escape") {
      setSearchQuery("");
      setSearchResults([]);
      setActiveIndex(-1);
    }
  };

  const handleLocate = () => {
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
            console.warn("Unable to find nearest city for current location");
            setIsLocating(false);
            return;
          }
          addRecentCity(nearest);
          router.push(`/cities/${nearest.id}?lat=${latitude}&lng=${longitude}`);
        } catch (error) {
          console.warn("Unable to resolve current location", error);
          setIsLocating(false); // Make sure to reset state on error
        }
      },
      (error) => {
        console.warn("Geolocation permission denied or error", error);
        setIsLocating(false);
      }
    );
  };

  const resultsListId = "city-search-results";
  const activeCity = activeIndex >= 0 ? searchResults.at(activeIndex) : undefined;
  const activeOptionId = activeCity ? `city-option-${activeCity.id}` : undefined;

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className="relative scroll-mt-20"
    >
      {/* Accessibility - Proper labels */}
      <label htmlFor="city-search" className="sr-only">
        Search for a city
      </label>

      <div className="group relative">
        <Search className="absolute top-1/2 left-4 h-4.5 w-4.5 -translate-y-1/2 text-muted transition-all duration-300 group-focus-within:text-accent md:left-6 md:h-5 md:w-5" />
        <input
          id="city-search"
          ref={inputRef}
          type="text"
          autoComplete="off"
          value={searchQuery}
          onChange={(e) => {
            const val = e.target.value.replace(/[^a-zA-Z0-9\s-]/g, "");
            if (val.length <= 100) setSearchQuery(val);
          }}
          onKeyDown={handleKeyDown}
          placeholder={PLACEHOLDER_HINTS.at(placeholderIdx) ?? PLACEHOLDER_HINTS[0]}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={shouldShowResults}
          aria-controls={resultsListId}
          aria-activedescendant={activeOptionId}
          className="liquid-glass w-full rounded-[1.25rem] border border-line bg-background/30 py-3.5 pl-12 pr-14 text-sm font-medium text-foreground shadow-lg transition-all duration-300 outline-none hover:border-accent/18 focus:border-accent/28 focus:ring-4 focus:ring-accent/10 focus:shadow-xl placeholder:text-muted md:rounded-[1.5rem] md:py-5 md:pl-16 md:pr-18 md:text-lg"
        />

        {/* Principle 4: Contrast - Loading indicator */}
        <div className="absolute top-1/2 right-4 md:right-5 -translate-y-1/2 flex items-center gap-2">
          {(isSearching || isLocating) && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="h-7 w-7 rounded-full border-2 border-accent/10 border-t-accent"
            />
          )}
          <button
            type="button"
            onClick={handleLocate}
            disabled={isLocating}
            aria-label="Use current location"
            className={`flex h-10 w-10 items-center justify-center rounded-full border border-line bg-background/35 text-muted transition-colors duration-100 hover:border-accent/25 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 ${isLocating ? "animate-pulse border-accent/30 text-accent" : ""}`}
          >
            <LocateFixed className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 px-1 sm:px-2">
        <div className="flex gap-2">
          {[
            { id: "megacity", label: "Megacities" },
            { id: "capital", label: "Capitals" },
          ].map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setActiveFilter(activeFilter === filter.id ? null : filter.id)}
              className={`touch-target min-h-[var(--touch-target-min)] rounded-full border px-4 py-2 text-xs font-semibold tracking-[0.14em] uppercase transition-all duration-200 ${activeFilter === filter.id
                ? "border-accent/24 bg-accent-soft text-accent-strong"
                : "border-line bg-background/25 text-muted hover:border-accent/16 hover:text-foreground"
                }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="text-xs font-medium tracking-wide">
          <div className="text-foreground/30" aria-live="polite">
            {isLocating ? (
              <span className="animate-pulse text-accent">Finding your location...</span>
            ) : isSearching ? (
              <span className="animate-pulse text-accent">Searching...</span>
            ) : shouldShowResults && topFuzzyHint ? (
              <span className="flex items-center gap-1.5 text-muted">
                <Sparkles className="h-3 w-3 text-accent" />
                Did you mean <span className="font-bold text-accent">{topFuzzyHint}</span>?
                <span className="opacity-40 ml-1">·</span>
                <span className="opacity-60">{searchResults.length} results</span>
              </span>
            ) : shouldShowResults ? (
              <span className="text-muted">{searchResults.length} results</span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Progressive Disclosure - Show trending/recent when empty */}
      <AnimatePresence mode="wait">
        {!shouldShowResults && (
          <motion.div
            key="discovery"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-10 space-y-10 overflow-hidden"
          >
            {recentCities.length > 0 && (
              <div>
                <h2 className="mb-4 px-1 text-xs font-bold tracking-wider text-foreground/30 uppercase flex items-center gap-2">
                  <Activity className="h-3 w-3" /> Recent Searches
                </h2>
                <div className="flex flex-wrap gap-3">
                  {recentCities.map((city) => (
                    <Link
                      key={`recent-${city.id}`}
                      href={`/cities/${city.id}?lat=${city.lat}&lng=${city.lng}`}
                      onClick={() => addRecentCity(city)}
                      className="liquid-glass inline-block rounded-2xl border border-line bg-background/30 px-5 py-2.5 text-sm font-semibold text-muted transition-all duration-200 hover:border-accent/18 hover:bg-accent-soft/70 hover:text-foreground active:scale-95"
                    >
                      {city.city}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {topCities.length > 0 && (
              <div>
                <h2 className="mb-4 px-1 text-xs font-bold tracking-wider text-foreground/30 uppercase">
                  Trending Destinations
                </h2>
                <div className="flex flex-wrap gap-3">
                  {topCities.map((city, idx) => (
                    <motion.div
                      key={city.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.04 }}
                    >
                      <Link
                        href={`/cities/${city.id}?lat=${city.lat}&lng=${city.lng}`}
                        onClick={() => addRecentCity(city)}
                        className="liquid-glass inline-block rounded-2xl border border-line bg-background/30 px-5 py-2.5 text-sm font-semibold text-muted transition-all duration-200 hover:border-accent/18 hover:bg-accent-soft/70 hover:text-foreground active:scale-95"
                      >
                        {city.city}
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Results directly below input */}
        {shouldShowResults && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className={`mt-6 space-y-4 ${isVirtualKeyboardOpen ? "pb-[50vh]" : ""}`}
            style={{
              maxHeight: isVirtualKeyboardOpen ? DROPDOWN_MAX_HEIGHT : "none",
            }}
          >
            <ul
              id={resultsListId}
              role="listbox"
              aria-label="City search results"
              className={`glass-dropdown divide-y divide-line overflow-hidden rounded-[1.25rem] shadow-xl md:rounded-[1.5rem] ${isVirtualKeyboardOpen ? "max-h-[40vh] overflow-y-auto" : ""}`}
            >
              {searchResults.map((city, idx) => (
                <motion.li
                  key={city.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className={`group/item cursor-pointer transition-all duration-200 ${activeIndex === idx ? "bg-accent-soft/80" : "hover:bg-background/40"
                    }`}
                  role="option"
                  aria-selected={activeIndex === idx}
                  id={`city-option-${city.id}`}
                  onMouseEnter={() => setActiveIndex(idx)}
                >
                  <Link
                    href={`/cities/${city.id}?lat=${city.lat}&lng=${city.lng}`}
                    onClick={() => addRecentCity(city)}
                    className="flex w-full items-center justify-between gap-4 px-5 md:px-8 py-4 md:py-5"
                  >
                    <div className="flex min-w-0 items-center gap-3.5 md:gap-5">
                      <div
                        className={`flex h-11 w-11 md:h-12 md:w-12 flex-shrink-0 items-center justify-center rounded-xl border transition-all duration-200 ${activeIndex === idx
                          ? "border-accent/25 bg-accent-soft shadow-md"
                          : "border-line bg-background/30 group-hover/item:border-accent/16 group-hover/item:bg-accent-soft/60"
                          }`}
                      >
                        <MapPin
                          className={`h-4.5 w-4.5 md:h-5 md:w-5 transition-colors duration-200 ${activeIndex === idx
                            ? "text-accent"
                            : "text-muted group-hover/item:text-accent"
                            }`}
                        />
                      </div>
                      <div className="min-w-0">
                        <div
                          className={`truncate text-base md:text-lg font-bold tracking-tight transition-colors duration-200 flex items-center gap-2.5 ${activeIndex === idx
                            ? "text-foreground"
                            : "text-muted-strong group-hover/item:text-foreground"
                            }`}
                        >
                          {highlightMatch(city.city, searchQuery)}
                          {city.capital === "primary" && (
                            <span className="badge-featured rounded-md px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-bold">
                              Capital
                            </span>
                          )}
                          {city.population > 5000000 && (
                            <span className="badge-top-rated rounded-md px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-bold">
                              Megacity
                            </span>
                          )}
                        </div>
                        <div
                          className={`mt-0.5 text-xs font-medium tracking-wide transition-colors duration-200 flex items-center gap-1.5 ${activeIndex === idx
                            ? "text-accent"
                            : "text-muted group-hover/item:text-muted-strong"
                            }`}
                        >
                          <span>{city.country}</span>
                          {city.admin_name && (
                            <>
                              <span className="opacity-40">·</span>
                              <span className="opacity-80">{city.admin_name}</span>
                            </>
                          )}
                          {matchTypeLabel(city) && (
                            <>
                              <span className="opacity-40">·</span>
                              <span className="italic opacity-70">{matchTypeLabel(city)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-4">
                      <div className="hidden text-right sm:block">
                        <div
                          className={`text-sm font-semibold transition-colors duration-200 ${activeIndex === idx
                            ? "text-muted"
                            : "text-muted/60 group-hover/item:text-muted"
                            }`}
                        >
                          {formatPopulation(city.population)}
                        </div>
                      </div>
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full border transition-all duration-200 ${activeIndex === idx
                          ? "translate-x-0 border-accent/25 bg-accent-soft opacity-100"
                          : "-translate-x-3 border-line opacity-0 group-hover/item:translate-x-0 group-hover/item:opacity-100"
                          }`}
                      >
                        <ArrowRight className="h-4 w-4 text-accent" />
                      </div>
                    </div>
                  </Link>
                </motion.li>
              ))}
              {searchResults.length === 0 && !isSearching && (
                <li className="px-8 py-14 text-center" role="status" aria-live="polite">
                  <div className="mb-2 text-sm font-semibold text-foreground/50">
                    No matches for &quot;{searchQuery}&quot;
                  </div>
                  <div className="text-sm text-foreground/30">
                    Try searching for another city or country.
                  </div>
                </li>
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

"use client";

import type { KeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { searchCities, City, findNearestCity } from "@/lib/cities";
import { formatPopulation } from "@/lib/format";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, ArrowRight, Activity, LocateFixed } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRecentSearches } from "@/hooks/useRecentSearches";
import { useAnalytics } from "@/lib/useAnalytics";

interface CitySearchProps {
  topCities: City[];
}

export default function CitySearch({ topCities }: CitySearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<City[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { trackAction } = useAnalytics();
  const hasTrackedSearch = useRef(false);

  const { recentCities, addRecentCity } = useRecentSearches();

  // Handle search with faster debounce
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setIsSearching(true);
        let results = await searchCities(searchQuery, 15, controller.signal);

        // Apply frontend filters if active
        if (activeFilter === "megacity") {
          results = results.filter(c => c.population > 5000000);
        } else if (activeFilter === "capital") {
          results = results.filter(c => c.capital === "primary");
        }

        if (controller.signal.aborted) return;
        setSearchResults(results.slice(0, 10));
        setActiveIndex(-1);
        setIsSearching(false);

        // Track search action (once per search session)
        if (!hasTrackedSearch.current && results.length > 0) {
          trackAction("search");
          hasTrackedSearch.current = true;
        }
      } else {
        controller.abort();
        setSearchResults([]);
        setActiveIndex(-1);
        setIsSearching(false);
        hasTrackedSearch.current = false; // Reset for next search
      }
    }, 200);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [searchQuery, activeFilter, trackAction]);

  const shouldShowResults = searchQuery.trim().length >= 2;

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
                className="rounded-sm bg-purple-500/20 px-0.5 font-bold text-purple-400 shadow-[0_0_15px_rgba(147,51,234,0.2)]"
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
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className="relative"
    >
      {/* Principle 5: Accessibility - Proper labels */}
      <label htmlFor="city-search" className="sr-only">
        Search for a city
      </label>

      <div className="group relative">
        <Search className="absolute top-1/2 left-6 md:left-8 h-5 w-5 md:h-6 md:w-6 -translate-y-1/2 text-gray-500 transition-all duration-500 group-focus-within:text-purple-400" />
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
          placeholder="Search by city or country..."
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={shouldShowResults}
          aria-controls={resultsListId}
          aria-activedescendant={activeOptionId}
          className="liquid-glass w-full rounded-[2rem] md:rounded-[2.5rem] border border-foreground/10 bg-foreground/[0.03] py-5 md:py-8 pr-16 md:pr-20 pl-16 md:pl-20 text-lg md:text-2xl shadow-2xl dark:shadow-black shadow-foreground/5 transition-all duration-700 outline-none hover:bg-foreground/[0.05] focus:border-purple-500/40 focus:ring-4 focus:ring-purple-500/10"
        />

        {/* Principle 4: Contrast - Loading indicator */}
        <div className="absolute top-1/2 right-6 md:right-8 -translate-y-1/2 flex items-center gap-2">
          {(isSearching || isLocating) && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="h-7 w-7 rounded-full border-2 border-purple-500/10 border-t-purple-500"
            />
          )}
          <button
            type="button"
            onClick={handleLocate}
            disabled={isLocating}
            aria-label="Use current location"
            className={`flex h-10 w-10 items-center justify-center rounded-full border border-foreground/10 bg-foreground/[0.03] text-foreground/50 transition-colors duration-100 hover:border-purple-500/30 hover:text-purple-400 disabled:cursor-not-allowed disabled:opacity-40 ${isLocating ? "animate-pulse text-purple-400 border-purple-500/30" : ""}`}
          >
            <LocateFixed className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 px-2 sm:px-4">
        <div className="flex gap-2">
          {[
            { id: "megacity", label: "Megacities" },
            { id: "capital", label: "Capitals" },
          ].map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setActiveFilter(activeFilter === filter.id ? null : filter.id)}
              className={`touch-target rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-wider transition-colors duration-100 border min-h-[var(--touch-target-min)] ${activeFilter === filter.id
                  ? "bg-purple-500/10 border-purple-500/40 text-purple-400"
                  : "bg-foreground/[0.03] border-foreground/5 text-foreground/40 hover:text-foreground/60"
                }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="text-[11px] font-black tracking-[0.3em] uppercase">
          <div className="text-foreground/40" aria-live="polite">
            {isLocating ? (
              <span className="animate-pulse text-purple-400/80">Locating...</span>
            ) : isSearching ? (
              <span className="animate-pulse text-purple-400/80">Analyzing Data...</span>
            ) : shouldShowResults ? (
              <span className="text-foreground/60">{searchResults.length} matches</span>
            ) : (
              "System Idle"
            )}
          </div>
        </div>
      </div>

      {/* Principle 2: Progressive Disclosure - Show trending/recent when empty */}
      <AnimatePresence mode="wait">
        {!shouldShowResults && (
          <motion.div
            key="discovery"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-8 space-y-8 overflow-hidden"
          >
            {recentCities.length > 0 && (
              <div>
                <h2 className="mb-4 px-2 text-xs font-bold tracking-[0.2em] text-gray-500 uppercase flex items-center gap-2">
                  <Activity className="h-3 w-3" /> Recent Searches
                </h2>
                <div className="flex flex-wrap gap-3">
                  {recentCities.map((city) => (
                    <Link
                      key={`recent-${city.id}`}
                      href={`/cities/${city.id}?lat=${city.lat}&lng=${city.lng}`}
                      onClick={() => addRecentCity(city)}
                      className="liquid-glass inline-block rounded-2xl border border-foreground/5 bg-foreground/[0.03] px-5 py-2.5 text-xs font-bold text-foreground/60 shadow-lg transition-all hover:scale-105 hover:border-foreground/20 hover:bg-foreground/10 hover:text-foreground active:scale-95"
                    >
                      {city.city}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {topCities.length > 0 && (
              <div>
                <h2 className="mb-4 px-2 text-xs font-bold tracking-[0.2em] text-gray-500 uppercase">
                  Trending Destinations
                </h2>
                <div className="flex flex-wrap gap-3">
                  {topCities.map((city, idx) => (
                    <motion.div
                      key={city.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Link
                        href={`/cities/${city.id}?lat=${city.lat}&lng=${city.lng}`}
                        onClick={() => addRecentCity(city)}
                        className="liquid-glass inline-block rounded-2xl border border-foreground/5 bg-foreground/[0.03] px-5 py-2.5 text-xs font-bold text-foreground/60 shadow-lg transition-all hover:scale-105 hover:border-foreground/20 hover:bg-foreground/10 hover:text-foreground active:scale-95"
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

        {/* Principle 6: Proximity - Results directly below input */}
        {shouldShowResults && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-8 space-y-4"
          >
            <ul
              id={resultsListId}
              role="listbox"
              aria-label="City search results"
              className="glass-dropdown shadow-3xl divide-y divide-foreground/5 overflow-hidden rounded-[2rem] md:rounded-[2.5rem]"
            >
              {searchResults.map((city, idx) => (
                <motion.li
                  key={city.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`group/item cursor-pointer transition-colors duration-100 ${activeIndex === idx ? "bg-purple-500/15" : "hover:bg-foreground/5"
                    }`}
                  role="option"
                  aria-selected={activeIndex === idx}
                  id={`city-option-${city.id}`}
                  onMouseEnter={() => setActiveIndex(idx)}
                >
                  <Link
                    href={`/cities/${city.id}?lat=${city.lat}&lng=${city.lng}`}
                    onClick={() => addRecentCity(city)}
                    className="flex w-full items-center justify-between gap-4 px-6 md:px-10 py-4 md:py-6"
                  >
                    <div className="flex min-w-0 items-center gap-4 md:gap-6">
                      <div
                        className={`flex h-12 w-12 md:h-14 md:w-14 flex-shrink-0 items-center justify-center rounded-xl md:rounded-2xl border border-foreground/5 bg-foreground/[0.02] transition-all duration-100 ${activeIndex === idx
                            ? "scale-110 border-purple-500/40 bg-purple-500/20 shadow-[0_0_20px_rgba(147,51,234,0.2)]"
                            : "group-hover/item:scale-105 group-hover/item:bg-foreground/5"
                          }`}
                      >
                        <MapPin
                          className={`h-5 w-5 md:h-6 md:w-6 transition-colors duration-100 ${activeIndex === idx
                              ? "text-purple-400"
                              : "text-foreground/20 group-hover/item:text-purple-400/60"
                            }`}
                        />
                      </div>
                      <div className="min-w-0">
                        <div
                          className={`truncate text-xl md:text-2xl font-black tracking-tight transition-colors duration-500 flex items-center gap-3 ${activeIndex === idx
                              ? "text-foreground"
                              : "text-foreground/80 group-hover/item:text-foreground"
                            }`}
                        >
                          {highlightMatch(city.city, searchQuery)}
                          {city.capital === "primary" && (
                            <span className="rounded-md bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 text-[8px] uppercase tracking-widest text-amber-500 font-black">
                              Capital
                            </span>
                          )}
                          {city.population > 5000000 && (
                            <span className="rounded-md bg-teal-500/10 border border-teal-500/20 px-1.5 py-0.5 text-[8px] uppercase tracking-widest text-teal-400 font-black">
                              Megacity
                            </span>
                          )}
                        </div>
                        <div
                          className={`text-[10px] md:text-[11px] font-black tracking-[0.2em] uppercase transition-colors duration-100 flex items-center gap-2 ${activeIndex === idx
                              ? "text-purple-400/80"
                              : "text-foreground/40 group-hover/item:text-foreground/60"
                            }`}
                        >
                          <span>{city.country}</span>
                          {city.admin_name && (
                            <>
                              <span className="opacity-30">•</span>
                              <span className="opacity-80">{city.admin_name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-6">
                      <div className="hidden text-right sm:block">
                        <div
                          className={`text-xl font-black transition-colors duration-100 ${activeIndex === idx
                              ? "text-purple-500/50"
                              : "text-foreground/[0.1] group-hover/item:text-foreground/[0.2]"
                            }`}
                        >
                          {formatPopulation(city.population)}
                        </div>
                      </div>
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-100 ${activeIndex === idx
                            ? "translate-x-0 border-purple-500/50 bg-purple-500/20 opacity-100"
                            : "-translate-x-4 border-foreground/5 opacity-0 group-hover/item:translate-x-0 group-hover/item:opacity-100"
                          }`}
                      >
                        <ArrowRight className="h-5 w-5 text-purple-400" />
                      </div>
                    </div>
                  </Link>
                </motion.li>
              ))}
              {searchResults.length === 0 && !isSearching && (
                <li className="px-8 py-12 text-center" role="status" aria-live="polite">
                  <div className="mb-1 font-medium text-gray-400">
                    No matches for &quot;{searchQuery}&quot;
                  </div>
                  <div className="text-sm text-gray-600">
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

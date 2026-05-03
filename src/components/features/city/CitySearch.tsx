"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { searchCities, City, CitySearchResult, findNearestCity } from "@/lib/cities";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
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
const transitionEase = [0.22, 1, 0.36, 1] as const;

const PLACEHOLDER_HINTS = [
  "Where do you want to explore?",
  "Try 'NYC' or 'Bangkok'...",
  "Search 'beaches' or 'gastronomy'...",
  "Try 'Eiffel Tower' or 'Colosseum'...",
  "Search by city, country, or attraction...",
];

// Module-scope so identity is stable across renders — no per-instance
// useMemo allocation needed.
function highlightMatchFn(text: string, query: string): ReactNode {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  const lowered = query.toLowerCase();
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === lowered ? (
          <mark
            key={i}
            className="bg-accent-soft text-accent-strong rounded-sm px-0.5 font-bold shadow-sm"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

function CitySearch({ topCities }: CitySearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [rawSearchResults, setRawSearchResults] = useState<CitySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastInteractionRef = useRef<"keyboard" | "pointer">("pointer");
  const resultsListId = useId();
  const router = useRouter();
  const { trackAction } = useAnalytics();
  const hasTrackedSearch = useRef(false);

  const { recentCities, addRecentCity } = useRecentSearches();
  const { isMobile, isTablet, isVirtualKeyboardOpen } = useDeviceType();
  const isTouchDevice = isMobile || isTablet;
  const shouldReduceMotion = useReducedMotion();
  const timeOfDay = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 11) return "Morning planning";
    if (hour < 17) return "Afternoon comparison";
    if (hour < 21) return "Evening shortlist";
    return "Late-night dreaming";
  }, []);
  const adaptiveHints = useMemo(
    () => [
      timeOfDay,
      recentCities.length > 0 ? "Recent cities ready" : "No account needed",
      isTouchDevice ? "Touch-friendly results" : "Keyboard-ready search",
    ],
    [isTouchDevice, recentCities.length, timeOfDay]
  );

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
        const results = await searchCities(searchQuery, 15, controller.signal);

        if (controller.signal.aborted) return;
        setRawSearchResults(results);
        setActiveIndex(-1);
        setIsSearching(false);

        if (!hasTrackedSearch.current && results.length > 0) {
          trackAction("search");
          hasTrackedSearch.current = true;
        }
      } else {
        controller.abort();
        setRawSearchResults([]);
        setActiveIndex(-1);
        setIsSearching(false);
        hasTrackedSearch.current = false;
      }
    }, 200);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [searchQuery, trackAction]);

  // Apply filter client-side over the already-fetched results so toggling
  // a filter chip does not trigger a new network request.
  const searchResults = useMemo(() => {
    let filtered = rawSearchResults;
    if (activeFilter === "megacity") {
      filtered = filtered.filter((c) => c.population > 5000000);
    } else if (activeFilter === "capital") {
      filtered = filtered.filter((c) => c.capital === "primary");
    }
    return filtered.slice(0, 10);
  }, [rawSearchResults, activeFilter]);

  const shouldShowResults = searchQuery.trim().length >= 2;

  const topFuzzyHint = useMemo(() => {
    if (!shouldShowResults || searchResults.length === 0) return null;
    const first = searchResults[0];
    if (first.match_type === "fuzzy" || first.match_type === "alias") {
      return first.city;
    }
    return null;
  }, [shouldShowResults, searchResults]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      lastInteractionRef.current = "keyboard";
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
        setRawSearchResults([]);
        setActiveIndex(-1);
      }
    },
    [activeIndex, router, searchResults]
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
  }, [isLocating, addRecentCity, router]);

  const activeCity = activeIndex >= 0 ? searchResults.at(activeIndex) : undefined;
  const activeOptionId = activeCity ? `city-option-${activeCity.id}` : undefined;

  return (
    <motion.div
      ref={containerRef}
      initial={shouldReduceMotion ? false : { opacity: 0, y: 30 }}
      animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.2, ease: transitionEase }}
      className="relative scroll-mt-20"
    >
      {/* Accessibility - Proper labels */}
      <label htmlFor="city-search" className="sr-only">
        Search for a city
      </label>

      <motion.div
        layout
        transition={{ duration: shouldReduceMotion ? 0 : 0.38, ease: transitionEase }}
        className="search-shell group relative"
      >
        <motion.div
          className="search-shell-glow"
          aria-hidden
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  opacity: [0.22, 0.45, 0.22],
                  scale: [1, 1.03, 1],
                }
          }
          transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <Search className="text-muted group-focus-within:text-accent absolute top-1/2 left-4 h-4.5 w-4.5 -translate-y-1/2 transition-all duration-300 md:left-6 md:h-5 md:w-5" />
        <input
          id="city-search"
          ref={inputRef}
          type="text"
          autoComplete="off"
          value={searchQuery}
          onChange={(e) => {
            const val = e.target.value.replace(/[<>{}|\\^`[\]]/g, "");
            if (val.length <= 100) setSearchQuery(val);
          }}
          onKeyDown={handleKeyDown}
          placeholder={PLACEHOLDER_HINTS.at(placeholderIdx) ?? PLACEHOLDER_HINTS[0]}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={shouldShowResults}
          aria-controls={resultsListId}
          aria-activedescendant={activeOptionId}
          className="border-line bg-surface/88 text-foreground hover:border-accent/18 focus:border-accent/28 w-full rounded-[1.2rem] border py-4 pr-14 pl-12 text-sm font-semibold shadow-sm transition-all duration-300 outline-none sm:rounded-[1.4rem] md:rounded-[1.7rem] md:py-5 md:pr-18 md:pl-16 md:text-lg"
        />

        {/* Principle 4: Contrast - Loading indicator */}
        <div className="absolute top-1/2 right-4 flex -translate-y-1/2 items-center gap-2 md:right-5">
          {(isSearching || isLocating) && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="border-accent/10 border-t-accent h-7 w-7 rounded-full border-2"
            />
          )}
          <button
            type="button"
            onClick={handleLocate}
            disabled={isLocating}
            aria-label="Use current location"
            className={`border-line bg-surface/88 text-muted hover:border-accent/25 hover:text-accent flex h-10 w-10 items-center justify-center rounded-full border transition-colors duration-100 disabled:cursor-not-allowed disabled:opacity-40 ${isLocating ? "border-accent/30 text-accent animate-pulse" : ""}`}
          >
            <LocateFixed className="h-5 w-5" />
          </button>
        </div>
      </motion.div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 px-1 sm:px-2">
        <div className="text-xs font-medium tracking-wide">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={
                isLocating
                  ? "locating"
                  : isSearching
                    ? "searching"
                    : shouldShowResults && topFuzzyHint
                      ? "hint"
                      : shouldShowResults
                        ? "count"
                        : "idle"
              }
              initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
              animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.24, ease: transitionEase }}
              className="text-foreground/30 min-h-[1rem]"
              aria-live="polite"
            >
              {isLocating ? (
                <span className="text-accent">Finding your location...</span>
              ) : isSearching ? (
                <span className="text-accent">Searching...</span>
              ) : shouldShowResults && topFuzzyHint ? (
                <span className="text-muted flex items-center gap-1.5">
                  <Sparkles className="text-accent h-3 w-3" />
                  Did you mean <span className="text-accent font-bold">{topFuzzyHint}</span>?
                  <span className="ml-1 opacity-40">·</span>
                  <span className="opacity-60">{searchResults.length} results</span>
                </span>
              ) : shouldShowResults ? (
                <span className="text-muted">{searchResults.length} results</span>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 px-1 sm:px-2" aria-label="Adaptive search context">
        {adaptiveHints.map((hint) => (
          <span key={hint} className="source-chip">
            {hint}
          </span>
        ))}
      </div>

      {/* Progressive Disclosure - Show trending/recent when empty */}
      <AnimatePresence mode="wait">
        {!shouldShowResults && (
          <motion.div
            key="discovery"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0, y: 10 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.34, ease: transitionEase }}
            className="mt-10 space-y-10 overflow-hidden"
          >
            {recentCities.length > 0 ? (
              <div>
                <h2 className="text-foreground/30 mb-4 flex items-center gap-2 px-1 text-xs font-bold tracking-wider uppercase">
                  <Activity className="h-3 w-3" /> Recent Searches
                </h2>
                <div className="flex flex-wrap gap-3">
                  {recentCities.map((city, index) => (
                    <motion.div
                      key={`recent-${city.id}`}
                      initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                      animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                      transition={{
                        duration: shouldReduceMotion ? 0 : 0.36,
                        ease: transitionEase,
                        delay: shouldReduceMotion ? 0 : index * 0.04,
                      }}
                    >
                      <Link
                        href={`/cities/${city.id}?lat=${city.lat}&lng=${city.lng}`}
                        onClick={() => addRecentCity(city)}
                        className="border-line bg-surface/80 text-muted hover:border-accent/18 hover:bg-accent-soft/70 hover:text-foreground inline-block rounded-full border px-5 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-95"
                      >
                        {city.city}
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : topCities.length > 0 ? (
              <div>
                <h2 className="text-foreground/30 mb-4 px-1 text-xs font-bold tracking-wider uppercase">
                  Trending Destinations
                </h2>
                <div className="flex flex-wrap gap-3">
                  {topCities.map((city, idx) => (
                    <motion.div
                      key={city.id}
                      initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.96, y: 8 }}
                      animate={shouldReduceMotion ? undefined : { opacity: 1, scale: 1, y: 0 }}
                      transition={{
                        duration: shouldReduceMotion ? 0 : 0.36,
                        ease: transitionEase,
                        delay: shouldReduceMotion ? 0 : idx * 0.04,
                      }}
                    >
                      <Link
                        href={`/cities/${city.id}?lat=${city.lat}&lng=${city.lng}`}
                        onClick={() => addRecentCity(city)}
                        className="border-line bg-surface/80 text-muted hover:border-accent/18 hover:bg-accent-soft/70 hover:text-foreground inline-block rounded-full border px-5 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-95"
                      >
                        {city.city}
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : null}
          </motion.div>
        )}

        {/* Results directly below input */}
        {shouldShowResults && (
          <motion.div
            key="results"
            layout
            initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0, y: 8 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.3, ease: transitionEase }}
            className={`mt-6 space-y-4 ${isVirtualKeyboardOpen ? "pb-[50vh]" : ""}`}
            style={{
              maxHeight: isVirtualKeyboardOpen ? DROPDOWN_MAX_HEIGHT : "none",
            }}
          >
            <motion.div layout className="flex gap-2 px-1 sm:px-2">
              {[
                { id: "megacity", label: "Megacities" },
                { id: "capital", label: "Capitals" },
              ].map((filter) => (
                <motion.button
                  key={filter.id}
                  type="button"
                  layout
                  onClick={() => setActiveFilter(activeFilter === filter.id ? null : filter.id)}
                  whileHover={shouldReduceMotion ? undefined : { y: -1.5 }}
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                  transition={{ duration: 0.18, ease: transitionEase }}
                  className={`touch-target min-h-[var(--touch-target-min)] rounded-full border px-4 py-2 text-xs font-semibold tracking-[0.14em] uppercase transition-all duration-200 ${
                    activeFilter === filter.id
                      ? "border-accent/24 bg-accent-soft text-accent-strong"
                      : "border-line bg-surface/72 text-muted hover:border-accent/16 hover:text-foreground"
                  }`}
                >
                  {filter.label}
                </motion.button>
              ))}
            </motion.div>
            <motion.ul
              layout
              id={resultsListId}
              role="listbox"
              aria-label="City search results"
              className={`glass-dropdown divide-line divide-y overflow-hidden rounded-[1.2rem] shadow-xl sm:rounded-[1.4rem] md:rounded-[1.8rem] ${isVirtualKeyboardOpen ? "max-h-[40vh] overflow-y-auto" : ""}`}
            >
              {searchResults.map((city, idx) => (
                <motion.li
                  key={city.id}
                  initial={shouldReduceMotion ? false : { opacity: 0, x: -10 }}
                  animate={shouldReduceMotion ? undefined : { opacity: 1, x: 0 }}
                  transition={{
                    duration: shouldReduceMotion ? 0 : 0.32,
                    ease: transitionEase,
                    delay: shouldReduceMotion ? 0 : idx * 0.03,
                  }}
                  className={`group/item cursor-pointer transition-all duration-200 ${activeIndex === idx ? "bg-accent-soft/80" : "hover:bg-surface/72"}`}
                  role="option"
                  aria-selected={activeIndex === idx}
                  id={`city-option-${city.id}`}
                  onPointerMove={(event) => {
                    if (event.pointerType !== "mouse") return;
                    lastInteractionRef.current = "pointer";
                    setActiveIndex(idx);
                  }}
                >
                  <Link
                    href={`/cities/${city.id}?lat=${city.lat}&lng=${city.lng}`}
                    onClick={() => addRecentCity(city)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 md:px-8 md:py-5"
                  >
                    <div className="flex min-w-0 items-center gap-3.5 md:gap-5">
                      <div
                        className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border transition-all duration-200 md:h-12 md:w-12 ${
                          activeIndex === idx
                            ? "border-accent/25 bg-accent-soft shadow-md"
                            : "border-line bg-surface/72 group-hover/item:border-accent/16 group-hover/item:bg-accent-soft/60"
                        }`}
                      >
                        <MapPin
                          className={`h-4.5 w-4.5 transition-colors duration-200 md:h-5 md:w-5 ${
                            activeIndex === idx
                              ? "text-accent"
                              : "text-muted group-hover/item:text-accent"
                          }`}
                        />
                      </div>
                      <div className="min-w-0">
                        <div
                          className={`flex items-center gap-2.5 truncate text-base font-bold tracking-tight transition-colors duration-200 md:text-lg ${
                            activeIndex === idx
                              ? "text-foreground"
                              : "text-muted-strong group-hover/item:text-foreground"
                          }`}
                        >
                          {highlightMatchFn(city.city, searchQuery)}
                        </div>
                        <div
                          className={`mt-0.5 flex items-center gap-1.5 text-xs font-medium tracking-wide transition-colors duration-200 ${
                            activeIndex === idx
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
                          {(() => {
                            const label = matchTypeLabel(city);
                            return label ? (
                              <>
                                <span className="opacity-40">·</span>
                                <span className="italic opacity-70">{label}</span>
                              </>
                            ) : null;
                          })()}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-4">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full border transition-all duration-200 ${
                          activeIndex === idx
                            ? "border-accent/25 bg-accent-soft translate-x-0 opacity-100"
                            : "border-line -translate-x-3 opacity-0 group-hover/item:translate-x-0 group-hover/item:opacity-100"
                        }`}
                      >
                        <ArrowRight className="text-accent h-4 w-4" />
                      </div>
                    </div>
                  </Link>
                </motion.li>
              ))}
              {searchResults.length === 0 && !isSearching && (
                <li className="px-8 py-14 text-center" aria-live="polite">
                  <div className="text-foreground/50 mb-2 text-sm font-semibold">
                    No matches for &quot;{searchQuery}&quot;
                  </div>
                  <div className="text-foreground/30 text-sm">
                    Try searching for another city or country.
                  </div>
                </li>
              )}
            </motion.ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// React.memo guards against parent re-renders re-mounting the (heavy) search
// surface when only sibling props change.
export default memo(CitySearch);
"use client";

import type { ReactNode } from "react";
import { memo, useCallback, useId, useRef } from "react";
import { cityHref, City, CitySearchResult } from "@/lib/cities";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Search, MapPin, ArrowRight, Activity, LocateFixed, Sparkles } from "lucide-react";
import Link from "next/link";
import { useCitySearchController } from "./useCitySearchController";
import {
  CITY_SEARCH_FILTERS,
  DROPDOWN_MAX_HEIGHT,
  PLACEHOLDER_HINTS,
  sanitizeSearchInput,
  transitionEase,
} from "./city-search-config";

interface CitySearchProps {
  topCities: City[];
}

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
  const containerRef = useRef<HTMLDivElement>(null);
  const resultsListId = useId();
  const shouldReduceMotion = useReducedMotion();
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    shouldShowResults,
    isSearching,
    isLocating,
    activeIndex,
    setActiveIndex,
    activeFilter,
    setActiveFilter,
    placeholderIdx,
    handleKeyDown,
    handleLocate,
    recentCities,
    addRecentCity,
    isVirtualKeyboardOpen,
    adaptiveHints,
    topFuzzyHint,
  } = useCitySearchController({ containerRef });

  const matchTypeLabel = useCallback((r: CitySearchResult) => {
    if (r.match_type === "fuzzy") return "Similar match";
    if (r.match_type === "alias") return "Also known as";
    return null;
  }, []);

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
          type="text"
          autoComplete="off"
          value={searchQuery}
          onChange={(e) => {
            const val = sanitizeSearchInput(e.target.value);
            if (val.length <= 100) setSearchQuery(val);
          }}
          onKeyDown={handleKeyDown}
          placeholder={PLACEHOLDER_HINTS.at(placeholderIdx) ?? PLACEHOLDER_HINTS[0]}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={shouldShowResults}
          aria-controls={resultsListId}
          aria-activedescendant={activeOptionId}
          className="border-line bg-surface/88 text-foreground hover:border-accent/18 focus:border-accent/28 w-full rounded-xl border py-4 pr-14 pl-12 text-sm font-semibold shadow-sm transition-all duration-300 outline-none sm:rounded-2xl md:rounded-3xl md:py-5 md:pr-18 md:pl-16 md:text-lg"
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
                        href={cityHref(city, { lat: city.lat, lng: city.lng })}
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
                        href={cityHref(city, { lat: city.lat, lng: city.lng })}
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
            initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0, y: 8 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.3, ease: transitionEase }}
            className={`mt-6 space-y-4 ${isVirtualKeyboardOpen ? "pb-[50vh]" : ""}`}
            style={{
              maxHeight: isVirtualKeyboardOpen ? DROPDOWN_MAX_HEIGHT : "none",
            }}
          >
            <motion.div className="flex gap-2 px-1 sm:px-2">
              {CITY_SEARCH_FILTERS.map((filter) => (
                <motion.button
                  key={filter.id}
                  type="button"
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
              id={resultsListId}
              role="listbox"
              aria-label="City search results"
              className={`glass-dropdown divide-line divide-y overflow-hidden rounded-xl shadow-xl sm:rounded-2xl md:rounded-3xl ${isVirtualKeyboardOpen ? "max-h-[40vh] overflow-y-auto" : ""}`}
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
                    setActiveIndex(idx);
                  }}
                >
                  <Link
                    href={cityHref(city, { lat: city.lat, lng: city.lng })}
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
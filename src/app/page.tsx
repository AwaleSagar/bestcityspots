"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { searchCities, City } from "@/lib/cities";
import { fetchTrendingDestinations } from "@/app/actions";
import { formatPopulation } from "@/lib/format";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<City[]>([]);
  const [topCities, setTopCities] = useState<City[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const loadTrending = async () => {
      const cities = await fetchTrendingDestinations();
      setTopCities(cities);
    };
    loadTrending();
  }, []);

  // Handle search with faster debounce
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setIsSearching(true);
        const results = await searchCities(searchQuery, 10, controller.signal);
        if (controller.signal.aborted) return;
        setSearchResults(results);
        setActiveIndex(-1); // Reset active index when results change
        setIsSearching(false);
      } else {
        controller.abort();
        setSearchResults([]);
        setActiveIndex(-1); // Reset active index when clearing results
        setIsSearching(false);
      }
    }, 200);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [searchQuery]);

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
                className="rounded-sm bg-blue-500/20 px-0.5 font-bold text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      router.push(`/cities/${searchResults[activeIndex].id}`);
    }
  };

  return (
    <main className="min-h-screen bg-transparent font-sans text-white">
      <div className="mx-auto max-w-2xl px-6 py-12">
        {/* Principle 1: Hierarchy - Clear Heading */}
        <motion.header
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6 text-center"
        >
          {/* Minimalist Tech Accent */}
          <div className="mb-8 flex items-center justify-center gap-4 opacity-40">
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-white" />
            <span className="text-[9px] font-black tracking-[0.6em] text-white uppercase">
              Atlas // Index 01
            </span>
            <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-white" />
          </div>

          <h1 className="relative mb-4 block py-2 md:py-4 overflow-visible">
            <span className="bg-gradient-to-b from-white via-white to-white/10 bg-clip-text text-5xl leading-[1.1] font-black tracking-tighter text-transparent md:text-8xl block pb-4">
              Best City <br /> Spots
            </span>
            {/* Liquid Glow Underlay */}
            <div className="absolute top-1/2 left-1/2 -z-10 h-64 w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/5 blur-[120px]" />
          </h1>

          <div className="mx-auto max-w-lg space-y-2">
            <p className="text-base md:text-xl leading-snug font-medium tracking-tight text-white/40">
              Exploring the world&apos;s most <span className="text-white/90 italic">vibrant</span> urban centers through a <span className="text-white/90">premium intelligence</span> lens.
            </p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
              <span className="text-[11px] font-black tracking-[0.2em] text-white/40 uppercase">
                Real-time Data Active
              </span>
            </div>
          </div>
        </motion.header>

        {/* Principle 7: Alignment - Centered search experience */}
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
            <Search className="absolute top-1/2 left-6 md:left-8 h-5 w-5 md:h-6 md:w-6 -translate-y-1/2 text-gray-500 transition-all duration-500 group-focus-within:text-blue-400" />
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
              className="liquid-glass w-full rounded-[2rem] md:rounded-[2.5rem] border border-white/10 bg-white/[0.03] py-5 md:py-8 pr-6 md:pr-8 pl-16 md:pl-20 text-lg md:text-2xl shadow-2xl shadow-black transition-all duration-700 outline-none hover:bg-white/[0.05] focus:border-blue-500/40 focus:ring-4 focus:ring-blue-500/10"
            />

            {/* Principle 4: Contrast - Loading indicator */}
            {isSearching && (
              <div className="absolute top-1/2 right-8 -translate-y-1/2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="h-8 w-8 rounded-full border-2 border-blue-500/10 border-t-blue-500"
                />
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-between px-4 text-[11px] font-black tracking-[0.3em] uppercase">
            <div className="text-white/40" aria-live="polite">
              {isSearching ? (
                <span className="animate-pulse text-blue-400/80">Analyzing Data...</span>
              ) : shouldShowResults ? (
                <span className="text-white/60">{searchResults.length} matches found</span>
              ) : (
                "System Idle"
              )}
            </div>
            {!shouldShowResults && (
              <div className="animate-pulse text-blue-500/50">Ready to explore</div>
            )}
          </div>

          {/* Principle 2: Progressive Disclosure - Show trending when empty */}
          <AnimatePresence mode="wait">
            {!shouldShowResults && topCities.length > 0 && (
              <motion.div
                key="trending"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-8 overflow-hidden"
              >
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
                        className="liquid-glass inline-block rounded-2xl border border-white/5 bg-white/[0.03] px-5 py-2.5 text-xs font-bold text-white/60 shadow-lg transition-all hover:scale-105 hover:border-white/20 hover:bg-white/10 hover:text-white active:scale-95"
                      >
                        {city.city}
                      </Link>
                    </motion.div>
                  ))}
                </div>
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
                <ul className="glass-dropdown shadow-3xl divide-y divide-white/5 overflow-hidden rounded-[2rem] md:rounded-[2.5rem]">
                  {searchResults.map((city, idx) => (
                    <motion.li
                      key={city.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`group/item cursor-pointer transition-all duration-500 ${
                        activeIndex === idx ? "bg-blue-500/15" : "hover:bg-white/5"
                      }`}
                    >
                      <Link
                        href={`/cities/${city.id}?lat=${city.lat}&lng=${city.lng}`}
                        className="flex w-full items-center justify-between gap-4 px-6 md:px-10 py-4 md:py-6"
                      >
                        <div className="flex min-w-0 items-center gap-4 md:gap-6">
                          <div
                            className={`flex h-12 w-12 md:h-14 md:w-14 flex-shrink-0 items-center justify-center rounded-xl md:rounded-2xl border border-white/5 bg-white/[0.02] transition-all duration-700 ${
                              activeIndex === idx
                                ? "scale-110 border-blue-500/40 bg-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.2)]"
                                : "group-hover/item:scale-105 group-hover/item:bg-white/5"
                            }`}
                          >
                            <MapPin
                              className={`h-5 w-5 md:h-6 md:w-6 transition-colors duration-500 ${
                                activeIndex === idx
                                  ? "text-blue-400"
                                  : "text-white/20 group-hover/item:text-blue-400/60"
                              }`}
                            />
                          </div>
                          <div className="min-w-0">
                            <div
                              className={`truncate text-xl md:text-2xl font-black tracking-tight transition-colors duration-500 ${
                                activeIndex === idx
                                  ? "text-white"
                                  : "text-white/80 group-hover/item:text-white"
                              }`}
                            >
                              {highlightMatch(city.city, searchQuery)}
                            </div>
                            <div
                              className={`text-[10px] md:text-[11px] font-black tracking-[0.2em] uppercase transition-colors duration-500 ${
                                activeIndex === idx
                                  ? "text-blue-400/80"
                                  : "text-white/40 group-hover/item:text-white/60"
                              }`}
                            >
                              {city.country}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-6">
                          <div className="hidden text-right sm:block">
                            <div
                              className={`text-xl font-black transition-colors duration-500 ${
                                activeIndex === idx
                                  ? "text-blue-500/50"
                                  : "text-white/[0.1] group-hover/item:text-white/[0.2]"
                              }`}
                            >
                              {formatPopulation(city.population)}
                            </div>
                          </div>
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-700 ${
                              activeIndex === idx
                                ? "translate-x-0 border-blue-500/50 bg-blue-500/20 opacity-100"
                                : "-translate-x-4 border-white/5 opacity-0 group-hover/item:translate-x-0 group-hover/item:opacity-100"
                            }`}
                          >
                            <ArrowRight className="h-5 w-5 text-blue-400" />
                          </div>
                        </div>
                      </Link>
                    </motion.li>
                  ))}
                  {searchResults.length === 0 && !isSearching && (
                    <li className="px-8 py-12 text-center">
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
      </div>
    </main>
  );
}

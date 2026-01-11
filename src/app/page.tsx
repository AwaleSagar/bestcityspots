"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { searchCities, getTopCities, City } from "@/lib/cities";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<City[]>([]);
  const [topCities, setTopCities] = useState<City[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const fetchTop = async () => {
      const cities = await getTopCities(5);
      setTopCities(cities);
    };
    fetchTop();
  }, []);

  useEffect(() => {
    setActiveIndex(-1);
  }, [searchResults]);

  // Handle search with faster debounce
  useEffect(() => {
    if (!mounted) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setIsSearching(true);
        const results = await searchCities(searchQuery, 10, controller.signal);
        if (controller.signal.aborted) return;
        setSearchResults(results);
        setIsSearching(false);
      } else {
        controller.abort();
        setSearchResults([]);
        setIsSearching(false);
      }
    }, 200);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [searchQuery, mounted]);

  const shouldShowResults = searchQuery.trim().length >= 2;

  const highlightMatch = useMemo(() => {
    return (text: string, query: string) => {
      if (!query) return text;
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const parts = text.split(new RegExp(`(${escaped})`, "gi"));
      return (
        <span>
          {parts.map((part, i) =>
            part.toLowerCase() === query.toLowerCase() ? (
              <mark key={i} className="bg-blue-500/20 text-blue-400 px-0.5 rounded-sm font-bold shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                {part}
              </mark>
            ) : (
              <span key={i}>{part}</span>
            )
          )}
        </span>
      );
    };
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

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-transparent text-white font-sans">
      <div className="max-w-2xl mx-auto px-6 py-32">
        {/* Principle 1: Hierarchy - Clear Heading */}
        <motion.header 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="mb-16 space-y-6 text-center"
        >
          <h1 className="text-7xl md:text-8xl font-black tracking-tighter bg-gradient-to-b from-white via-white/90 to-white/30 bg-clip-text text-transparent leading-[0.85] drop-shadow-2xl">
            Best City <br /> Spots
          </h1>
          <p className="text-white/50 text-xl max-w-md mx-auto font-medium leading-relaxed tracking-tight">
            Discover the world's most vibrant urban centers with our <span className="text-white/80">premium directory</span>.
          </p>
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
          
          <div className="relative group">
            <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-500 group-focus-within:text-blue-400 transition-all duration-500" />
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
              className="w-full bg-white/[0.03] border border-white/10 rounded-[2.5rem] pl-20 pr-8 py-8 text-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/40 transition-all duration-700 liquid-glass shadow-2xl shadow-black hover:bg-white/[0.05]"
            />
            
            {/* Principle 4: Contrast - Loading indicator */}
            {isSearching && (
              <div className="absolute right-8 top-1/2 -translate-y-1/2">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-8 h-8 border-2 border-blue-500/10 border-t-blue-500 rounded-full"
                />
              </div>
            )}
          </div>

          <div className="mt-6 px-4 flex justify-between items-center text-[10px] font-black tracking-[0.3em] uppercase">
            <div className="text-white/20" aria-live="polite">
              {isSearching ? (
                <span className="text-blue-400/60 animate-pulse">Analyzing Data...</span>
              ) : shouldShowResults ? (
                <span className="text-white/40">{searchResults.length} matches found</span>
              ) : (
                "System Idle"
              )}
            </div>
            {!shouldShowResults && <div className="text-blue-500/30 animate-pulse">Ready to explore</div>}
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
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] mb-4 px-2">
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
                        className="inline-block px-5 py-2.5 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/10 hover:border-white/20 hover:scale-105 transition-all text-xs font-bold text-white/60 hover:text-white active:scale-95 liquid-glass shadow-lg"
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
                <ul className="rounded-[2.5rem] overflow-hidden glass-dropdown divide-y divide-white/5 shadow-3xl">
                  {searchResults.map((city, idx) => (
                    <motion.li 
                      key={city.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`transition-all duration-500 cursor-pointer group/item ${
                        activeIndex === idx ? "bg-blue-500/15" : "hover:bg-white/5"
                      }`}
                    >
                      <Link href={`/cities/${city.id}?lat=${city.lat}&lng=${city.lng}`} className="px-10 py-6 flex justify-between items-center w-full">
                        <div className="flex gap-6 items-center">
                          <div className={`w-14 h-14 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center transition-all duration-700 ${
                            activeIndex === idx ? "scale-110 bg-blue-500/20 border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.2)]" : "group-hover/item:scale-105 group-hover/item:bg-white/5"
                          }`}>
                            <MapPin className={`w-6 h-6 transition-colors duration-500 ${
                              activeIndex === idx ? "text-blue-400" : "text-white/20 group-hover/item:text-blue-400/60"
                            }`} />
                          </div>
                          <div>
                            <div className={`text-2xl font-black tracking-tight transition-colors duration-500 ${
                              activeIndex === idx ? "text-white" : "text-white/80 group-hover/item:text-white"
                            }`}>
                              {highlightMatch(city.city, searchQuery)}
                            </div>
                            <div className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-500 ${
                              activeIndex === idx ? "text-blue-400/60" : "text-white/20 group-hover/item:text-white/40"
                            }`}>
                              {city.country}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right hidden sm:block">
                            <div className={`text-xl font-black transition-colors duration-500 ${
                              activeIndex === idx ? "text-blue-500/30" : "text-white/[0.05] group-hover/item:text-white/[0.08]"
                            }`}>
                              {city.population?.toLocaleString()}
                            </div>
                          </div>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-700 ${
                            activeIndex === idx ? "border-blue-500/50 bg-blue-500/20 translate-x-0 opacity-100" : "border-white/5 -translate-x-4 opacity-0 group-hover/item:translate-x-0 group-hover/item:opacity-100"
                          }`}>
                            <ArrowRight className="w-5 h-5 text-blue-400" />
                          </div>
                        </div>
                      </Link>
                    </motion.li>
                  ))}
                  {searchResults.length === 0 && !isSearching && (
                    <li className="px-8 py-12 text-center">
                      <div className="text-gray-400 font-medium mb-1">No matches for "{searchQuery}"</div>
                      <div className="text-gray-600 text-sm">Try searching for another city or country.</div>
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

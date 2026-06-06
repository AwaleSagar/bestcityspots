"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { searchCities, CitySearchResult, findNearestCity, cityHref } from "@/lib/cities";
import { useRecentSearches } from "@/hooks/useRecentSearches";
import { useDeviceType } from "@/hooks/useDeviceType";
import { useAnalytics } from "@/lib/useAnalytics";
import {
  KEYBOARD_ANIMATION_DELAY,
  PLACEHOLDER_HINTS,
  type CitySearchFilter,
} from "./city-search-config";

interface UseCitySearchControllerArgs {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function useCitySearchController({ containerRef }: UseCitySearchControllerArgs) {
  const [searchQuery, setSearchQuery] = useState("");
  const [rawSearchResults, setRawSearchResults] = useState<CitySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [activeFilter, setActiveFilter] = useState<CitySearchFilter | null>(null);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  const router = useRouter();
  const { trackAction } = useAnalytics();
  const hasTrackedSearch = useRef(false);

  const { recentCities, addRecentCity } = useRecentSearches();
  const { isMobile, isTablet, isVirtualKeyboardOpen } = useDeviceType();
  const isTouchDevice = isMobile || isTablet;

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

  useEffect(() => {
    if (searchQuery) return;
    const interval = setInterval(() => {
      setPlaceholderIdx((prev) => (prev + 1) % PLACEHOLDER_HINTS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [searchQuery]);

  useEffect(() => {
    if (!isVirtualKeyboardOpen || !isTouchDevice) return;
    const timeout = setTimeout(() => {
      containerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }, KEYBOARD_ANIMATION_DELAY);
    return () => clearTimeout(timeout);
  }, [containerRef, isTouchDevice, isVirtualKeyboardOpen]);

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
          addRecentCity(selectedCity);
          router.push(cityHref(selectedCity));
        } else if (searchResults.length > 0) {
          const firstCity = searchResults.at(0);
          if (firstCity) {
            addRecentCity(firstCity);
            router.push(cityHref(firstCity));
          }
        }
      } else if (e.key === "Escape") {
        setSearchQuery("");
        setRawSearchResults([]);
        setActiveIndex(-1);
      }
    },
    [activeIndex, addRecentCity, router, searchResults]
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
          router.push(cityHref(nearest, { lat: latitude, lng: longitude }));
        } catch (error) {
          console.warn("Unable to resolve current location", error);
          setIsLocating(false);
        }
      },
      (error) => {
        console.warn("Geolocation permission denied or error", error);
        setIsLocating(false);
      }
    );
  }, [isLocating, addRecentCity, router]);

  return {
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
  };
}

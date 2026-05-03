"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { City } from "@/lib/cities";
import { getJsonStorageItem, setJsonStorageItem } from "@/lib/storage";

const STORAGE_KEY = "atlas_recent_searches";
const MAX_RECENT = 5;

export function useRecentSearches() {
  const [recentCities, setRecentCities] = useState<City[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Pre-compute Set of IDs for O(1) duplicate detection
  const recentCityIds = useMemo(() => new Set(recentCities.map((c) => c.id)), [recentCities]);

  useEffect(() => {
    const saved = getJsonStorageItem<City[]>(STORAGE_KEY, []);
    // React Compiler flags synchronous state updates directly inside effects;
    // defer the localStorage snapshot into the next microtask.
    queueMicrotask(() => {
      setRecentCities(saved);
      setIsLoaded(true);
    });
  }, []);

  const addRecentCity = useCallback((city: City) => {
    setRecentCities((prev) => {
      // Build a Map for O(1) lookups if we need to remove existing
      // For small arrays (MAX_RECENT = 5), this is still efficient
      // The main optimization is avoiding repeated array scans
      const idSet = new Set(prev.map((c) => c.id));

      if (idSet.has(city.id)) {
        // Remove existing and add to front - O(n) filter but n is small (5)
        const filtered = prev.filter((c) => c.id !== city.id);
        return [city, ...filtered];
      }
      // Just prepend - O(1) with slice
      return [city, ...prev].slice(0, MAX_RECENT);
    });
  }, []);

  // Persist to localStorage as a side effect of state change. Avoids
  // performing I/O inside a setState updater (which can run twice in StrictMode).
  useEffect(() => {
    if (!isLoaded) return;
    setJsonStorageItem(STORAGE_KEY, recentCities);
  }, [recentCities, isLoaded]);

  return { recentCities, recentCityIds, addRecentCity, isLoaded };
}

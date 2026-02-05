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
    const recentCityIds = useMemo(
        () => new Set(recentCities.map(c => c.id)),
        [recentCities]
    );

    useEffect(() => {
        const saved = getJsonStorageItem<City[]>(STORAGE_KEY, []);
        // Use queueMicrotask instead of setTimeout for better performance
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
            const idSet = new Set(prev.map(c => c.id));
            
            let next: City[];
            if (idSet.has(city.id)) {
                // Remove existing and add to front - O(n) filter but n is small (5)
                const filtered = prev.filter((c) => c.id !== city.id);
                next = [city, ...filtered];
            } else {
                // Just prepend - O(1) with slice
                next = [city, ...prev].slice(0, MAX_RECENT);
            }
            
            setJsonStorageItem(STORAGE_KEY, next);
            return next;
        });
    }, []);

    return { recentCities, recentCityIds, addRecentCity, isLoaded };
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { City } from "@/lib/cities";
import { getJsonStorageItem, setJsonStorageItem } from "@/lib/storage";

const STORAGE_KEY = "atlas_recent_searches";
const MAX_RECENT = 5;

export function useRecentSearches() {
    const [recentCities, setRecentCities] = useState<City[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const saved = getJsonStorageItem<City[]>(STORAGE_KEY, []);
        // Delay setting state to avoid "sync state in effect" warning, 
        // though logically this is just client-side initialization.
        const timer = setTimeout(() => {
            setRecentCities(saved);
            setIsLoaded(true);
        }, 0);
        return () => clearTimeout(timer);
    }, []);

    const addRecentCity = useCallback((city: City) => {
        setRecentCities((prev) => {
            const filtered = prev.filter((c) => c.id !== city.id);
            const next = [city, ...filtered].slice(0, MAX_RECENT);
            setJsonStorageItem(STORAGE_KEY, next);
            return next;
        });
    }, []);

    return { recentCities, addRecentCity, isLoaded };
}

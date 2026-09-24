"use client";

import { useEffect, useRef } from "react";
import type { City } from "@/lib/cities";
import { useAnalytics } from "@/lib/useAnalytics";
import { useRecentCities } from "@/hooks/useRecentCities";

/**
 * Once per city: records the anonymous `view_city` action (feeds the home
 * page "opening now" index) and adds the city to this browser's recently
 * viewed list (shown on /saved and in search).
 */
export function CityViewTracker({ city }: { city: City }) {
  const { trackCityView } = useAnalytics();
  const { addRecent } = useRecentCities();
  const reported = useRef<number | null>(null);

  useEffect(() => {
    if (reported.current === city.id) return;
    reported.current = city.id;
    trackCityView(city.id);
    addRecent(city);
  }, [city, trackCityView, addRecent]);

  return null;
}

"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAnalytics } from "@/lib/useAnalytics";

/**
 * Automatically tracks page views on route changes.
 * Also extracts city ID from city page URLs.
 *
 * Place this component once in your layout, inside AnalyticsProvider.
 */
export function PageTracker() {
  const pathname = usePathname();
  const { trackPageView, trackCityView } = useAnalytics();
  const previousPath = useRef<string | null>(null);

  useEffect(() => {
    // Avoid tracking the same page twice
    if (pathname === previousPath.current) return;
    previousPath.current = pathname;

    // Extract city ID from city page URLs: /cities/[id]
    const cityMatch = pathname.match(/^\/cities\/(\d+)/);
    const cityId = cityMatch ? parseInt(cityMatch[1], 10) : undefined;

    // Track page view
    trackPageView(pathname, cityId);

    // Also track city view action if on a city page
    if (cityId) {
      trackCityView(cityId);
    }
  }, [pathname, trackPageView, trackCityView]);

  // This component doesn't render anything
  return null;
}

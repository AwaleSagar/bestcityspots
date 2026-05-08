"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAnalytics } from "@/lib/useAnalytics";

/**
 * Automatically tracks page views on route changes.
 *
 * SEO Phase 1 (T1): the city route now uses slugs (`/cities/lisbon-portugal`).
 * Numeric ids are still recognized — they 308-redirect to the canonical slug
 * via the route handler — so a numeric extraction continues to work for the
 * brief redirect hop. Slug-based pageviews are tracked as a generic page
 * view; per-city analytics with a numeric id should be wired in via a small
 * server-rendered tracker component on the city page if a numeric id is
 * required (out of scope for Phase 1).
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

    // Legacy numeric URLs (`/cities/123`) still arrive briefly before the
    // server-side 308 redirect lands the browser on the canonical slug
    // URL. Capture the city id when present so existing per-city
    // analytics keep working through the migration window.
    const cityMatch = pathname.match(/^\/cities\/(\d+)(?:[/?#]|$)/);
    const cityId = cityMatch ? parseInt(cityMatch[1], 10) : undefined;

    // Track page view
    trackPageView(pathname, cityId);

    // Also track city view action if on a numeric-id city page
    if (cityId) {
      trackCityView(cityId);
    }
  }, [pathname, trackPageView, trackCityView]);

  // This component doesn't render anything
  return null;
}

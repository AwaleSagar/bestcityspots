"use client";

import { useContext } from "react";
import {
  AnalyticsContext,
  type ActionType,
} from "@/components/analytics/AnalyticsProvider";

/**
 * Hook for tracking analytics events.
 *
 * @example
 * ```tsx
 * const { trackPageView, trackAction, trackCityView } = useAnalytics();
 *
 * // Track a page view (usually handled by PageTracker)
 * trackPageView("/cities/paris");
 *
 * // Track a user action
 * trackAction("search");
 * trackAction("save_place");
 *
 * // Track a city view with ID
 * trackCityView(123);
 * ```
 */
export function useAnalytics() {
  const context = useContext(AnalyticsContext);

  if (!context) {
    // Return no-op functions if used outside provider
    // This allows components to use the hook without breaking
    // when analytics are disabled
    return {
      trackPageView: () => {},
      trackAction: () => {},
      trackCityView: () => {},
      setGeoConsent: () => {},
      hasGeoConsent: false,
    };
  }

  return context;
}

// Re-export ActionType for convenience
export type { ActionType };

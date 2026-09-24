import { createContext } from "react";

/**
 * Analytics context contract shared by the client provider
 * (`components/analytics/AnalyticsProvider`) and the `useAnalytics` hook.
 *
 * Lives in `src/lib` so library code never has to import from
 * `src/components`. Client-only: `createContext` is not available in the
 * React Server Components runtime, so only import this from client modules.
 */

export type ActionType =
  | "search"
  | "save_place"
  | "remove_save"
  | "add_note"
  | "delete_note"
  | "view_guide"
  | "view_city"
  | "click_maps_link"
  | "share"
  | "download_itinerary"
  | "click_affiliate";

export interface AnalyticsContextValue {
  trackPageView: (path: string, cityId?: number) => void;
  trackAction: (action: ActionType) => void;
  trackCityView: (cityId: number) => void;
  setGeoConsent: (consent: boolean) => void;
  hasGeoConsent: boolean;
}

export const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

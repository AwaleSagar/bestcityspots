"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { publicEnv } from "@/lib/env";
import {
  getSessionStorageItem,
  getStorageItem,
  setSessionStorageItem,
  setStorageItem,
} from "@/lib/storage";

// =============================================================================
// Types
// =============================================================================

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

interface AnalyticsEvent {
  type: "pageview" | "action" | "session_end";
  sessionId: string;
  isNewVisitor?: boolean;
  path?: string;
  cityId?: number;
  action?: ActionType;
  referrer?: string;
  sessionDuration?: number;
  pageCount?: number;
  hasGeoConsent?: boolean;
}

interface AnalyticsContextValue {
  trackPageView: (path: string, cityId?: number) => void;
  trackAction: (action: ActionType) => void;
  trackCityView: (cityId: number) => void;
  setGeoConsent: (consent: boolean) => void;
  hasGeoConsent: boolean;
}

// =============================================================================
// Context
// =============================================================================

export const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

// =============================================================================
// Constants
// =============================================================================

const BATCH_INTERVAL_MS = 5000; // Send events every 5 seconds
const SESSION_KEY = "bcs_session";
const NEW_VISITOR_KEY = "bcs_visited";
const GEO_CONSENT_KEY = "bcs_geo_consent";

// =============================================================================
// Helper Functions
// =============================================================================

function generateSessionId(): string {
  // Generate a random session ID (not tied to any PII)
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

function getOrCreateSession(): { sessionId: string; isNew: boolean } {
  if (typeof window === "undefined") {
    return { sessionId: "", isNew: false };
  }

  let sessionId = getSessionStorageItem(SESSION_KEY);
  let isNew = false;

  if (!sessionId) {
    sessionId = generateSessionId();
    setSessionStorageItem(SESSION_KEY, sessionId);
    isNew = true;
  }

  return { sessionId, isNew };
}

function isNewVisitor(): boolean {
  if (typeof window === "undefined") return false;

  const visited = getStorageItem(NEW_VISITOR_KEY);
  if (!visited) {
    setStorageItem(NEW_VISITOR_KEY, "1");
    return true;
  }
  return false;
}

function getGeoConsent(): boolean {
  if (typeof window === "undefined") return false;
  return getStorageItem(GEO_CONSENT_KEY) === "true";
}

function setGeoConsentStorage(consent: boolean): void {
  if (typeof window === "undefined") return;
  setStorageItem(GEO_CONSENT_KEY, consent ? "true" : "false");
}

function getReferrerOrigin(): string | undefined {
  if (typeof document === "undefined" || !document.referrer) return undefined;
  try {
    return new URL(document.referrer).origin;
  } catch {
    return undefined;
  }
}

function shouldTrack(): boolean {
  if (typeof window === "undefined") return false;

  // Respect Do Not Track
  if (navigator.doNotTrack === "1") return false;

  // Don't track in development by default (can be overridden)
  const env = publicEnv();
  if (env.NODE_ENV === "development" && !env.NEXT_PUBLIC_ANALYTICS_DEV) {
    return false;
  }

  return true;
}

// =============================================================================
// Provider Component
// =============================================================================

interface AnalyticsProviderProps {
  children: ReactNode;
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const [hasGeoConsent, setHasGeoConsent] = useState(false);
  const sessionRef = useRef<{ id: string; startTime: number; pageCount: number }>({
    id: "",
    startTime: Date.now(),
    pageCount: 0,
  });
  const eventsQueue = useRef<AnalyticsEvent[]>([]);
  const isNewVisitorRef = useRef<boolean | null>(null);
  const isSendingRef = useRef(false);
  const sessionEndedRef = useRef(false);
  const shouldTrackRef = useRef(false);
  const referrerOriginRef = useRef<string | undefined>(undefined);

  // Initialize session on mount
  useEffect(() => {
    const { sessionId, isNew } = getOrCreateSession();
    sessionRef.current = {
      id: sessionId,
      startTime: Date.now(),
      pageCount: 0,
    };

    // Check if this is a new visitor (first time ever)
    if (isNew) {
      isNewVisitorRef.current = isNewVisitor();
    } else {
      isNewVisitorRef.current = false;
    }

    // Load geo consent
    setHasGeoConsent(getGeoConsent());
    shouldTrackRef.current = shouldTrack();
    referrerOriginRef.current = getReferrerOrigin();
  }, []);

  // Send events to API
  const sendEvents = useCallback(async (events: AnalyticsEvent[]) => {
    if (events.length === 0 || isSendingRef.current) return;

    isSendingRef.current = true;

    try {
      await fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          events,
          timestamp: new Date().toISOString(),
        }),
        // Use keepalive for page unload
        keepalive: true,
      });
    } catch {
      // Silently fail - analytics should not break the app
      console.debug("Analytics send failed");
    } finally {
      isSendingRef.current = false;
    }
  }, []);

  // Flush events queue
  const flushEvents = useCallback(() => {
    if (eventsQueue.current.length === 0) return;

    const events = [...eventsQueue.current];
    eventsQueue.current = [];
    sendEvents(events);
  }, [sendEvents]);

  // Batch interval timer
  useEffect(() => {
    if (!shouldTrackRef.current) return;

    const interval = setInterval(flushEvents, BATCH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [flushEvents]);

  // Send session end on page unload
  useEffect(() => {
    if (!shouldTrackRef.current) return;

    const handlePageHide = () => {
      if (sessionEndedRef.current) return;
      sessionEndedRef.current = true;
      const sessionDuration = Math.round((Date.now() - sessionRef.current.startTime) / 1000);

      // Add session end event
      eventsQueue.current.push({
        type: "session_end",
        sessionId: sessionRef.current.id,
        sessionDuration,
        pageCount: sessionRef.current.pageCount,
        hasGeoConsent,
      });

      // Flush immediately
      const events = [...eventsQueue.current];
      eventsQueue.current = [];

      // Use sendBeacon for reliability on unload
      if (navigator.sendBeacon) {
        const payload = new Blob(
          [
            JSON.stringify({
              events,
              timestamp: new Date().toISOString(),
            }),
          ],
          { type: "application/json" }
        );
        navigator.sendBeacon("/api/analytics", payload);
      } else {
        // Fallback to fetch with keepalive
        sendEvents(events);
      }
    };

    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [hasGeoConsent, sendEvents]);

  // Track page view
  const trackPageView = useCallback(
    (path: string, cityId?: number) => {
      if (!shouldTrackRef.current) return;

      sessionRef.current.pageCount++;

      eventsQueue.current.push({
        type: "pageview",
        sessionId: sessionRef.current.id,
        isNewVisitor: isNewVisitorRef.current === true,
        path,
        cityId,
        referrer: referrerOriginRef.current,
        hasGeoConsent,
      });

      // Reset new visitor flag after first pageview
      if (isNewVisitorRef.current === true) {
        isNewVisitorRef.current = false;
      }
    },
    [hasGeoConsent]
  );

  // Track action
  const trackAction = useCallback((action: ActionType) => {
    if (!shouldTrackRef.current) return;

    eventsQueue.current.push({
      type: "action",
      sessionId: sessionRef.current.id,
      action,
    });
  }, []);

  // Track city view (convenience method)
  const trackCityView = useCallback((cityId: number) => {
    if (!shouldTrackRef.current) return;

    eventsQueue.current.push({
      type: "action",
      sessionId: sessionRef.current.id,
      action: "view_city",
      cityId,
    });
  }, []);

  // Set geo consent
  const handleSetGeoConsent = useCallback((consent: boolean) => {
    setGeoConsentStorage(consent);
    setHasGeoConsent(consent);
  }, []);

  const contextValue: AnalyticsContextValue = useMemo(
    () => ({
      trackPageView,
      trackAction,
      trackCityView,
      setGeoConsent: handleSetGeoConsent,
      hasGeoConsent,
    }),
    [handleSetGeoConsent, hasGeoConsent, trackAction, trackCityView, trackPageView]
  );

  return <AnalyticsContext.Provider value={contextValue}>{children}</AnalyticsContext.Provider>;
}

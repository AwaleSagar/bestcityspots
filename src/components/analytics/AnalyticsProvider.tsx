"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AnalyticsContext,
  type ActionType,
  type AnalyticsContextValue,
} from "@/lib/analytics-context";
import { AnalyticsQueue } from "@/lib/analytics-queue";
import {
  getSessionStorageItem,
  getStorageItem,
  setSessionStorageItem,
  setStorageItem,
} from "@/lib/storage";
import { useStoredValue } from "@/hooks/useStoredValue";

const ENDPOINT = "/api/analytics";
const BATCH_INTERVAL_MS = 5000;
const SESSION_KEY = "bcs_session";
const NEW_VISITOR_KEY = "bcs_visited";
const GEO_CONSENT_KEY = "bcs_geo_consent";

function generateSessionId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function createBrowserQueue(allowTracking: boolean) {
  return new AnalyticsQueue({
    isEnabled: () => {
      if (typeof window === "undefined" || !allowTracking) return false;
      return navigator.doNotTrack !== "1";
    },
    getSession: () => {
      const existing = getSessionStorageItem(SESSION_KEY);
      if (existing) return { id: existing, isNew: false };
      const id = generateSessionId();
      setSessionStorageItem(SESSION_KEY, id);
      return { id, isNew: true };
    },
    claimNewVisitor: () => {
      if (getStorageItem(NEW_VISITOR_KEY)) return false;
      setStorageItem(NEW_VISITOR_KEY, "1");
      return true;
    },
    referrerOrigin: () => {
      if (!document.referrer) return undefined;
      try {
        return new URL(document.referrer).origin;
      } catch {
        return undefined;
      }
    },
    now: () => Date.now(),
    send: async (body) => {
      await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      });
    },
    beacon: (body) =>
      typeof navigator.sendBeacon === "function" &&
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" })),
  });
}

const parseConsent = (raw: string | null) => raw === "true";
const serializeConsent = (value: boolean) => (value ? "true" : "false");

/**
 * Privacy-conscious analytics: aggregate pageviews and anonymous actions,
 * batched to /api/analytics. Honors Do Not Track; off in development unless
 * NEXT_PUBLIC_ANALYTICS_DEV is set. Geo (country/city from edge headers) is
 * stored server-side only for batches flagged with explicit consent.
 */
interface AnalyticsProviderProps {
  /**
   * Resolved on the server from env.ts: false in development unless
   * NEXT_PUBLIC_ANALYTICS_DEV is set. Passed in so the client bundle never
   * needs env.ts (and zod).
   */
  enabled: boolean;
  children: ReactNode;
}

export function AnalyticsProvider({ enabled, children }: AnalyticsProviderProps) {
  const [queue] = useState(() => createBrowserQueue(enabled));
  const [hasGeoConsent, setConsent] = useStoredValue(
    GEO_CONSENT_KEY,
    parseConsent,
    false,
    serializeConsent
  );

  useEffect(() => {
    if (!queue.isEnabled()) return;
    const interval = window.setInterval(() => void queue.flush(), BATCH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [queue]);

  useEffect(() => {
    if (!queue.isEnabled()) return;
    const onHide = () => queue.endSession(hasGeoConsent);
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) queue.resumeSession();
    };
    window.addEventListener("pagehide", onHide);
    window.addEventListener("pageshow", onShow);
    return () => {
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("pageshow", onShow);
    };
  }, [queue, hasGeoConsent]);

  const trackPageView = useCallback(
    (path: string, cityId?: number) => queue.pageview(path, hasGeoConsent, cityId),
    [queue, hasGeoConsent]
  );
  const trackAction = useCallback((action: ActionType) => queue.action(action), [queue]);
  const trackCityView = useCallback((cityId: number) => queue.action("view_city", cityId), [queue]);
  const setGeoConsent = useCallback((consent: boolean) => setConsent(consent), [setConsent]);

  const value: AnalyticsContextValue = useMemo(
    () => ({ trackPageView, trackAction, trackCityView, setGeoConsent, hasGeoConsent }),
    [trackPageView, trackAction, trackCityView, setGeoConsent, hasGeoConsent]
  );

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}

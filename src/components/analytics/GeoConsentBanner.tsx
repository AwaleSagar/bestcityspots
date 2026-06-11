"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { MapPin, X } from "lucide-react";
import { useAnalytics } from "@/lib/useAnalytics";
import { getStorageItem, setStorageItem } from "@/lib/storage";

const GEO_ASKED_KEY = "bcs_geo_asked";
const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Non-blocking banner asking for geolocation consent.
 * Only shown once per browser (not per session).
 * Dismissible - analytics work without geo data.
 */
export function GeoConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const { setGeoConsent, hasGeoConsent } = useAnalytics();
  const shouldReduceMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const handleAccept = () => {
    setGeoConsent(true);
    setStorageItem(GEO_ASKED_KEY, "true");
    setIsVisible(false);
  };

  const handleDecline = () => {
    setGeoConsent(false);
    setStorageItem(GEO_ASKED_KEY, "true");
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setStorageItem(GEO_ASKED_KEY, "true");
    setIsVisible(false);
  };

  useEffect(() => {
    // Check if we've already asked
    const alreadyAsked = getStorageItem(GEO_ASKED_KEY);
    if (alreadyAsked) return;

    // Show banner after a short delay (don't interrupt initial load)
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleDismiss();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (!active) return;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [isVisible]);

  // Don't show if already consented
  if (hasGeoConsent) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 50 }}
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 50 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="fixed right-4 bottom-[calc(var(--mobile-bottom-nav-height)+1rem)] left-4 z-50 mx-auto max-w-md md:right-6 md:bottom-6 md:left-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="geo-consent-title"
          aria-describedby="geo-consent-description"
        >
          <div ref={panelRef} className="border-line bg-surface-strong/95 relative overflow-hidden rounded-3xl border p-5 shadow-2xl backdrop-blur-xl">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[color:var(--color-brand-secondary)] via-[color:var(--color-accent)] to-[color:var(--color-accent-strong)]" />

            {/* Close button */}
            <button
              type="button"
              ref={closeButtonRef}
              onClick={handleDismiss}
              className="text-muted hover:bg-background/60 hover:text-foreground absolute top-3 right-3 rounded-full p-1.5 transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="bg-accent-soft text-accent flex h-10 w-10 items-center justify-center rounded-2xl">
                  <MapPin className="h-5 w-5" />
                </div>
              </div>
              <div className="flex-1 pr-6">
                <h3 id="geo-consent-title" className="text-foreground text-sm font-semibold">
                  Share your rough location?
                </h3>
                <p id="geo-consent-description" className="text-muted mt-1 text-xs leading-relaxed">
                  We use general location data to surface more relevant city content and improve
                  aggregate travel insights. Exact coordinates are not stored.
                </p>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={handleAccept}
                    className="bg-foreground text-background rounded-full px-4 py-2 text-xs font-semibold tracking-[0.14em] uppercase transition-all hover:shadow-lg"
                  >
                    Allow
                  </button>
                  <button
                    type="button"
                    onClick={handleDecline}
                    className="border-line bg-background/45 text-muted hover:text-foreground rounded-full border px-4 py-2 text-xs font-semibold tracking-[0.14em] uppercase transition-colors"
                  >
                    No thanks
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { MapPin, X } from "lucide-react";
import { useAnalytics } from "@/lib/useAnalytics";

const GEO_ASKED_KEY = "bcs_geo_asked";

/**
 * Non-blocking banner asking for geolocation consent.
 * Only shown once per browser (not per session).
 * Dismissible - analytics work without geo data.
 */
export function GeoConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const { setGeoConsent, hasGeoConsent } = useAnalytics();
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    // Check if we've already asked
    const alreadyAsked = localStorage.getItem(GEO_ASKED_KEY);
    if (alreadyAsked) return;

    // Show banner after a short delay (don't interrupt initial load)
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleAccept = () => {
    setGeoConsent(true);
    localStorage.setItem(GEO_ASKED_KEY, "true");
    setIsVisible(false);
  };

  const handleDecline = () => {
    setGeoConsent(false);
    localStorage.setItem(GEO_ASKED_KEY, "true");
    setIsVisible(false);
  };

  const handleDismiss = () => {
    // Just dismiss without saving preference - will ask again next session
    setIsVisible(false);
  };

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
          className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md md:left-auto md:right-6 md:bottom-6"
          role="dialog"
          aria-labelledby="geo-consent-title"
          aria-describedby="geo-consent-description"
        >
          <div className="relative overflow-hidden rounded-2xl border border-foreground/10 bg-background/95 p-5 shadow-2xl backdrop-blur-xl">
            {/* Gradient accent */}
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-orange-500 to-pink-500" />

            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="absolute right-3 top-3 rounded-full p-1.5 text-foreground/40 transition-colors hover:bg-foreground/10 hover:text-foreground/60"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Content */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-orange-500/20">
                  <MapPin className="h-5 w-5 text-blue-400" />
                </div>
              </div>
              <div className="flex-1 pr-6">
                <h3
                  id="geo-consent-title"
                  className="text-sm font-semibold text-foreground"
                >
                  Help us improve
                </h3>
                <p
                  id="geo-consent-description"
                  className="mt-1 text-xs leading-relaxed text-foreground/60"
                >
                  Share your general location to help us show relevant city
                  content and improve our service. We only store aggregate data,
                  never your exact location.
                </p>

                {/* Buttons */}
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={handleAccept}
                    className="rounded-lg bg-gradient-to-r from-blue-600 to-orange-600 px-4 py-2 text-xs font-medium text-white transition-all hover:from-blue-500 hover:to-orange-600 hover:shadow-lg hover:shadow-orange-500/25"
                  >
                    Allow
                  </button>
                  <button
                    onClick={handleDecline}
                    className="rounded-lg border border-foreground/10 bg-foreground/5 px-4 py-2 text-xs font-medium text-foreground/70 transition-colors hover:bg-foreground/10 hover:text-foreground"
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

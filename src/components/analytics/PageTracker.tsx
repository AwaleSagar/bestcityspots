"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAnalytics } from "@/lib/useAnalytics";

/**
 * Records a pageview on every client-side route change. Legacy numeric city
 * URLs (`/cities/123`, redirected server-side to the slug) still carry their
 * id so per-city counts survive the redirect hop.
 */
export function PageTracker() {
  const pathname = usePathname();
  const { trackPageView, trackCityView } = useAnalytics();
  const previous = useRef<string | null>(null);

  useEffect(() => {
    if (pathname === previous.current) return;
    previous.current = pathname;
    const match = pathname.match(/^\/cities\/(\d+)(?:[/?#]|$)/);
    const cityId = match ? Number.parseInt(match[1], 10) : undefined;
    trackPageView(pathname, cityId);
    if (cityId) trackCityView(cityId);
  }, [pathname, trackPageView, trackCityView]);

  return null;
}

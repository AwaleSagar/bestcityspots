"use client";

import { useEffect, useRef } from "react";
import { useAnalytics } from "@/lib/useAnalytics";

/**
 * Records a city view exactly once per mount.
 *
 * Used by the slug-based city route to keep the existing per-city analytics
 * working after the SEO Phase 1 URL migration, where the slug (not the
 * numeric id) is the canonical URL segment. The id is resolved server-side
 * from the slug and passed in as a prop.
 */
export default function CityViewTracker({ cityId }: { cityId: number }) {
  const { trackCityView } = useAnalytics();
  const reported = useRef<number | null>(null);

  useEffect(() => {
    if (!Number.isFinite(cityId) || reported.current === cityId) return;
    reported.current = cityId;
    trackCityView(cityId);
  }, [cityId, trackCityView]);

  return null;
}

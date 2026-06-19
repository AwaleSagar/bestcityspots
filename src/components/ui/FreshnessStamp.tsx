"use client";

import { useEffect, useState } from "react";
import { formatRelativeTime } from "@/lib/format";

interface FreshnessStampProps {
  iso: string;
  prefix?: string;
}

/**
 * US-11 (audit AF-6): honest data-recency stamp.
 *
 * Relative time is computed on the client after mount — city pages are ISR
 * (revalidate: 86400), so a server-rendered "2h ago" could be a day stale.
 * The server renders the absolute date as a stable fallback, then the
 * effect swaps in the accurate relative label; no hydration mismatch.
 */
export default function FreshnessStamp({ iso, prefix = "Updated" }: FreshnessStampProps) {
  const [relative, setRelative] = useState<string | null>(null);

  useEffect(() => {
    setRelative(formatRelativeTime(iso));
  }, [iso]);

  // The absolute-date fallback must be locale- AND timezone-deterministic, or
  // SSR (Node, defaults to en-US/UTC) and the first client render (browser
  // locale/timezone) produce different strings and hydration mismatches. Pin
  // both so the two renders are byte-identical; the effect above then swaps in
  // the accurate relative label after mount.
  return (
    <time dateTime={iso}>
      {prefix} {relative ?? new Date(iso).toLocaleDateString("en-US", { timeZone: "UTC" })}
    </time>
  );
}

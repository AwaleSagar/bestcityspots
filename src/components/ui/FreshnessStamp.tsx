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

  return (
    <time dateTime={iso}>
      {prefix} {relative ?? new Date(iso).toLocaleDateString()}
    </time>
  );
}

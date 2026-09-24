"use client";

import { useSyncExternalStore } from "react";
import { formatRelativeTime } from "@/lib/format";

interface RelativeTimeProps {
  iso: string | null | undefined;
  prefix?: string;
  className?: string;
}

const subscribeNoop = () => () => {};

/**
 * Hydration-safe freshness stamp: the server (and first client render) print
 * a stable UTC date; once hydrated it switches to "3h ago". The absolute
 * date stays available in the <time> title.
 */
export function RelativeTime({ iso, prefix, className }: RelativeTimeProps) {
  const hydrated = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
  if (!iso) return null;
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return null;

  const absolute = date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const label = hydrated ? (formatRelativeTime(iso) ?? absolute) : absolute;

  return (
    <time dateTime={iso} title={absolute} className={className}>
      {prefix ? `${prefix} ` : null}
      {label}
    </time>
  );
}

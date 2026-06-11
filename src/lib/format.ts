const TRAILING_ZERO_RE = /\.0$/;

/**
 * US-11: coarse relative time for data-freshness stamps ("just now", "5m
 * ago", "3h ago", "2d ago"); falls back to a locale date beyond 30 days.
 * Returns null for missing/invalid input.
 */
export function formatRelativeTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return null;

  const minutes = Math.round((Date.now() - then) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days <= 30) return `${days}d ago`;
  return new Date(then).toLocaleDateString();
}

export function formatPopulation(num: number | undefined | null): string {
  if (num === undefined || num === null) return "N/A";

  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1).replace(TRAILING_ZERO_RE, "") + "B";
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(TRAILING_ZERO_RE, "") + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(0) + "k";
  }
  return num.toString();
}

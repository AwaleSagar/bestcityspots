import { Flame } from "lucide-react";

/**
 * Trending with readers — a small aggregate-demand chip shown on hub pages for
 * cities in the analytics top decile (redesign 2026 H2 §3). Pure presentational
 * marker; the membership decision is made server-side by the host page.
 *
 * Privacy: the chip only reflects aggregate view counts — no per-visitor data.
 */
export default function TrendingBadge({ label = "Trending" }: { label?: string }) {
  return (
    <span className="badge-featured inline-flex items-center gap-1">
      <Flame className="h-3 w-3" aria-hidden />
      {label}
    </span>
  );
}

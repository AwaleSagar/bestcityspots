"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { DEFAULT_WEIGHTS, WEIGHTS_STORAGE_KEY, type MixerWeights } from "@/lib/mixer";
import { getJsonStorageItem } from "@/lib/storage";

/**
 * Mixer affordance for hub pages (redesign 2026 H2, B4). A one-line link that
 * makes rankings feel personal: if the visitor has tuned the Priorities Mixer
 * on the Global 50, the hub acknowledges their priorities; otherwise it
 * invites them to set weights.
 *
 * Client-only — reads localStorage on mount (SSR-safe, hydration-safe via the
 * null sentinel + queueMicrotask per the codebase React Compiler convention).
 * Zero backend; weights never leave the device.
 */
export default function MixerAffordance() {
  // null = not yet hydrated; true/false = whether stored weights differ from default.
  const [hasCustomWeights, setHasCustomWeights] = useState<boolean | null>(null);

  useEffect(() => {
    const saved = getJsonStorageItem(WEIGHTS_STORAGE_KEY, DEFAULT_WEIGHTS) as Partial<MixerWeights>;
    const isCustom = (Object.keys(DEFAULT_WEIGHTS) as Array<keyof MixerWeights>).some(
      (key) => typeof saved[key] === "number" && saved[key] !== DEFAULT_WEIGHTS[key]
    );
    // Deferred per the codebase convention (no sync setState in effects).
    queueMicrotask(() => setHasCustomWeights(isCustom));
  }, []);

  // Progressive enhancement — render nothing until the localStorage check
  // completes on the client, so SSR and first paint match.
  if (hasCustomWeights === null) return null;

  return (
    <Link
      href="/resources/top-cities#mixer"
      className="source-chip mt-5 w-fit transition-colors hover:border-[color:color-mix(in_oklab,var(--color-accent)_30%,var(--color-line))]"
      aria-label={
        hasCustomWeights
          ? "Adjust your priority weights on The Global 50"
          : "Set your priority weights on The Global 50"
      }
    >
      <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
      {hasCustomWeights ? "Ranked by your priorities — adjust" : "Rank by your priorities"}
    </Link>
  );
}

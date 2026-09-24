"use client";

import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { DEFAULT_WEIGHTS, WEIGHTS_STORAGE_KEY, type MixerWeights } from "@/lib/mixer";
import { useStoredValue } from "@/hooks/useStoredValue";

function parseActive(raw: string | null): boolean {
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw) as Partial<MixerWeights>;
    return Object.keys(DEFAULT_WEIGHTS).some((key) => {
      const value = Object.entries(parsed).find(([name]) => name === key)?.[1];
      return typeof value === "number" && value > 0;
    });
  } catch {
    return false;
  }
}

/** Entry point to the priorities mixer; reflects saved weights if any. */
export function MixerLink() {
  const [active] = useStoredValue(WEIGHTS_STORAGE_KEY, parseActive, false, String);
  return (
    <Link
      href="/resources/top-cities#mixer"
      className="border-rule ease-standard hover:border-accent flex items-start gap-3 rounded-md border p-4 transition-colors duration-150"
    >
      <SlidersHorizontal aria-hidden className="text-accent mt-0.5 size-4 shrink-0" />
      <span>
        <span className="block text-sm font-semibold">
          {active ? "Your priorities are set" : "Rank by your priorities"}
        </span>
        <span className="text-ink-muted mt-0.5 block text-sm">
          {active
            ? "See the Top 250 re-ranked by budget, air, safety and connectivity."
            : "Weigh budget, air, safety and connectivity to re-rank the Top 250."}
        </span>
      </span>
    </Link>
  );
}

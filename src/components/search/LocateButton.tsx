"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LocateFixed, LoaderCircle } from "lucide-react";
import { cityHref } from "@/lib/city-href";
import { useHydrated } from "@/hooks/useStoredValue";
import { useRecentCities } from "@/hooks/useRecentCities";
import { cn } from "@/components/ui/cn";

type LocateState = "idle" | "locating" | "error";

/**
 * "Near me": finds the nearest city in the index and opens its guide.
 * Privacy: the visitor's coordinates are used once, in the browser, and are
 * never put in the URL or sent to our server — only the nearest-city lookup
 * (a bounding-box query) leaves the device.
 */
export function LocateButton({ className }: { className?: string }) {
  const hydrated = useHydrated();
  const router = useRouter();
  const { addRecent } = useRecentCities();
  const [state, setState] = useState<LocateState>("idle");

  if (!hydrated || !("geolocation" in navigator)) return null;

  const locate = () => {
    setState("locating");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { findNearestCity } = await import("@/lib/cities");
        const city = await findNearestCity(position.coords.latitude, position.coords.longitude);
        if (!city) {
          setState("error");
          return;
        }
        addRecent(city);
        router.push(cityHref(city));
      },
      () => setState("error"),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 600_000 }
    );
  };

  return (
    <>
      <button
        type="button"
        onClick={locate}
        disabled={state === "locating"}
        className={cn(
          "text-accent ease-standard hover:bg-accent-soft inline-flex h-9 min-w-9 shrink-0 items-center justify-center gap-1.5 rounded-md px-2 text-sm font-medium transition-colors duration-150 disabled:opacity-60 sm:px-2.5 pointer-coarse:h-11 [&_svg]:size-4",
          className
        )}
      >
        {state === "locating" ? (
          <LoaderCircle aria-hidden className="animate-spin" />
        ) : (
          <LocateFixed aria-hidden />
        )}
        <span className="sr-only sm:not-sr-only">
          {state === "locating" ? "Locating…" : state === "error" ? "Try again" : "Near me"}
        </span>
      </button>
      <span role="status" className="sr-only">
        {state === "error" ? "Couldn't find your location. Try searching instead." : ""}
      </span>
    </>
  );
}

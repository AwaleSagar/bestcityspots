"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Compass } from "lucide-react";
import Link from "next/link";
import type { City } from "@/lib/cities";

interface CuratedTrailsProps {
  cities: City[];
}

const trailThemes = [
  "Culture & History",
  "Foodie Paradise",
  "Night Vibes",
  "Nature Escape",
  "Budget Friendly",
] as const;

function getTrailTheme(index: number): string {
  return trailThemes[index % trailThemes.length];
}

export default function CuratedTrails({ cities }: CuratedTrailsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      resizeObserver.disconnect();
    };
  }, [updateScrollState]);

  const scroll = useCallback((direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  }, []);

  if (cities.length === 0) return null;

  return (
    <section aria-labelledby="curated-trails-heading" className="space-y-6">
      <div className="flex items-center justify-between px-1">
        <h2
          id="curated-trails-heading"
          className="section-heading flex items-center gap-2"
        >
          <Compass className="h-4 w-4 text-purple-400" aria-hidden />
          Curated Trails
        </h2>
        <div className="flex gap-2" aria-label="Scroll controls">
          <button
            type="button"
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            aria-label="Scroll trails left"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-foreground/[0.06] bg-foreground/[0.02] text-foreground/50 transition-colors hover:border-purple-500/30 hover:text-purple-400 disabled:opacity-30 disabled:cursor-not-allowed min-h-[var(--touch-target-min)] min-w-[var(--touch-target-min)]"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            aria-label="Scroll trails right"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-foreground/[0.06] bg-foreground/[0.02] text-foreground/50 transition-colors hover:border-purple-500/30 hover:text-purple-400 disabled:opacity-30 disabled:cursor-not-allowed min-h-[var(--touch-target-min)] min-w-[var(--touch-target-min)]"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="trails-scroll"
        role="region"
        aria-label="Curated city trails, swipe to browse"
        tabIndex={0}
      >
        {cities.map((city, idx) => (
          <Link
            key={city.id}
            href={`/cities/${city.id}?lat=${city.lat}&lng=${city.lng}`}
            className="trail-card liquid-glass group flex flex-col justify-between gap-4 rounded-2xl border border-foreground/[0.06] bg-foreground/[0.015] p-5 transition-all duration-300 hover:border-purple-500/20 hover:shadow-lg hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-purple-500/50"
          >
            <div>
              <span className="mb-2 inline-block rounded-full border border-purple-500/15 bg-purple-500/[0.06] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-purple-400/80">
                {getTrailTheme(idx)}
              </span>
              <h3 className="mt-2 text-lg font-bold tracking-tight text-foreground/90 group-hover:text-foreground">
                {city.city}
              </h3>
              <p className="mt-1 text-sm text-foreground/45">{city.country}</p>
            </div>
            <span className="text-xs font-semibold text-purple-400/60 group-hover:text-purple-400 transition-colors">
              Explore trail →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

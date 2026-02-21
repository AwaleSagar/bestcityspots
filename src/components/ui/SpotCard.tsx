"use client";

import { useState, useCallback } from "react";
import { MapPin, Clock, Star, ChevronDown, Navigation } from "lucide-react";

export interface SpotCardData {
  id: string;
  name: string;
  category: string;
  rating?: number;
  reviewCount?: number;
  address?: string;
  hours?: string;
  mapsUrl?: string;
  imageUrl?: string;
  priceLevel?: string;
}

interface SpotCardProps {
  spot: SpotCardData;
}

export default function SpotCard({ spot }: SpotCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggle = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  return (
    <article
      className="spot-card liquid-glass rounded-2xl border border-foreground/[0.06] bg-foreground/[0.015] overflow-hidden"
    >
      {/* Card Header — always visible */}
      <button
        type="button"
        onClick={toggle}
        aria-expanded={isExpanded}
        className="flex w-full items-center justify-between gap-4 p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 min-h-[var(--touch-target-min)]"
      >
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-foreground/[0.06] bg-purple-500/[0.08]">
            <MapPin className="h-5 w-5 text-purple-400" aria-hidden />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold tracking-tight text-foreground/90">
              {spot.name}
            </h3>
            <p className="mt-0.5 text-xs font-medium text-foreground/45">
              {spot.category}
              {spot.priceLevel && (
                <span className="ml-2 text-foreground/30">
                  {spot.priceLevel}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-3">
          {spot.rating != null && (
            <div className="flex items-center gap-1 text-purple-400">
              <Star className="h-4 w-4 fill-current" aria-hidden />
              <span className="text-sm font-bold">{spot.rating}</span>
            </div>
          )}
          <ChevronDown
            className={`h-5 w-5 text-foreground/30 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
            aria-hidden
          />
        </div>
      </button>

      {/* Expandable Details — hardware-accelerated grid-row transition */}
      <div
        className="spot-card-details"
        aria-hidden={!isExpanded}
      >
        <div className="spot-card-details-inner">
          <div className="border-t border-foreground/[0.06] px-5 pb-5 pt-4 space-y-3">
            {spot.address && (
              <div className="flex items-start gap-2 text-sm text-foreground/60">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-purple-400/60" aria-hidden />
                <span>{spot.address}</span>
              </div>
            )}
            {spot.hours && (
              <div className="flex items-start gap-2 text-sm text-foreground/60">
                <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-purple-400/60" aria-hidden />
                <span>{spot.hours}</span>
              </div>
            )}
            {spot.reviewCount != null && (
              <div className="flex items-start gap-2 text-sm text-foreground/60">
                <Star className="mt-0.5 h-4 w-4 flex-shrink-0 text-purple-400/60" aria-hidden />
                <span>
                  {spot.reviewCount.toLocaleString()} reviews
                </span>
              </div>
            )}
            {spot.mapsUrl && (
              <a
                href={spot.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-xs font-bold text-blue-400 transition-colors hover:bg-blue-500/20 min-h-[var(--touch-target-min)]"
              >
                <Navigation className="h-4 w-4" aria-hidden />
                Get Directions
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

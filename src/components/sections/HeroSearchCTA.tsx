"use client";

import { useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";

/**
 * The only interactive part of the hero: scrolls to and focuses the city
 * search input. Kept as a tiny client island so the rest of `HeroHeader`
 * can stay a server component (INP: no animation-library JS above the fold).
 */
export default function HeroSearchCTA() {
  const focusTimeoutRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (focusTimeoutRef.current) {
        window.clearTimeout(focusTimeoutRef.current);
      }
    },
    []
  );

  return (
    <a
      href="#city-search"
      className="btn-primary group"
      onClick={(event) => {
        event.preventDefault();
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const searchInput = document.getElementById("city-search");
        searchInput?.scrollIntoView({
          behavior: reduceMotion ? "auto" : "smooth",
          block: "center",
        });
        if (focusTimeoutRef.current) {
          window.clearTimeout(focusTimeoutRef.current);
        }
        focusTimeoutRef.current = window.setTimeout(
          () => searchInput?.focus(),
          reduceMotion ? 0 : 200
        );
      }}
    >
      Search cities
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
    </a>
  );
}

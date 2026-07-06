"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Hero ambient backdrop.
 *
 * - LCP-safe: a still WebP (`/images/hero/home-hero.webp`) paints immediately
 *   as the base layer with `priority`.
 * - Progressive enhancement: the looping coastal video fades in on top, but
 *   only when the user has NOT requested reduced motion. Under
 *   `prefers-reduced-motion: reduce` the still alone is shown — matching the
 *   app-wide motion policy. `useReducedMotion` is SSR-safe, so no mount gate /
 *   effect is needed.
 * - A Paper gradient scrim keeps the left/lower area calm so the headline and
 *   lede stay readable (the still itself keeps its quiet sky on the left).
 */
export default function HeroBackground() {
  const shouldReduceMotion = useReducedMotion();
  // Living Atlas spillover: visitors browsing in their local evening get the
  // dusk edition of the coastal loop. Decided after mount (SSR renders the
  // default) so hydration stays clean; the video lazy-fades in regardless.
  const [isEvening, setIsEvening] = useState(false);

  useEffect(() => {
    const hour = new Date().getHours();
    const evening = hour >= 17 && hour < 22;
    queueMicrotask(() => setIsEvening(evening));
  }, []);

  return (
    <div className="absolute inset-0 -z-10" aria-hidden="true">
      {/* Base still — LCP element */}
      <Image
        src="/images/hero/home-hero.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        quality={85}
        className="object-cover"
      />

      {/* Ambient loop, layered over the still */}
      {!shouldReduceMotion && (
        <video
          key={isEvening ? "dusk" : "day"}
          className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-1000"
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          poster={
            isEvening ? "/videos/home-hero-loop-dusk-poster.webp" : "/videos/home-hero-loop-poster.webp"
          }
          onCanPlay={(event) => {
            event.currentTarget.style.opacity = "1";
          }}
        >
          {isEvening ? (
            <>
              <source src="/videos/home-hero-loop-dusk.webm" type="video/webm" />
              <source src="/videos/home-hero-loop-dusk.mp4" type="video/mp4" />
            </>
          ) : (
            <>
              <source src="/videos/home-hero-loop.webm" type="video/webm" />
              <source src="/videos/home-hero-loop.mp4" type="video/mp4" />
            </>
          )}
        </video>
      )}

      {/* Paper scrim: strong on the left (headline) easing to clear on the right */}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--background)_0%,color-mix(in_oklab,var(--background)_88%,transparent)_38%,color-mix(in_oklab,var(--background)_45%,transparent)_72%,color-mix(in_oklab,var(--background)_30%,transparent)_100%)]" />
      {/* Bottom fade into the page canvas */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-[linear-gradient(180deg,transparent_0%,var(--background)_100%)]" />
    </div>
  );
}

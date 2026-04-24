import * as React from "react";
import Link from "next/link";
import { cx } from "./cx";

/**
 * Deterministic cover gradient — fallback when no photo is available.
 * The hue is derived from the city id so that each city gets a stable,
 * recognisable colour in listings. Saturation stays low for a paper-like feel.
 */
function coverGradient(seed: number): string {
  const hue = Math.abs(Math.floor(seed)) % 360;
  const h2 = (hue + 40) % 360;
  return `linear-gradient(135deg, oklch(0.72 0.08 ${hue}) 0%, oklch(0.48 0.1 ${h2}) 100%)`;
}

export interface CoverProps {
  /** Stable integer seed — typically city id. */
  seed?: number;
  /** Optional image URL. If omitted, a gradient is used. */
  src?: string | null;
  alt?: string;
  /** Optional CSS view-transition-name, e.g. `city-${id}`. */
  transitionName?: string;
  className?: string;
  children?: React.ReactNode;
  /** Enable the ken-burns hover zoom on image covers. */
  interactive?: boolean;
  priority?: boolean;
}

/**
 * Cover — an image-or-gradient surface with a subtle bottom scrim
 * so overlaid text stays legible.
 *
 * Uses plain <img> with lazy loading (no framer-motion) for low above-fold JS.
 */
export function Cover({
  seed = 0,
  src,
  alt = "",
  transitionName,
  className,
  children,
  interactive = false,
  priority = false,
}: CoverProps) {
  const bgStyle: React.CSSProperties = src
    ? {}
    : { backgroundImage: coverGradient(seed) };
  const vtStyle: React.CSSProperties = transitionName
    ? ({ viewTransitionName: transitionName } as React.CSSProperties)
    : {};
  return (
    <div
      className={cx(
        "relative h-full w-full overflow-hidden bg-[color:var(--color-surface-muted)]",
        className,
      )}
      style={{ ...bgStyle, ...vtStyle }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          className={cx(
            "absolute inset-0 h-full w-full object-cover",
            interactive && "atlas-image-zoom",
          )}
        />
      ) : null}
      {/* Bottom scrim for caption legibility */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/55 via-black/15 to-transparent"
      />
      {children ? (
        <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-5">
          {children}
        </div>
      ) : null}
    </div>
  );
}

/**
 * CityCard — image-led discovery card.
 * One consistent aspect ratio, one consistent content block, full-card link.
 */
export interface CityCardProps {
  id: number;
  name: string;
  country: string;
  lat: number;
  lng: number;
  imageSrc?: string | null;
  priority?: boolean;
  /** Size variant controls the aspect ratio for different grid densities. */
  ratio?: "square" | "portrait" | "landscape";
  className?: string;
  footer?: React.ReactNode;
}
export function CityCard({
  id,
  name,
  country,
  lat,
  lng,
  imageSrc,
  priority,
  ratio = "portrait",
  className,
  footer,
}: CityCardProps) {
  const aspect =
    ratio === "square"
      ? "aspect-square"
      : ratio === "landscape"
        ? "aspect-[4/3]"
        : "aspect-[3/4]";
  return (
    <Link
      href={`/cities/${id}?lat=${lat}&lng=${lng}`}
      prefetch={false}
      className={cx(
        "group relative block overflow-hidden rounded-[var(--radius-lg)] bg-[color:var(--color-surface-muted)]",
        "border border-[color:var(--color-line)] transition-colors duration-[var(--duration-base)] ease-[var(--ease-out)] hover:border-[color:var(--color-foreground)]",
        aspect,
        className,
      )}
      aria-label={`${name}, ${country}`}
    >
      <Cover
        seed={id}
        src={imageSrc}
        alt=""
        transitionName={`city-cover-${id}`}
        interactive
        priority={priority}
      >
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h3
              className="truncate font-[family-name:var(--font-display)] text-xl font-medium tracking-[-0.01em] text-white sm:text-2xl"
              style={{ viewTransitionName: `city-name-${id}` } as React.CSSProperties}
            >
              {name}
            </h3>
            <p className="mt-0.5 truncate text-xs font-semibold uppercase tracking-wider text-white/85">
              {country}
            </p>
          </div>
          {footer}
        </div>
      </Cover>
    </Link>
  );
}

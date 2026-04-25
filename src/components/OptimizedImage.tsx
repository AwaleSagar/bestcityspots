"use client";

import { useState, useRef, useEffect, useCallback, memo, useMemo } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { decode } from "blurhash";
import { useNetworkQuality } from "@/hooks/useNetworkQuality";
import { generateSizes, getQualityValue } from "@/lib/image-transforms";

interface OptimizedImageProps {
  /** Supabase storage URL for the image */
  src: string;
  /** BlurHash string for LQIP placeholder */
  blurhash?: string;
  /** Alt text for accessibility */
  alt: string;
  /** Optional fixed width (defaults to fill mode) */
  width?: number;
  /** Optional fixed height (defaults to fill mode) */
  height?: number;
  /** CSS class for the container */
  className?: string;
  /** Skip lazy loading for above-fold images */
  priority?: boolean;
  /** Object fit mode */
  objectFit?: "cover" | "contain" | "fill";
  /** Callback when image loads successfully */
  onLoad?: () => void;
  /** Callback when image fails to load */
  onError?: () => void;
}

// Animation variants for the staged reveal
const imageVariants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94] as const, // ease-out-quad (Bezier curve)
    },
  },
};

// BlurHash placeholder dimensions (small for fast decode)
const PLACEHOLDER_WIDTH = 32;
const PLACEHOLDER_HEIGHT = 32;

function shouldBypassNextImageOptimization(src: string): boolean {
  try {
    return new URL(src).pathname.includes("/storage/v1/object/public/place_images/");
  } catch {
    return src.includes("/storage/v1/object/public/place_images/");
  }
}

/**
 * Decode BlurHash to a base64 data URL for instant placeholder rendering
 */
function blurhashToDataURL(hash: string): string | null {
  try {
    const pixels = decode(hash, PLACEHOLDER_WIDTH, PLACEHOLDER_HEIGHT);

    // Create canvas and render pixels
    const canvas = document.createElement("canvas");
    canvas.width = PLACEHOLDER_WIDTH;
    canvas.height = PLACEHOLDER_HEIGHT;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const imageData = ctx.createImageData(PLACEHOLDER_WIDTH, PLACEHOLDER_HEIGHT);
    imageData.data.set(pixels);
    ctx.putImageData(imageData, 0, 0);

    return canvas.toDataURL();
  } catch {
    return null;
  }
}

/**
 * OptimizedImage Component
 *
 * A high-performance image component featuring:
 * - BlurHash LQIP placeholder for instant visual feedback
 * - Network-aware quality selection based on connection speed
 * - DPR-aware responsive loading for retina displays
 * - Staged reveal animation with GPU-accelerated transforms
 * - Intersection Observer for lazy loading
 */
function OptimizedImageInner({
  src,
  blurhash,
  alt,
  width,
  height,
  className = "",
  priority = false,
  objectFit = "cover",
  onLoad,
  onError,
}: OptimizedImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [hasError, setHasError] = useState(false);

  // Network quality detection for adaptive quality
  const { quality } = useNetworkQuality();

  // Generate BlurHash placeholder (memoized to avoid recalculation)
  const placeholderUrl = useMemo(() => {
    if (blurhash && blurhash.length > 0) {
      return blurhashToDataURL(blurhash);
    }
    return null;
  }, [blurhash]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || isInView) return;

    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "200px", // Start loading 200px before entering viewport
        threshold: 0,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [priority, isInView]);

  // Handle image load
  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  // Handle image error
  const handleError = useCallback(() => {
    setHasError(true);
    onError?.();
  }, [onError]);

  // Get quality value based on network conditions
  const imageQuality = getQualityValue(quality);

  // Generate sizes for responsive loading (Next.js handles srcset generation)
  const sizes = generateSizes(width);
  const bypassOptimization = useMemo(() => shouldBypassNextImageOptimization(src), [src]);

  // Use fill mode if no explicit dimensions
  const useFillMode = !width || !height;

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        width: useFillMode ? "100%" : width,
        height: useFillMode ? "100%" : height,
      }}
    >
      {/* BlurHash Placeholder Layer */}
      {placeholderUrl && !isLoaded && (
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${placeholderUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(20px)",
            transform: "scale(1.1)", // Prevent blur edges from showing
          }}
          aria-hidden="true"
        />
      )}

      {/* Fallback gradient for missing blurhash */}
      {!placeholderUrl && !isLoaded && !hasError && (
        <div
          className="from-muted/50 to-muted absolute inset-0 z-0 animate-pulse bg-gradient-to-br"
          aria-hidden="true"
        />
      )}

      {/* Error state */}
      {hasError && (
        <div className="bg-muted/50 absolute inset-0 z-0 flex items-center justify-center">
          <span className="text-muted-foreground text-sm">Image unavailable</span>
        </div>
      )}

      {/* Main Image with Staged Reveal Animation */}
      {isInView && !hasError && (
        <motion.div
          initial="hidden"
          animate={isLoaded ? "visible" : "hidden"}
          variants={imageVariants}
          className="absolute inset-0 z-10"
          style={{
            willChange: "transform, opacity",
          }}
        >
          {useFillMode ? (
            <Image
              src={src}
              alt={alt}
              fill
              sizes={sizes}
              unoptimized={bypassOptimization}
              style={{ objectFit }}
              onLoad={handleLoad}
              onError={handleError}
              priority={priority}
              quality={imageQuality}
            />
          ) : (
            <Image
              src={src}
              alt={alt}
              width={width}
              height={height}
              sizes={sizes}
              unoptimized={bypassOptimization}
              style={{ objectFit }}
              onLoad={handleLoad}
              onError={handleError}
              priority={priority}
              quality={imageQuality}
            />
          )}
        </motion.div>
      )}
    </div>
  );
}

// Memoize to prevent unnecessary re-renders
export const OptimizedImage = memo(OptimizedImageInner);

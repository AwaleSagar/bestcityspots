"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { decode } from "blurhash";
import { ImageOff } from "lucide-react";
import { generateSizes } from "@/lib/image-transforms";
import { useHydrated } from "@/hooks/useStoredValue";
import { cn } from "@/components/ui/cn";

const PLACEHOLDER_SIZE = 32;
const placeholderCache = new Map<string, string | null>();

function blurhashToDataUrl(hash: string): string | null {
  const cached = placeholderCache.get(hash);
  if (cached !== undefined) return cached;
  try {
    const pixels = decode(hash, PLACEHOLDER_SIZE, PLACEHOLDER_SIZE);
    const canvas = document.createElement("canvas");
    canvas.width = PLACEHOLDER_SIZE;
    canvas.height = PLACEHOLDER_SIZE;
    const context = canvas.getContext("2d");
    if (!context) return null;
    const imageData = context.createImageData(PLACEHOLDER_SIZE, PLACEHOLDER_SIZE);
    imageData.data.set(pixels);
    context.putImageData(imageData, 0, 0);
    const url = canvas.toDataURL();
    placeholderCache.set(hash, url);
    return url;
  } catch {
    placeholderCache.set(hash, null);
    return null;
  }
}

/** Cached Google photos in Supabase Storage are already sized; skip re-encoding. */
function isPreSizedStorageImage(src: string): boolean {
  return src.includes("/storage/v1/object/public/place_images/");
}

interface PlaceImageProps {
  src?: string;
  blurhash?: string;
  alt: string;
  priority?: boolean;
  className?: string;
}

/**
 * Place photo in a fixed-ratio frame (no layout shift). A BlurHash preview
 * fills the frame until the photo loads; missing/broken photos show a quiet
 * placeholder instead of a broken image.
 */
export function PlaceImage({ src, blurhash, alt, priority = false, className }: PlaceImageProps) {
  const hydrated = useHydrated();
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const placeholder = useMemo(
    () => (hydrated && blurhash ? blurhashToDataUrl(blurhash) : null),
    [hydrated, blurhash]
  );

  return (
    <div className={cn("bg-sunken relative overflow-hidden rounded-md", className)}>
      {placeholder && status !== "loaded" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={placeholder}
          alt=""
          aria-hidden
          className="absolute inset-0 size-full scale-110 object-cover blur-md"
        />
      ) : null}
      {src && status !== "error" ? (
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes={generateSizes(320)}
          unoptimized={isPreSizedStorageImage(src)}
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
          className={cn(
            "ease-standard object-cover transition-opacity duration-200",
            status === "loaded" ? "opacity-100" : "opacity-0"
          )}
        />
      ) : (
        <div className="text-ink-subtle absolute inset-0 flex items-center justify-center">
          <ImageOff aria-hidden className="size-5" />
          <span className="sr-only">No photo available</span>
        </div>
      )}
    </div>
  );
}

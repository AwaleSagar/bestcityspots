"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Curated location-aware video backgrounds.
 * Returns an appropriate ambient video URL based on rough location or a default.
 */
const VIDEO_SOURCES: Record<string, string> = {
  default:
    "https://cdn.coverr.co/videos/coverr-aerial-view-of-city-skyline-1573/1080p.mp4",
  europe:
    "https://cdn.coverr.co/videos/coverr-night-city-view-4738/1080p.mp4",
  asia: "https://cdn.coverr.co/videos/coverr-busy-street-in-a-city-at-night-2548/1080p.mp4",
  americas:
    "https://cdn.coverr.co/videos/coverr-aerial-view-of-city-skyline-1573/1080p.mp4",
};

function getVideoForCoords(lat: number, lng: number): string {
  if (lng >= -30 && lng <= 60 && lat >= 35 && lat <= 72)
    return VIDEO_SOURCES.europe;
  if (lng >= 60 && lng <= 180 && lat >= -10 && lat <= 55)
    return VIDEO_SOURCES.asia;
  if (lng >= -170 && lng <= -30) return VIDEO_SOURCES.americas;
  return VIDEO_SOURCES.default;
}

export default function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoSrc, setVideoSrc] = useState(VIDEO_SOURCES.default);
  const [isLoaded, setIsLoaded] = useState(false);

  // Location-aware: pick region-appropriate video
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setVideoSrc(
          getVideoForCoords(
            position.coords.latitude,
            position.coords.longitude
          )
        );
      },
      () => {
        // Silently use default if permission denied
      },
      { timeout: 5000, maximumAge: 300000 }
    );
  }, []);

  return (
    <video
      ref={videoRef}
      className={`hero-video-bg transition-opacity duration-1000 ${isLoaded ? "opacity-100" : "opacity-0"}`}
      src={videoSrc}
      autoPlay
      muted
      loop
      playsInline
      preload="none"
      aria-hidden="true"
      onLoadedData={() => setIsLoaded(true)}
    />
  );
}

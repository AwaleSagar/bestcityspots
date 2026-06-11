"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";

export interface CityMapMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
  saved?: boolean;
}

interface CityMapProps {
  centerLat: number;
  centerLng: number;
  /** Accessible label, e.g. "Map of Lisbon". */
  label: string;
  zoom?: number;
  markers?: CityMapMarker[];
  activeId?: string | null;
  onMarkerSelect?: (id: string) => void;
  className?: string;
}

/**
 * US-05/US-06 (product audit AF-1): interactive city map.
 *
 * Leaflet + OpenStreetMap tiles — zero paid APIs. Implementation follows the
 * established Next.js pattern (researched: react-leaflet#956, browser-
 * component guidance): client component, Leaflet imported dynamically inside
 * an effect so no map JS reaches the server bundle or the initial client
 * chunk, and initialization deferred until the container approaches the
 * viewport (IntersectionObserver). Markers are CSS `divIcon`s, which avoids
 * the classic bundler marker-asset breakage and keeps them theme-aware.
 *
 * CLS-safe: the wrapper carries a fixed aspect ratio whether or not the map
 * has loaded. Motion: zoom/pan animations follow prefers-reduced-motion.
 */
export default function CityMap({
  centerLat,
  centerLng,
  label,
  zoom = 12,
  markers = [],
  activeId = null,
  onMarkerSelect,
  className = "",
}: CityMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerLayerRef = useRef<LayerGroup | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const onSelectRef = useRef(onMarkerSelect);
  onSelectRef.current = onMarkerSelect;

  const [nearViewport, setNearViewport] = useState(false);
  const [ready, setReady] = useState(false);

  // Defer everything until the map area is close to the viewport.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setNearViewport(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNearViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: "240px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Initialize Leaflet once visible; tear down on unmount.
  useEffect(() => {
    if (!nearViewport || mapRef.current) return;
    let cancelled = false;

    (async () => {
      const [{ default: L }] = await Promise.all([
        import("leaflet"),
        // Side-effect import: Leaflet's stylesheet, loaded with the chunk.
        import("leaflet/dist/leaflet.css" as string),
      ]);
      if (cancelled || !containerRef.current || mapRef.current) return;

      const reduceMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const map = L.map(containerRef.current, {
        center: [centerLat, centerLng],
        zoom,
        scrollWheelZoom: false, // page scroll must win; zoom via controls/keyboard
        keyboard: true,
        zoomAnimation: !reduceMotion,
        fadeAnimation: !reduceMotion,
        markerZoomAnimation: !reduceMotion,
      });

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      leafletRef.current = L;
      mapRef.current = map;
      markerLayerRef.current = L.layerGroup().addTo(map);
      setReady(true);
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
    };
    // Center/zoom are render-stable per page; markers handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearViewport]);

  // Sync markers + active highlight with the current list state (US-06).
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const layer = markerLayerRef.current;
    if (!ready || !L || !map || !layer) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    layer.clearLayers();

    const bounds: [number, number][] = [];
    for (const marker of markers) {
      const isActive = marker.id === activeId;
      const classNames = [
        "bcs-marker",
        marker.saved ? "bcs-marker--saved" : "",
        isActive ? "bcs-marker--active" : "",
      ]
        .filter(Boolean)
        .join(" ");

      const icon = L.divIcon({
        className: classNames,
        html: '<span class="bcs-marker-dot" aria-hidden="true"></span>',
        iconSize: isActive ? [22, 22] : [16, 16],
        iconAnchor: isActive ? [11, 11] : [8, 8],
      });

      const m = L.marker([marker.lat, marker.lng], {
        icon,
        keyboard: true,
        title: marker.name,
        alt: marker.name,
      });
      m.bindTooltip(marker.name, { direction: "top", offset: [0, -8] });
      m.on("click", () => onSelectRef.current?.(marker.id));
      m.addTo(layer);
      bounds.push([marker.lat, marker.lng]);
    }

    if (bounds.length > 0) {
      map.fitBounds(L.latLngBounds(bounds).pad(0.25), { animate: !reduceMotion, maxZoom: 15 });
    }
  }, [ready, markers, activeId]);

  return (
    <div
      role="region"
      aria-label={label}
      className={`bcs-map border-line relative aspect-[16/10] w-full overflow-hidden rounded-2xl border ${className}`}
    >
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />
      {!ready && (
        <div className="bg-surface-strong absolute inset-0 flex items-center justify-center">
          <p className="text-muted text-xs font-semibold tracking-[0.18em] uppercase">
            Loading map…
          </p>
        </div>
      )}
    </div>
  );
}

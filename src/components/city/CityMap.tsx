"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import { cn } from "@/components/ui/cn";

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
  /** Accessible name, e.g. "Map of Lisbon". */
  label: string;
  zoom?: number;
  markers?: readonly CityMapMarker[];
  activeId?: string | null;
  onMarkerSelect?: (id: string) => void;
  className?: string;
}

const EMPTY: readonly CityMapMarker[] = [];

/**
 * Leaflet + OpenStreetMap (no paid API). Leaflet and its CSS load only when
 * the map nears the viewport, so no map code ships in the initial bundle.
 * Fixed aspect ratio → no layout shift. Markers are CSS divIcons styled in
 * globals.css (theme-aware). The map is supplementary: every marker also
 * exists as a list item, which is the accessible path.
 */
export function CityMap({
  centerLat,
  centerLng,
  label,
  zoom = 12,
  markers = EMPTY,
  activeId = null,
  onMarkerSelect,
  className,
}: CityMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const onSelectRef = useRef(onMarkerSelect);
  const [nearViewport, setNearViewport] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onSelectRef.current = onMarkerSelect;
  }, [onMarkerSelect]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNearViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: "240px" }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!nearViewport || mapRef.current) return;
    let cancelled = false;
    (async () => {
      const [{ default: L }] = await Promise.all([
        import("leaflet"),
        import("leaflet/dist/leaflet.css" as string),
      ]);
      if (cancelled || !containerRef.current || mapRef.current) return;
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const map = L.map(containerRef.current, {
        center: [centerLat, centerLng],
        zoom,
        scrollWheelZoom: false,
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
      layerRef.current = L.layerGroup().addTo(map);
      setReady(true);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
    // Center/zoom are fixed per page; markers sync in the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearViewport]);

  // Re-draw markers when the visible set, saved state or active item changes.
  useEffect(() => {
    const L = leafletRef.current;
    const layer = layerRef.current;
    if (!ready || !L || !layer) return;
    layer.clearLayers();
    for (const marker of markers) {
      const active = marker.id === activeId;
      const icon = L.divIcon({
        className: cn(
          "bcs-marker",
          marker.saved && "bcs-marker--saved",
          active && "bcs-marker--active"
        ),
        html: '<span class="bcs-marker-dot" aria-hidden="true"></span>',
        iconSize: active ? [22, 22] : [16, 16],
        iconAnchor: active ? [11, 11] : [8, 8],
      });
      L.marker([marker.lat, marker.lng], {
        icon,
        keyboard: true,
        title: marker.name,
        alt: marker.name,
        zIndexOffset: active ? 1000 : 0,
      })
        .bindTooltip(marker.name, { direction: "top", offset: [0, -8] })
        .on("click", () => onSelectRef.current?.(marker.id))
        .addTo(layer);
    }
  }, [ready, markers, activeId]);

  // Fit the view only when the set of places changes (not on hover).
  const boundsKey = useMemo(() => markers.map((marker) => marker.id).join("|"), [markers]);
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map || markers.length === 0) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    map.fitBounds(
      L.latLngBounds(markers.map((marker) => [marker.lat, marker.lng] as [number, number])).pad(
        0.25
      ),
      { animate: !reduceMotion, maxZoom: 15 }
    );
    // `markers` identity changes with saved/active state; boundsKey tracks the set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, boundsKey]);

  return (
    <div
      role="region"
      aria-label={label}
      className={cn(
        "border-rule bg-sunken relative isolate aspect-[4/3] w-full overflow-hidden rounded-md border sm:aspect-[16/10]",
        className
      )}
    >
      <div ref={containerRef} className="absolute inset-0" />
      {ready ? null : (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-ink-muted text-sm">Loading map…</p>
        </div>
      )}
    </div>
  );
}

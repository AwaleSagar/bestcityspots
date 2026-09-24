"use client";

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Map as MapIcon, MapPinOff } from "lucide-react";
import type { Landmark, PlaceType } from "@/lib/places";
import { topK } from "@/lib/saved-places";
import { decodeSharedList, SHARE_PARAM } from "@/lib/share-list";
import { useAnalytics } from "@/lib/useAnalytics";
import { usePlaceNotes } from "@/hooks/usePlaceNotes";
import { useSavedPlaces } from "@/hooks/useSavedPlaces";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { tabId, Tabs } from "@/components/ui/Tabs";
import { CityMap, type CityMapMarker } from "../CityMap";
import {
  PLACE_TABS,
  PLACES_PER_TAB,
  PRICE_FILTERS,
  placeDomId,
  tabNoun,
  toSavedPlace,
  type PriceFilter,
} from "./place-helpers";
import { PlaceCard } from "./PlaceCard";
import { PlanPanel } from "./PlanPanel";
import { SharedListNotice, type ResolvedSharedPlace } from "./SharedListNotice";

interface PlacesExplorerProps {
  cityName: string;
  centerLat: number;
  centerLng: number;
  places: Readonly<Record<PlaceType, readonly Landmark[]>>;
  /** US-12 anonymous aggregate save totals keyed by place id. */
  saveCounts: Readonly<Record<string, number>>;
  /** US-13: partner id for Stays links; omitted when not configured. */
  bookingAffiliateId?: string;
}

const PANEL_ID = "places";

function placesFor(places: PlacesExplorerProps["places"], type: PlaceType): readonly Landmark[] {
  switch (type) {
    case "landmarks":
      return places.landmarks;
    case "restaurants":
      return places.restaurants;
    case "hotels":
      return places.hotels;
  }
}

/**
 * Sights / Food / Stays explorer with a synced map, saving, private notes,
 * a day plan and share links. All personal state lives in localStorage.
 */
export function PlacesExplorer({
  cityName,
  centerLat,
  centerLng,
  places,
  saveCounts,
  bookingAffiliateId,
}: PlacesExplorerProps) {
  const [tab, setTab] = useState<PlaceType>("landmarks");
  const [price, setPrice] = useState<PriceFilter>("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [imported, setImported] = useState(false);
  const { trackAction } = useAnalytics();
  const saved = useSavedPlaces();
  const notes = usePlaceNotes(cityName);
  const searchParams = useSearchParams();
  const saveCountById = useMemo(() => new Map(Object.entries(saveCounts)), [saveCounts]);

  const visible = useMemo(() => {
    const all = placesFor(places, tab);
    const filtered = price === "all" ? all : all.filter((place) => place.priceLevel === price);
    return topK([...filtered], PLACES_PER_TAB, (place) => place.userRatingCount ?? 0);
  }, [places, tab, price]);

  const savedForCity = useMemo(
    () => saved.places.filter((place) => place.city === cityName),
    [saved.places, cityName]
  );
  const savedIds = useMemo(() => new Set(savedForCity.map((place) => place.id)), [savedForCity]);

  const markers = useMemo<CityMapMarker[]>(
    () =>
      visible.flatMap((place) => {
        const lat = place.location?.latitude;
        const lng = place.location?.longitude;
        if (typeof lat !== "number" || typeof lng !== "number") return [];
        return [
          { id: place.id, name: place.displayName.text, lat, lng, saved: savedIds.has(place.id) },
        ];
      }),
    [visible, savedIds]
  );

  // US-08: a `?shared=` token only counts when minted for this city, and ids
  // resolve against places already on the page (zero extra API calls).
  const shared = useMemo(() => {
    const token = searchParams.get(SHARE_PARAM);
    const decoded = token ? decodeSharedList(token) : null;
    if (!decoded || decoded.city !== cityName) return null;
    const byId = new Map<string, { place: Landmark; type: PlaceType }>();
    for (const { id } of PLACE_TABS) {
      for (const place of placesFor(places, id)) byId.set(place.id, { place, type: id });
    }
    const days = new Map(Object.entries(decoded.days));
    const resolved: ResolvedSharedPlace[] = decoded.ids.flatMap((id) => {
      const match = byId.get(id);
      return match ? [{ ...match, day: days.get(id) }] : [];
    });
    return { resolved, unresolved: decoded.ids.length - resolved.length };
  }, [searchParams, cityName, places]);

  const toggleSave = (place: Landmark, type: PlaceType) => {
    if (savedIds.has(place.id)) {
      saved.remove(place.id, cityName);
      trackAction("remove_save");
      return;
    }
    saved.add(toSavedPlace(place, type, cityName));
    trackAction("save_place");
    // US-12: anonymous aggregate counter — the place id only, never the list.
    void fetch("/api/places/save-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placeId: place.id }),
      keepalive: true,
    }).catch(() => {});
  };

  const saveNote = (placeId: string, note: string) => {
    const had = Boolean(notes.getNote(placeId));
    notes.setNote(placeId, note);
    if (note.trim()) trackAction("add_note");
    else if (had) trackAction("delete_note");
  };

  const selectFromMap = useCallback((id: string) => {
    setActiveId(id);
    const card = document.getElementById(placeDomId(id));
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    card?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
  }, []);

  const importShared = () => {
    if (!shared) return;
    saved.addMany(
      shared.resolved.map(({ place, type, day }) => ({
        ...toSavedPlace(place, type, cityName),
        day,
      }))
    );
    setImported(true);
  };

  const tabs = PLACE_TABS.map((item) => ({
    id: item.id,
    label: item.label,
    count: placesFor(places, item.id).length,
  }));

  return (
    <div>
      {shared ? (
        <SharedListNotice
          cityName={cityName}
          places={shared.resolved}
          unresolvedCount={shared.unresolved}
          imported={imported}
          onImport={importShared}
        />
      ) : null}

      <Tabs
        items={tabs}
        value={tab}
        onChange={(next) => {
          setTab(next);
          setPrice("all");
          setActiveId(null);
        }}
        idPrefix={PANEL_ID}
        label={`Places in ${cityName}`}
      />

      <div
        id={`${PANEL_ID}-panel`}
        role="tabpanel"
        aria-labelledby={tabId(PANEL_ID, tab)}
        tabIndex={-1}
        className="pt-4 focus-visible:outline-none"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          {tab === "landmarks" ? (
            <p className="text-ink-muted text-sm">
              Top {tabNoun(tab)}, ordered by traveler reviews.
            </p>
          ) : (
            <SegmentedControl
              label="Price"
              options={PRICE_FILTERS}
              value={price}
              onChange={setPrice}
            />
          )}
          {markers.length > 0 ? (
            <Button
              size="sm"
              variant="ghost"
              aria-expanded={showMap}
              aria-controls="places-map"
              onClick={() => setShowMap((open) => !open)}
              className="xl:hidden"
            >
              <MapIcon aria-hidden />
              {showMap ? "Hide map" : "Show map"}
            </Button>
          ) : null}
        </div>

        <div className="mt-4 grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
          {visible.length > 0 ? (
            <ol className="space-y-3">
              {visible.map((place, index) => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  type={tab}
                  rank={index + 1}
                  cityName={cityName}
                  saved={savedIds.has(place.id)}
                  saveCount={saveCountById.get(place.id) ?? 0}
                  note={notes.getNote(place.id)}
                  active={activeId === place.id}
                  bookingAffiliateId={bookingAffiliateId}
                  onToggleSave={() => toggleSave(place, tab)}
                  onSaveNote={(note) => saveNote(place.id, note)}
                  onFocusPlace={setActiveId}
                  onOutboundClick={(kind) =>
                    trackAction(kind === "maps" ? "click_maps_link" : "click_affiliate")
                  }
                  maxNoteLength={notes.maxLength}
                />
              ))}
            </ol>
          ) : (
            <EmptyState
              icon={<MapPinOff aria-hidden />}
              title={
                price === "all" ? `No ${tabNoun(tab)} listed yet` : "Nothing at this price level"
              }
              action={
                price === "all" ? null : (
                  <Button size="sm" onClick={() => setPrice("all")}>
                    Show any price
                  </Button>
                )
              }
            >
              {price === "all"
                ? `We haven't collected ${tabNoun(tab)} for ${cityName} yet. Try another tab.`
                : "Price data is sparse for some places — widen the filter to see everything."}
            </EmptyState>
          )}

          {markers.length > 0 ? (
            <div id="places-map" className={showMap ? "block" : "hidden xl:block"}>
              <div className="xl:sticky xl:top-36">
                <CityMap
                  centerLat={centerLat}
                  centerLng={centerLng}
                  label={`Map of ${tabNoun(tab)} in ${cityName}`}
                  markers={markers}
                  activeId={activeId}
                  onMarkerSelect={selectFromMap}
                  className="xl:aspect-[4/5]"
                />
                <p className="text-ink-muted mt-2 text-xs">
                  Blue: listed · Gold: saved. Select a pin to jump to its card.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {savedForCity.length > 0 ? (
        <PlanPanel
          cityName={cityName}
          places={savedForCity}
          onSetDay={(id, day) => saved.setDay(id, cityName, day)}
          onRemove={(id) => {
            saved.remove(id, cityName);
            trackAction("remove_save");
          }}
        />
      ) : null}
    </div>
  );
}

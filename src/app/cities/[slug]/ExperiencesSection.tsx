"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { decodeSharedList, encodeSharedList, SHARE_PARAM, type SharedList } from "./share-list";
import CityMap from "@/components/features/city/CityMap";
import { OptimizedImage } from "@/components/OptimizedImage";
import { Landmark } from "@/lib/places";
import { formatPopulation } from "@/lib/format";
import { getJsonStorageItem, getStorageItem, setJsonStorageItem } from "@/lib/storage";
import {
  getAddressContext,
  getInsiderTips,
  getLocalPulseTags,
  parseStoredNotes,
  PLACE_NOTES_STORAGE_KEY,
  sanitizeKey,
  sanitizeNotes,
  SAVED_PLACES_STORAGE_KEY,
  toNoteMap,
  topK,
  buildDayDirectionsUrl,
  MAX_ITINERARY_DAYS,
  type CityNotes,
  type SavedPlace,
} from "./experience-helpers";
import {
  EXPERIENCE_PRICE_LEVEL_LABELS,
  EXPERIENCE_PRICE_LEVELS,
  EXPERIENCE_TABS,
  getExperienceCategoryColor,
  type ExperienceTabId,
} from "./experience-theme";
import {
  Compass,
  Star,
  Bookmark,
  BookmarkCheck,
  BookmarkPlus,
  MapPin,
  Share2,
  Import,
  CalendarDays,
  Printer,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useAnalytics } from "@/lib/useAnalytics";
import { publicEnv } from "@/lib/env";

interface ExperiencesSectionProps {
  cityName: string;
  landmarks: Landmark[];
  restaurants: Landmark[];
  hotels: Landmark[];
  /** City center for the experiences map (US-05/US-06). */
  centerLat?: number;
  centerLng?: number;
  /** US-12: anonymous aggregate save totals keyed by place id. */
  saveCounts?: Record<string, number>;
}

export default function ExperiencesSection({
  cityName,
  landmarks,
  restaurants,
  hotels,
  centerLat,
  centerLng,
  saveCounts = {},
}: ExperiencesSectionProps) {
  const [activeTab, setActiveTab] = useState<ExperienceTabId>("landmarks");
  // US-13: affiliate links render only when the partner id is configured.
  const bookingAffiliateId = publicEnv().NEXT_PUBLIC_BOOKING_AFFILIATE_ID;
  // US-06: list ↔ map selection sync.
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);
  const [selectedPrice, setSelectedPrice] = useState<string | null>(null);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [placeNotes, setPlaceNotes] = useState<CityNotes>({});
  const [draftNotes, setDraftNotes] = useState<CityNotes>({});
  const [notesHydrated, setNotesHydrated] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const { trackAction } = useAnalytics();
  const shouldReduceMotion = useReducedMotion();

  // Load saved places from localStorage on mount (defer setState to avoid synchronous update in effect)
  useEffect(() => {
    const parsed = getJsonStorageItem<SavedPlace[]>(SAVED_PLACES_STORAGE_KEY, []);
    const update = () => {
      if (Array.isArray(parsed)) {
        setSavedPlaces(parsed);
      }
      setIsHydrated(true);
    };
    queueMicrotask(update);
  }, []);

  // Persist saved places when they change
  useEffect(() => {
    if (!isHydrated) return;
    setJsonStorageItem(SAVED_PLACES_STORAGE_KEY, savedPlaces);
  }, [isHydrated, savedPlaces]);

  // Load notes for this city from localStorage (defer setState to avoid synchronous update in effect)
  useEffect(() => {
    const raw = getStorageItem(PLACE_NOTES_STORAGE_KEY);
    const safeKey = sanitizeKey(cityName);
    const notesMap = parseStoredNotes(raw);
    const cityNotes = notesMap.get(safeKey) ?? {};
    const safeNotes = sanitizeNotes(cityNotes);
    const update = () => {
      setPlaceNotes(safeNotes);
      setDraftNotes(safeNotes);
      setNotesHydrated(true);
    };
    queueMicrotask(update);
  }, [cityName]);

  const persistCityNotes = (nextNotes: CityNotes) => {
    if (!notesHydrated) return;
    const raw = getStorageItem(PLACE_NOTES_STORAGE_KEY);
    const notesMap = parseStoredNotes(raw);
    notesMap.set(sanitizeKey(cityName), sanitizeNotes(nextNotes));
    setJsonStorageItem(PLACE_NOTES_STORAGE_KEY, Object.fromEntries(notesMap));
  };

  const updatePlaceNotes = (updater: (map: Map<string, string>) => void) => {
    setPlaceNotes((prev) => {
      const map = toNoteMap(prev);
      updater(map);
      const next = Object.fromEntries(map) as CityNotes;
      persistCityNotes(next);
      return next;
    });
  };

  const updateDraftNotes = (updater: (map: Map<string, string>) => void) => {
    setDraftNotes((prev) => {
      const map = toNoteMap(prev);
      updater(map);
      return Object.fromEntries(map) as CityNotes;
    });
  };

  const saveNote = (placeId: string, note: string) => {
    const trimmed = note.trim();
    const safeId = sanitizeKey(placeId);
    updatePlaceNotes((map) => {
      if (trimmed) {
        map.set(safeId, trimmed);
        trackAction("add_note");
      } else {
        map.delete(safeId);
      }
    });
  };

  const clearNote = (placeId: string) => {
    const safeId = sanitizeKey(placeId);
    const hadNote = placeNotesMap.has(safeId);
    updateDraftNotes((map) => {
      map.delete(safeId);
    });
    updatePlaceNotes((map) => {
      map.delete(safeId);
    });
    if (hadNote) {
      trackAction("delete_note");
    }
  };

  const toggleExpand = (placeId: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(placeId)) {
        next.delete(placeId);
      } else {
        next.add(placeId);
      }
      return next;
    });
  };

  const tabs = EXPERIENCE_TABS;

  const priceLevelLabels = EXPERIENCE_PRICE_LEVEL_LABELS;

  const priceLevels = EXPERIENCE_PRICE_LEVELS;

  // Logic to filter and slice data
  const rawData = useMemo(
    () =>
      activeTab === "landmarks" ? landmarks : activeTab === "restaurants" ? restaurants : hotels,
    [activeTab, hotels, landmarks, restaurants]
  );

  const filteredData = useMemo(
    () => (selectedPrice ? rawData.filter((item) => item.priceLevel === selectedPrice) : rawData),
    [rawData, selectedPrice]
  );

  // US-06 (audit AF-1): markers mirror the *currently visible* list — same
  // tab, same price filter — and reuse coordinates already fetched from the
  // Places cache. Zero additional API calls.
  const savedIdSet = useMemo(() => new Set(savedPlaces.map((p) => p.id)), [savedPlaces]);
  const mapMarkers = useMemo(
    () =>
      filteredData.flatMap((item) => {
        const lat = item.location?.latitude;
        const lng = item.location?.longitude;
        if (typeof lat !== "number" || typeof lng !== "number") return [];
        return [
          {
            id: item.id,
            name: item.displayName.text,
            lat,
            lng,
            saved: savedIdSet.has(item.id),
          },
        ];
      }),
    [filteredData, savedIdSet]
  );

  const handleMarkerSelect = useCallback((id: string) => {
    setActiveMarkerId(id);
    const card = document.getElementById(`place-card-${sanitizeKey(id)}`);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    card?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
  }, []);

  // Always take top 5 based on reviews
  // Optimized: O(n log k) partial sort instead of O(n log n) full sort
  const displayData = useMemo(
    () => topK(filteredData, 5, (item) => item.userRatingCount || 0),
    [filteredData]
  );

  const formatType = (types?: string[]) => {
    if (!types || types.length === 0) return "Point of Interest";
    const primary = types.at(0);
    if (!primary) return "Point of Interest";
    const formatted = primary.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    return formatted;
  };

  const getPriceLevel = (level?: string) => {
    if (!level) return null;
    return priceLevelLabels.get(level) || null;
  };

  const savedForCity = useMemo(
    () => savedPlaces.filter((place) => place.city === cityName),
    [cityName, savedPlaces]
  );

  const savedIds = useMemo(() => new Set(savedForCity.map((place) => place.id)), [savedForCity]);

  // ── US-08: shareable saved-places link ──────────────────────────────────
  const searchParams = useSearchParams();
  const [shareCopied, setShareCopied] = useState(false);
  const [importDone, setImportDone] = useState(false);

  const sharedList: SharedList | null = useMemo(() => {
    const token = searchParams.get(SHARE_PARAM);
    if (!token) return null;
    const decoded = decodeSharedList(token);
    // Only honor tokens minted for this city's page.
    return decoded && decoded.city === cityName ? decoded : null;
  }, [searchParams, cityName]);

  // Resolve shared IDs against the data already on the page (zero API calls).
  const allPlacesById = useMemo(() => {
    const map = new Map<
      string,
      { place: Landmark; type: "landmarks" | "restaurants" | "hotels" }
    >();
    for (const place of landmarks) map.set(place.id, { place, type: "landmarks" });
    for (const place of restaurants) map.set(place.id, { place, type: "restaurants" });
    for (const place of hotels) map.set(place.id, { place, type: "hotels" });
    return map;
  }, [landmarks, restaurants, hotels]);

  const sharedResolved = useMemo(
    () => (sharedList ? sharedList.ids.flatMap((id) => allPlacesById.get(id) ?? []) : []),
    [sharedList, allPlacesById]
  );
  const sharedUnresolvedCount = sharedList ? sharedList.ids.length - sharedResolved.length : 0;

  // ── US-10: itinerary-lite — group saved places into days ────────────────
  const assignDay = useCallback((placeId: string, day: number) => {
    setSavedPlaces((previous) =>
      previous.map((place) =>
        place.id === placeId ? { ...place, day: day > 0 ? day : undefined } : place
      )
    );
  }, []);

  const dayGroups = useMemo(() => {
    const groups = new Map<number, SavedPlace[]>();
    for (const place of savedForCity) {
      const day = place.day && place.day > 0 ? place.day : 0;
      groups.set(day, [...(groups.get(day) ?? []), place]);
    }
    return [...groups.entries()].sort((a, b) => a[0] - b[0]);
  }, [savedForCity]);

  const assignableDays = useMemo(() => {
    const maxAssigned = Math.max(0, ...savedForCity.map((place) => place.day ?? 0));
    return Math.min(maxAssigned + 1, MAX_ITINERARY_DAYS);
  }, [savedForCity]);

  const handleShareList = useCallback(async () => {
    const dayByPlaceId = Object.fromEntries(
      savedForCity.filter((place) => place.day && place.day > 0).map((p) => [p.id, p.day as number])
    );
    const token = encodeSharedList(
      cityName,
      savedForCity.map((place) => place.id),
      dayByPlaceId
    );
    const url = `${window.location.origin}${window.location.pathname}?${SHARE_PARAM}=${token}`;
    trackAction("share"); // counts the action only — never the list contents
    try {
      if (navigator.share) {
        await navigator.share({ title: `Saved places in ${cityName}`, url });
      } else {
        await navigator.clipboard.writeText(url);
        setShareCopied(true);
        window.setTimeout(() => setShareCopied(false), 2500);
      }
    } catch {
      // user dismissed the share sheet — nothing to do
    }
  }, [cityName, savedForCity, trackAction]);

  const handleImportShared = useCallback(() => {
    if (sharedResolved.length === 0) return;
    setSavedPlaces((previous) => {
      const existing = new Set(previous.map((place) => place.id));
      const additions = sharedResolved
        .filter(({ place }) => !existing.has(place.id))
        .map(({ place, type }) => ({
          id: place.id,
          city: cityName,
          name: place.displayName.text,
          type,
          address: place.formattedAddress,
          googleMapsUri: place.googleMapsUri,
          priceLevel: place.priceLevel,
          rating: place.rating,
          // US-10: shared day grouping travels with the list (v2 tokens).
          day: sharedList?.days[place.id],
        }));
      return [...previous, ...additions];
    });
    setImportDone(true);
  }, [sharedResolved, cityName, sharedList]);

  const draftNotesMap = useMemo(() => toNoteMap(draftNotes), [draftNotes]);
  const placeNotesMap = toNoteMap(placeNotes);

  const catColor = useMemo(() => getExperienceCategoryColor(activeTab), [activeTab]);

  const toggleSave = (place: Landmark, type: "landmarks" | "restaurants" | "hotels") => {
    setSavedPlaces((prev) => {
      const exists = prev.some((p) => p.id === place.id && p.city === cityName);
      if (exists) {
        trackAction("remove_save");
        return prev.filter((p) => !(p.id === place.id && p.city === cityName));
      }

      trackAction("save_place");
      // US-12: bump the anonymous aggregate counter. Fire-and-forget; the
      // payload is the place id only — never the user's list or identity.
      void fetch("/api/places/save-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId: place.id }),
        keepalive: true,
      }).catch(() => {});
      const nextPlace: SavedPlace = {
        id: place.id,
        city: cityName,
        name: place.displayName.text,
        type,
        address: place.formattedAddress,
        googleMapsUri: place.googleMapsUri,
        priceLevel: place.priceLevel,
        rating: place.rating,
      };

      return [...prev, nextPlace];
    });
  };

  const tabCounts = useMemo(
    () => ({
      landmarks: landmarks.length,
      restaurants: restaurants.length,
      hotels: hotels.length,
    }),
    [hotels.length, landmarks.length, restaurants.length]
  );

  const renderCard = (item: Landmark, index: number) => {
    const isFeatured = index === 0;
    const safePlaceId = sanitizeKey(item.id);
    const noteValue = draftNotesMap.get(safePlaceId) ?? "";
    const savedNote = placeNotesMap.get(safePlaceId);
    const isExpanded = expandedCards.has(item.id) || !!savedNote || !!noteValue;
    const pulseTags = getLocalPulseTags(item);
    const insiderTips = getInsiderTips(item);
    const addressContext = getAddressContext(item.formattedAddress);
    const primaryPulse = pulseTags[0] || formatType(item.types);
    const ratingLabel = item.rating ? item.rating.toFixed(1) : null;
    // US-12: only show social proof once it's meaningful (≥5 saves).
    const saveCount = saveCounts[item.id] ?? 0;
    const savedLabel = saveCount >= 5 ? `Saved ${formatPopulation(saveCount)}×` : null;
    const reviewLabel =
      item.userRatingCount != null && item.userRatingCount > 0
        ? `${formatPopulation(item.userRatingCount)} reviews`
        : null;

    return (
      <motion.div
        key={item.id}
        id={`place-card-${safePlaceId}`}
        onMouseEnter={() => setActiveMarkerId(item.id)}
        onFocusCapture={() => setActiveMarkerId(item.id)}
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
        animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={{
          delay: shouldReduceMotion ? 0 : index * 0.06,
          duration: shouldReduceMotion ? 0 : 0.36,
        }}
        className={`organic-panel group/card flex flex-col overflow-hidden rounded-xl transition-all duration-300 ${catColor.hover} sm:rounded-2xl md:rounded-3xl ${isFeatured ? "md:col-span-2" : ""} ${activeMarkerId === item.id ? "ring-accent/40 ring-2" : ""}`}
      >
        {/* Image with Overlaid Info */}
        {item.imageUrl && (
          <div
            className={`relative w-full shrink-0 overflow-hidden ${isFeatured ? "h-56 md:h-80" : "h-44 md:h-52"}`}
          >
            <OptimizedImage
              src={item.imageUrl}
              blurhash={item.blurhash}
              alt={item.displayName.text}
              className="h-full w-full transition-transform duration-500 group-hover/card:scale-105"
              objectFit="cover"
              priority={index === 0}
            />
            {/* Gradient overlay */}
            <div
              className="pointer-events-none absolute inset-0 z-20 bg-[linear-gradient(180deg,rgba(4,4,4,0.2)_0%,rgba(4,4,4,0.04)_24%,rgba(4,4,4,0.48)_68%,rgba(4,4,4,0.9)_100%)]"
              aria-hidden="true"
            />
            {/* Top-right: rating only */}
            {(ratingLabel || savedLabel) && (
              <div className="absolute top-4 right-4 z-30 flex items-center gap-1.5 md:top-5 md:right-5">
                {ratingLabel && (
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-black/50 px-2.5 py-1 text-xs font-black tracking-[0.06em] text-white backdrop-blur-md">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    {/* US-11: rating + compact review count, e.g. "4.6 · 12k" */}
                    <span>
                      {ratingLabel}
                      {item.userRatingCount ? ` · ${formatPopulation(item.userRatingCount)}` : ""}
                    </span>
                  </div>
                )}
                {savedLabel && (
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-black/50 px-2.5 py-1 text-xs font-black tracking-[0.06em] text-white backdrop-blur-md">
                    <Bookmark className="h-3 w-3 fill-current" />
                    <span>{savedLabel}</span>
                  </div>
                )}
              </div>
            )}
            {/* Bottom: name + address */}
            <div className="absolute inset-x-0 bottom-0 z-30 p-4 md:p-5">
              <h3
                className={`max-w-[16ch] leading-[0.94] text-white ${isFeatured ? "text-[1.75rem] md:text-[2.25rem]" : "text-[1.5rem] md:text-[1.75rem]"}`}
              >
                {item.displayName.text}
              </h3>
              {addressContext?.primary && (
                <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold tracking-[0.12em] text-white/50 uppercase">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="line-clamp-1">{addressContext.primary}</span>
                  {addressContext.secondary && (
                    <>
                      <span className="text-white/25">·</span>
                      <span className="line-clamp-1 text-white/35">{addressContext.secondary}</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Card Body */}
        <div
          className={`flex flex-col gap-3 px-4 pb-4 md:px-5 md:pb-5 ${item.imageUrl ? "pt-3" : "pt-5 md:pt-6"}`}
        >
          {/* No-image fallback title */}
          {!item.imageUrl && (
            <div className="bg-foreground/[0.03] rounded-xl border border-white/6 p-4">
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border ${catColor.iconBg}`}
                  aria-hidden="true"
                >
                  <Compass className={`h-5 w-5 ${catColor.icon}`} />
                </div>
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border ${catColor.badge} px-3 py-1 text-xs font-black tracking-[0.16em] uppercase`}
                    >
                      {primaryPulse}
                    </span>
                    {getPriceLevel(item.priceLevel) && (
                      <span className="border-foreground/10 bg-foreground/[0.03] text-foreground/55 rounded-full border px-3 py-1 text-xs font-black tracking-[0.16em] uppercase">
                        {getPriceLevel(item.priceLevel)}
                      </span>
                    )}
                  </div>
                  <h3 className="text-foreground/92 text-[1.55rem] leading-[0.98]">
                    {item.displayName.text}
                  </h3>
                  {addressContext?.primary && (
                    <div className="text-foreground/48 inline-flex items-center gap-2 text-xs font-semibold tracking-[0.14em] uppercase">
                      <MapPin className={`h-3.5 w-3.5 ${catColor.icon}`} />
                      <span className="line-clamp-1">{addressContext.primary}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Compact meta row — only shown when there's no image (image cards show this on the overlay) */}
          {!item.imageUrl && (
            <div className="text-foreground/40 flex flex-wrap items-center gap-2 text-xs font-black tracking-[0.16em] uppercase">
              {ratingLabel && (
                <span className="border-foreground/8 bg-foreground/[0.03] inline-flex items-center gap-1.5 rounded-full border px-3 py-1">
                  <Star className={`h-3.5 w-3.5 ${catColor.star}`} />
                  <span>{ratingLabel}</span>
                </span>
              )}
              {reviewLabel && (
                <span className="border-foreground/8 bg-foreground/[0.03] rounded-full border px-3 py-1">
                  {reviewLabel}
                </span>
              )}
              {savedLabel && (
                <span className="border-foreground/8 bg-foreground/[0.03] inline-flex items-center gap-1.5 rounded-full border px-3 py-1">
                  <Bookmark className="text-accent h-3.5 w-3.5" />
                  {savedLabel}
                </span>
              )}
            </div>
          )}

          {/* Action row — compact icons + labels */}
          <div className="flex items-center gap-1.5">
            {item.googleMapsUri && (
              <a
                href={item.googleMapsUri}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackAction("click_maps_link")}
                className="border-foreground/8 bg-foreground/[0.03] text-foreground/50 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold tracking-[0.12em] uppercase transition-all hover:border-sky-500/25 hover:text-sky-300 active:scale-[0.97]"
              >
                <MapPin className="h-3 w-3" />
                Maps
              </a>
            )}
            {/* US-13 (ADR-002): clearly-labeled partner link, stays only.
                Plain anchor — zero JS/widget weight; aggregate click count
                only. rel=sponsored per Google's paid-link guidance. */}
            {activeTab === "hotels" && bookingAffiliateId && (
              <a
                href={`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(
                  `${item.displayName.text}, ${cityName}`
                )}&aid=${encodeURIComponent(bookingAffiliateId)}`}
                target="_blank"
                rel="sponsored nofollow noopener noreferrer"
                onClick={() => trackAction("click_affiliate")}
                className="border-foreground/8 bg-foreground/[0.03] text-foreground/50 hover:border-accent/25 hover:text-accent inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold tracking-[0.12em] uppercase transition-all active:scale-[0.97]"
                title="Partner link — booking may earn us a commission at no cost to you."
              >
                Check availability · Partner
              </a>
            )}
            <button
              type="button"
              onClick={() => toggleSave(item, activeTab)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold tracking-[0.12em] uppercase transition-all active:scale-[0.97] ${
                savedIds.has(item.id)
                  ? catColor.save
                  : `border-foreground/8 bg-foreground/[0.03] text-foreground/50 hover:text-foreground/75 ${catColor.saveHover}`
              }`}
              aria-pressed={savedIds.has(item.id)}
            >
              {savedIds.has(item.id) ? (
                <BookmarkCheck className="h-3 w-3" />
              ) : (
                <BookmarkPlus className="h-3 w-3" />
              )}
              {savedIds.has(item.id) ? "Saved" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => toggleExpand(item.id)}
              className={`border-foreground/6 text-foreground/35 ml-auto inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold tracking-[0.12em] uppercase transition-all ${catColor.moreHover} hover:text-foreground/60 active:scale-[0.97]`}
              aria-expanded={isExpanded}
            >
              <Compass className="h-3 w-3" />
              {isExpanded ? "Hide" : "More"}
            </button>
          </div>

          {/* Expandable Notes */}
          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.div
                key="notes"
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.22 }}
                className="border-foreground/5 w-full space-y-3 border-t pt-3"
              >
                {/* Insider Tips — shown on expand */}
                {insiderTips.length > 0 && (
                  <div className="text-foreground/55 space-y-1 text-xs leading-relaxed">
                    {insiderTips.map((tip) => (
                      <div key={tip} className="flex items-start gap-2">
                        <span
                          className={`mt-[6px] h-1 w-1 flex-shrink-0 rounded-full ${catColor.dot}`}
                        />
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                )}
                {savedNote && (
                  <div className={`rounded-xl border ${catColor.note} p-4 text-sm`}>
                    <div
                      className={`mb-2 text-xs font-black tracking-[0.2em] uppercase ${catColor.noteLabel}`}
                    >
                      Your note
                    </div>
                    <div className="text-foreground/90 leading-relaxed">{savedNote}</div>
                  </div>
                )}
                <div className="space-y-2">
                  <div className="text-foreground/40 flex items-center gap-2 text-xs font-black tracking-[0.2em] uppercase">
                    Add your insight
                    <span className="bg-foreground/10 text-foreground/30 rounded-full px-2 py-0.5 text-xs font-bold tracking-[0.2em] uppercase">
                      Local only
                    </span>
                  </div>
                  <label htmlFor={`${safePlaceId}-note`} className="sr-only">
                    Note for {item.displayName.text}
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                    <textarea
                      id={`${safePlaceId}-note`}
                      value={noteValue}
                      onChange={(e) => {
                        const value = e.target.value.slice(0, 280);
                        updateDraftNotes((map) => {
                          map.set(safePlaceId, value);
                        });
                      }}
                      rows={2}
                      maxLength={280}
                      className={`border-foreground/10 bg-foreground/[0.03] text-foreground/80 w-full rounded-xl border px-4 py-3 text-sm transition-colors duration-100 outline-none ${catColor.focus} focus:bg-foreground/[0.05]`}
                      placeholder="Share a quick tip, vibe, or hidden detail..."
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => saveNote(item.id, noteValue)}
                        className={`rounded-xl border px-4 py-2 text-xs font-black tracking-[0.15em] uppercase transition-colors duration-100 ${catColor.noteBtn}`}
                        disabled={!notesHydrated}
                      >
                        Save note
                      </button>
                      <button
                        type="button"
                        onClick={() => clearNote(item.id)}
                        className="border-foreground/10 bg-foreground/[0.02] text-foreground/50 hover:border-foreground/20 hover:text-foreground rounded-xl border px-4 py-2 text-xs font-black tracking-[0.15em] uppercase transition"
                        disabled={!notesHydrated}
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="border-line bg-surface/70 rounded-2xl border p-5">
        <p className="source-chip">Saved shortlist</p>
        <p className="text-muted mt-3 max-w-2xl text-sm leading-relaxed">
          Move between sights, tables, and sleep bases without losing your saved shortlist or local
          notes.
        </p>
      </div>

      {/* Tab Switcher with Count Badges */}
      <div className="flex flex-col gap-4">
        <div className="scroll-row -mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
          <div className="border-line bg-background/55 flex w-max items-center gap-1.5 rounded-2xl border p-1.5 sm:w-fit md:rounded-2xl">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const count = tabCounts[tab.id];
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSelectedPrice(null);
                  }}
                  className={`relative flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-black tracking-[0.08em] uppercase transition-all duration-200 sm:gap-2 sm:px-4 sm:text-xs sm:tracking-[0.1em] md:gap-2.5 md:rounded-2xl md:px-5 md:py-3 ${isActive ? "text-foreground" : "text-foreground/30 hover:text-foreground/50"}`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-tab"
                      className={`absolute inset-0 rounded-xl border ${tab.activeBorder} ${tab.activeBg} md:rounded-2xl`}
                      transition={{
                        duration: shouldReduceMotion ? 0 : 0.28,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    />
                  )}
                  <Icon
                    className={`relative z-10 h-3.5 w-3.5 transition-colors duration-200 md:h-4 md:w-4 ${isActive ? tab.activeText : "text-foreground/20"}`}
                  />
                  <span className="relative z-10">{tab.label}</span>
                  <span
                    className={`relative z-10 rounded-full px-1.5 py-0.5 text-xs font-black tabular-nums transition-colors duration-200 sm:text-xs ${isActive ? tab.activeCount : "bg-foreground/5 text-foreground/25"}`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Price Filter */}
        <AnimatePresence>
          {activeTab !== "landmarks" && (
            <motion.div
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: -10 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
              exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: -10 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.24 }}
              className="border-line bg-background/45 flex w-fit items-center gap-1.5 rounded-2xl border p-1.5"
            >
              <button
                type="button"
                onClick={() => setSelectedPrice(null)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-black transition-all ${
                  selectedPrice === null
                    ? "border-accent/20 bg-accent-soft text-accent border"
                    : "text-foreground/20 hover:text-foreground/40 border border-transparent"
                }`}
              >
                ALL
              </button>
              {priceLevels.map((level) => (
                <button
                  key={level.id}
                  type="button"
                  onClick={() => setSelectedPrice(level.id)}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-black transition-all ${
                    selectedPrice === level.id
                      ? "border-accent/20 bg-accent-soft text-accent border"
                      : "text-foreground/20 hover:text-foreground/40 border border-transparent"
                  }`}
                >
                  {level.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* US-08: read-only view of a shared list (token in the URL). */}
      {sharedList && (
        <div
          className="atlas-panel-strong rounded-2xl p-5 md:p-6"
          role="region"
          aria-label="Shared list"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="source-chip">
              <Share2 className="h-3.5 w-3.5" />
              Shared list · {sharedList.ids.length} places
            </p>
            <button
              type="button"
              onClick={handleImportShared}
              disabled={importDone || sharedResolved.length === 0}
              className="btn-secondary text-xs disabled:opacity-50"
            >
              <Import className="h-3.5 w-3.5" />
              {importDone ? "Added to my saves" : "Import to my saves"}
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {sharedResolved.map(({ place, type }) => (
              <span
                key={place.id}
                className="border-line bg-background/45 text-foreground/70 flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold"
              >
                <BookmarkCheck className="text-accent h-3.5 w-3.5" />
                {place.displayName.text}
                <span className="text-foreground/30 text-xs tracking-[0.15em] uppercase">
                  {type}
                </span>
              </span>
            ))}
          </div>
          {sharedUnresolvedCount > 0 && (
            <p className="text-muted mt-3 text-xs">
              {sharedUnresolvedCount} shared{" "}
              {sharedUnresolvedCount === 1 ? "place is" : "places are"} no longer in today&apos;s
              top lists and can&apos;t be previewed.
            </p>
          )}
        </div>
      )}

      {/* Saved Places */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="border-line bg-background/45 text-foreground/50 flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-black tracking-[0.15em] uppercase">
          <Bookmark className="text-accent h-3.5 w-3.5" />
          <span>
            {savedForCity.length} saved in {cityName}
          </span>
        </div>
        {savedForCity.length > 0 && (
          <button
            type="button"
            onClick={handleShareList}
            className="border-line bg-background/45 text-foreground/70 hover:border-accent/30 hover:text-foreground flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-black tracking-[0.15em] uppercase transition-all duration-200"
            title="Notes stay private — only the place list is shared."
          >
            <Share2 className="text-accent h-3.5 w-3.5" />
            {shareCopied ? "Link copied" : "Share list"}
          </button>
        )}
        <AnimatePresence>
          {savedForCity.map((item) =>
            item.googleMapsUri ? (
              <motion.a
                key={item.id}
                href={item.googleMapsUri}
                target="_blank"
                rel="noopener noreferrer"
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.96 }}
                animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
                exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.96 }}
                className="group border-line bg-background/45 text-foreground/70 hover:border-accent/30 hover:bg-accent-soft/70 hover:text-foreground flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all duration-200"
              >
                <BookmarkCheck className="text-accent h-3.5 w-3.5" />
                <span className="line-clamp-1 max-w-[120px] sm:max-w-[180px]">{item.name}</span>
                <span className="text-foreground/30 group-hover:text-accent text-xs tracking-[0.15em] uppercase">
                  {item.type}
                </span>
              </motion.a>
            ) : (
              <motion.span
                key={item.id}
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.96 }}
                animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
                exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.96 }}
                className="border-line bg-background/45 text-foreground/60 flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold"
              >
                <BookmarkCheck className="text-accent h-3.5 w-3.5" />
                <span className="line-clamp-1 max-w-[120px] sm:max-w-[180px]">{item.name}</span>
                <span className="text-foreground/30 text-xs tracking-[0.15em] uppercase">
                  {item.type}
                </span>
              </motion.span>
            )
          )}
        </AnimatePresence>
      </div>

      {/* US-10: itinerary-lite — organize the shortlist into days. */}
      {savedForCity.length > 0 && (
        <div
          className="print-itinerary border-line bg-surface/70 rounded-2xl border p-5 md:p-6"
          role="region"
          aria-label="Itinerary days"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="source-chip">
              <CalendarDays className="h-3.5 w-3.5" />
              Day-by-day plan
            </p>
            <button
              type="button"
              onClick={() => {
                trackAction("download_itinerary");
                window.print();
              }}
              className="border-line bg-background/45 text-foreground/70 hover:text-foreground flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-black tracking-[0.15em] uppercase transition-colors"
            >
              <Printer className="text-accent h-3.5 w-3.5" />
              Print plan
            </button>
          </div>

          <div className="mt-5 space-y-6">
            {dayGroups.map(([day, places]) => {
              const directionsUrl = day > 0 ? buildDayDirectionsUrl(places) : null;
              return (
                <div key={day}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-muted text-xs font-black tracking-[0.18em] uppercase">
                      {day === 0 ? "Unassigned" : `Day ${day}`}
                      <span className="text-foreground/30 ml-2">{places.length}</span>
                    </h4>
                    {directionsUrl && (
                      <a
                        href={directionsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => trackAction("click_maps_link")}
                        className="text-link text-xs font-semibold print:hidden"
                      >
                        Open Day {day} in Google Maps
                      </a>
                    )}
                  </div>
                  <ul className="mt-2 space-y-2">
                    {places.map((place) => (
                      <li
                        key={place.id}
                        className="border-line flex flex-wrap items-center justify-between gap-3 border-b pb-2"
                      >
                        <span className="text-foreground/80 text-sm font-semibold">
                          {place.name}
                          <span className="text-foreground/30 ml-2 text-xs tracking-[0.15em] uppercase">
                            {place.type}
                          </span>
                        </span>
                        <label className="flex items-center gap-2 text-xs print:hidden">
                          <span className="sr-only">Move {place.name} to day</span>
                          <select
                            value={place.day ?? 0}
                            onChange={(event) =>
                              assignDay(place.id, Number.parseInt(event.target.value, 10))
                            }
                            className="border-line bg-background text-foreground rounded-md border px-2 py-1.5 text-xs"
                          >
                            <option value={0}>Unassigned</option>
                            {Array.from({ length: assignableDays }, (_, index) => (
                              <option key={index + 1} value={index + 1}>
                                Day {index + 1}
                              </option>
                            ))}
                          </select>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          <p className="text-muted mt-4 text-xs print:hidden">
            Day groups are saved on this device and travel with your share link. Notes stay private.
          </p>
        </div>
      )}

      {/* US-05/US-06: experiences map — markers track the visible tab+filter. */}
      {typeof centerLat === "number" && typeof centerLng === "number" && (
        <CityMap
          centerLat={centerLat}
          centerLng={centerLng}
          label={`Map of ${cityName} places`}
          markers={mapMarkers}
          activeId={activeMarkerId}
          onMarkerSelect={handleMarkerSelect}
        />
      )}

      {/* Cards: Featured (first) + Grid (rest) */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${activeTab}-${selectedPrice}`}
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.35 }}
          className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5"
        >
          {displayData.map((item, index) => renderCard(item, index))}
          {displayData.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-4 py-20 md:col-span-2">
              <div className="border-foreground/5 bg-foreground/[0.02] flex h-16 w-16 items-center justify-center rounded-2xl border">
                <Compass className="text-foreground/15 h-7 w-7" />
              </div>
              <div className="text-center">
                <div className="text-foreground/25 text-xs font-black tracking-[0.2em] uppercase">
                  No {getPriceLevel(selectedPrice!) || activeTab} spots discovered
                </div>
                <div className="text-foreground/15 mt-1 text-xs font-bold tracking-wide">
                  Try another price tier or switch lanes to keep planning.
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

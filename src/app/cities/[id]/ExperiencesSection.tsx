"use client";

import { useEffect, useMemo, useState } from "react";
import { OptimizedImage } from "@/components/OptimizedImage";
import { Landmark } from "@/lib/places";
import { formatPopulation } from "@/lib/format";
import {
  getJsonStorageItem,
  getStorageItem,
  setJsonStorageItem,
} from "@/lib/storage";
import {
  Compass,
  Star,
  Ticket,
  Utensils,
  Hotel,
  Bookmark,
  BookmarkCheck,
  BookmarkPlus,
  MapPin,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAnalytics } from "@/lib/useAnalytics";

const STORAGE_KEY = "atlas_saved_places";
const NOTES_STORAGE_KEY = "atlas_place_notes";

type SavedPlace = {
  id: string;
  city: string;
  name: string;
  type: "landmarks" | "restaurants" | "hotels";
  address?: string;
  googleMapsUri?: string;
  priceLevel?: string;
  rating?: number;
};
type CityNotes = Record<string, string>;

const NOTE_KEY_PREFIX = "k_";

const sanitizeKey = (key: string) => `${NOTE_KEY_PREFIX}${encodeURIComponent(key)}`;

const toNoteMap = (notes: CityNotes) => {
  const map = new Map<string, string>();
  Object.entries(notes).forEach(([key, value]) => {
    if (typeof value === "string") {
      map.set(sanitizeKey(key), value);
    }
  });
  return map;
};

const sanitizeNotes = (notes: CityNotes) =>
  Object.fromEntries(
    Object.entries(notes)
      .filter(([, value]) => typeof value === "string")
      .map(([key, value]) => [sanitizeKey(key), value as string])
  ) as CityNotes;

const parseStoredNotes = (raw: string | null): Map<string, CityNotes> => {
  if (!raw) return new Map<string, CityNotes>();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return new Map<string, CityNotes>();
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return new Map<string, CityNotes>();
  }
  return new Map(
    Object.entries(parsed)
      .filter(([, value]) => value && typeof value === "object" && !Array.isArray(value))
      .map(([key, value]) => [sanitizeKey(key), sanitizeNotes(value as CityNotes)])
  );
};

const localPulseTags: Record<string, string[]> = {
  TOURIST_ATTRACTION: ["Must See Icon", "Historic Photo Spot", "Worth The Wait"],
  MUSEUM: ["Quiet Culture Escape", "Story Rich Halls", "Afternoon Slow Walk"],
  PARK: ["Sunset Picnic Spot", "Shaded Chill Loop", "Golden Hour Lawn"],
  AQUARIUM: ["Family Wonder Zone", "Rainy Day Win", "Calm Blue Glow"],
  RESTAURANT: ["Local Favorite Bites", "Crowded But Worth", "Chef Driven Menu"],
  CAFE: ["Slow Morning Sips", "Laptop Friendly Nook", "Pastry First Stop"],
  HOTEL: ["Sleep Well Base", "Walkable City Hub", "Late Night Quiet"],
};
const localPulseMap = new Map<string, string[]>(Object.entries(localPulseTags));

/**
 * Partial sort to get top K elements - O(n log k) instead of O(n log n)
 * For small k (like 5), this is much faster than sorting the entire array
 */
function topK<T>(arr: T[], k: number, getValue: (item: T) => number): T[] {
  if (arr.length <= k) {
    // If array is small enough, just sort it
    return [...arr].sort((a, b) => getValue(b) - getValue(a));
  }
  
  // Use a simple selection approach for small k
  // Maintain a sorted array of top k elements
  const topItems: T[] = [];
  
  for (const item of arr) {
    const value = getValue(item);
    
    if (topItems.length < k) {
      // Still filling up the top k
      topItems.push(item);
      // Keep sorted (insertion sort for small k is O(k))
      for (let i = topItems.length - 1; i > 0; i--) {
        // eslint-disable-next-line security/detect-object-injection
        if (getValue(topItems[i]) > getValue(topItems[i - 1])) {
          // eslint-disable-next-line security/detect-object-injection
          [topItems[i], topItems[i - 1]] = [topItems[i - 1], topItems[i]];
        } else {
          break;
        }
      }
    } else if (value > getValue(topItems[k - 1])) {
      // This item is better than the worst in top k
      topItems[k - 1] = item;
      // Bubble up to correct position
      for (let i = k - 1; i > 0; i--) {
        // eslint-disable-next-line security/detect-object-injection
        if (getValue(topItems[i]) > getValue(topItems[i - 1])) {
          // eslint-disable-next-line security/detect-object-injection
          [topItems[i], topItems[i - 1]] = [topItems[i - 1], topItems[i]];
        } else {
          break;
        }
      }
    }
  }
  
  return topItems;
}

interface ExperiencesSectionProps {
  cityName: string;
  landmarks: Landmark[];
  restaurants: Landmark[];
  hotels: Landmark[];
}

export default function ExperiencesSection({
  cityName,
  landmarks,
  restaurants,
  hotels,
}: ExperiencesSectionProps) {
  const [activeTab, setActiveTab] = useState<"landmarks" | "restaurants" | "hotels">(
    "landmarks"
  );
  const [selectedPrice, setSelectedPrice] = useState<string | null>(null);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [placeNotes, setPlaceNotes] = useState<CityNotes>({});
  const [draftNotes, setDraftNotes] = useState<CityNotes>({});
  const [notesHydrated, setNotesHydrated] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const { trackAction } = useAnalytics();

  // Load saved places from localStorage on mount (defer setState to avoid synchronous update in effect)
  useEffect(() => {
    const parsed = getJsonStorageItem<SavedPlace[]>(STORAGE_KEY, []);
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
    setJsonStorageItem(STORAGE_KEY, savedPlaces);
  }, [isHydrated, savedPlaces]);

  // Load notes for this city from localStorage (defer setState to avoid synchronous update in effect)
  useEffect(() => {
    const raw = getStorageItem(NOTES_STORAGE_KEY);
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
    const raw = getStorageItem(NOTES_STORAGE_KEY);
    const notesMap = parseStoredNotes(raw);
    notesMap.set(sanitizeKey(cityName), sanitizeNotes(nextNotes));
    setJsonStorageItem(NOTES_STORAGE_KEY, Object.fromEntries(notesMap));
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

  const getLocalPulseTags = (place: Landmark) => {
    const tags = new Set<string>();
    const primary = place.types?.at(0);
    if (primary) {
      const normalizedKey = primary.toUpperCase();
      const fallbacks = localPulseMap.get(normalizedKey) || localPulseMap.get(primary);
      fallbacks?.forEach((tag) => tags.add(tag));
    }

    const rating = place.rating ?? 0;
    const reviews = place.userRatingCount ?? 0;
    if (rating >= 4.6 && reviews >= 1000) tags.add("Crowded But Worth");
    if (rating >= 4.7 && reviews > 0 && reviews <= 200) tags.add("Hidden Gem Spot");
    if (reviews >= 500) tags.add("Always Lively Here");
    if (place.priceLevel === "PRICE_LEVEL_VERY_EXPENSIVE") tags.add("High End Treat");

    return Array.from(tags).slice(0, 3);
  };

  const getNeighborhood = (address?: string) => address?.split(",")[0]?.trim();

  const getAddressContext = (address?: string) => {
    if (!address) return null;
    const segments = address
      .split(",")
      .map((segment) => segment.trim())
      .filter(Boolean);

    if (segments.length === 0) return null;
    if (segments.length === 1) {
      return { primary: segments[0], secondary: null };
    }

    return {
      primary: segments[0],
      secondary: segments.slice(1, 3).join(" • "),
    };
  };

  const getInsiderTips = (place: Landmark) => {
    const tips: string[] = [];
    const name = place.displayName.text;
    const neighborhood = getNeighborhood(place.formattedAddress);
    const reviews = place.userRatingCount ?? 0;

    if (reviews >= 1000) {
      tips.push(`Arrive early at ${name} to beat the rush.`);
    } else {
      tips.push(`Quietest moments at ${name} are just after opening.`);
    }

    if (neighborhood) {
      tips.push(`Best entry is from the ${neighborhood} side.`);
    } else {
      tips.push(`Look for the calmer side entrance at ${name}.`);
    }

    if (
      place.types?.some((type) => {
        const normalized = type.toLowerCase();
        return normalized.includes("restaurant") || normalized.includes("food");
      })
    ) {
      tips.push(`Ask about the daily special at ${name}.`);
    }

    return tips.slice(0, 2);
  };

  const tabs = [
    { id: "landmarks", label: "Landmarks", icon: Ticket, activeText: "text-accent", activeBg: "bg-accent-soft", activeBorder: "border-accent/20", activeCount: "bg-accent/15 text-accent" },
    { id: "restaurants", label: "Dining", icon: Utensils, activeText: "text-cat-dining", activeBg: "bg-cat-dining-soft", activeBorder: "border-[color:color-mix(in_oklab,var(--color-cat-dining)_20%,transparent)]", activeCount: "bg-[color:var(--color-cat-dining-soft)] text-cat-dining" },
    { id: "hotels", label: "Stays", icon: Hotel, activeText: "text-cat-stays", activeBg: "bg-cat-stays-soft", activeBorder: "border-[color:color-mix(in_oklab,var(--color-cat-stays)_20%,transparent)]", activeCount: "bg-[color:var(--color-cat-stays-soft)] text-cat-stays" },
  ] as const;

  const priceLevelLabels = new Map<string, string>([
    ["PRICE_LEVEL_FREE", "Free"],
    ["PRICE_LEVEL_INEXPENSIVE", "$"],
    ["PRICE_LEVEL_MODERATE", "$$"],
    ["PRICE_LEVEL_EXPENSIVE", "$$$"],
    ["PRICE_LEVEL_VERY_EXPENSIVE", "$$$$"],
  ]);

  const priceLevels = [
    { id: "PRICE_LEVEL_INEXPENSIVE", label: "$" },
    { id: "PRICE_LEVEL_MODERATE", label: "$$" },
    { id: "PRICE_LEVEL_EXPENSIVE", label: "$$$" },
    { id: "PRICE_LEVEL_VERY_EXPENSIVE", label: "$$$$" },
  ];

  // Logic to filter and slice data
  const rawData =
    activeTab === "landmarks" ? landmarks : activeTab === "restaurants" ? restaurants : hotels;

  const filteredData = selectedPrice
    ? rawData.filter((item) => item.priceLevel === selectedPrice)
    : rawData;

  // Always take top 5 based on reviews
  // Optimized: O(n log k) partial sort instead of O(n log n) full sort
  const displayData = topK(filteredData, 5, (item) => item.userRatingCount || 0);

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

  const draftNotesMap = useMemo(() => toNoteMap(draftNotes), [draftNotes]);
  const placeNotesMap = toNoteMap(placeNotes);

  const catColor = useMemo(() => {
    switch (activeTab) {
      case "restaurants": return { hover: "hover:border-emerald-500/15", badge: "border-emerald-500/15 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400/90", icon: "text-emerald-500 dark:text-emerald-400/70", iconBg: "border-emerald-500/15 bg-emerald-500/10", dot: "bg-emerald-500/40", save: "border-emerald-500/25 bg-emerald-500/8 text-emerald-500 dark:text-emerald-300", saveHover: "hover:border-emerald-500/20", note: "border-emerald-500/15 bg-emerald-500/5", noteLabel: "text-emerald-500 dark:text-emerald-400/80", noteBtn: "border-emerald-500/30 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/30", focus: "focus:border-emerald-500/40 focus:ring-emerald-500/20", moreHover: "hover:border-emerald-500/15", star: "fill-emerald-400 text-emerald-400" };
      case "hotels": return { hover: "hover:border-sky-500/15", badge: "border-sky-500/15 bg-sky-500/10 text-sky-600 dark:text-sky-400/90", icon: "text-sky-500 dark:text-sky-400/70", iconBg: "border-sky-500/15 bg-sky-500/10", dot: "bg-sky-500/40", save: "border-sky-500/25 bg-sky-500/8 text-sky-500 dark:text-sky-300", saveHover: "hover:border-sky-500/20", note: "border-sky-500/15 bg-sky-500/5", noteLabel: "text-sky-500 dark:text-sky-400/80", noteBtn: "border-sky-500/30 bg-sky-500/20 text-sky-600 dark:text-sky-400 hover:border-sky-500/50 hover:bg-sky-500/30", focus: "focus:border-sky-500/40 focus:ring-sky-500/20", moreHover: "hover:border-sky-500/15", star: "fill-sky-400 text-sky-400" };
      default: return { hover: "hover:border-orange-500/15", badge: "border-orange-500/15 bg-orange-500/10 text-orange-600 dark:text-orange-400/90", icon: "text-orange-500 dark:text-orange-400/70", iconBg: "border-orange-500/15 bg-orange-500/10", dot: "bg-orange-500/40", save: "border-orange-500/25 bg-orange-500/8 text-orange-500 dark:text-orange-300", saveHover: "hover:border-orange-500/20", note: "border-orange-500/15 bg-orange-500/5", noteLabel: "text-orange-500 dark:text-orange-400/80", noteBtn: "border-orange-500/30 bg-orange-500/20 text-orange-600 dark:text-orange-400 hover:border-orange-500/50 hover:bg-orange-500/30", focus: "focus:border-orange-500/40 focus:ring-orange-500/20", moreHover: "hover:border-orange-500/15", star: "fill-amber-400 text-amber-400" };
    }
  }, [activeTab]);

  const toggleSave = (place: Landmark, type: "landmarks" | "restaurants" | "hotels") => {
    setSavedPlaces((prev) => {
      const exists = prev.some((p) => p.id === place.id && p.city === cityName);
      if (exists) {
        trackAction("remove_save");
        return prev.filter((p) => !(p.id === place.id && p.city === cityName));
      }

      trackAction("save_place");
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

  const tabCounts = {
    landmarks: landmarks.length,
    restaurants: restaurants.length,
    hotels: hotels.length,
  };

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
    const reviewLabel = item.userRatingCount != null && item.userRatingCount > 0
      ? `${formatPopulation(item.userRatingCount)} reviews`
      : null;

    return (
      <motion.div
        key={item.id}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.08, duration: 0.4 }}
        className={`liquid-glass group/card flex flex-col overflow-hidden rounded-[1.75rem] border border-white/6 transition-all duration-500 hover:-translate-y-1 ${catColor.hover} hover:shadow-[0_24px_70px_rgba(0,0,0,0.26)] md:rounded-[2rem] ${isFeatured ? "md:col-span-2" : ""}`}
      >
        {/* Image with Overlaid Info */}
        {item.imageUrl && (
          <div className={`relative w-full shrink-0 overflow-hidden ${isFeatured ? "h-56 md:h-80" : "h-44 md:h-52"}`}>
            <OptimizedImage
              src={item.imageUrl}
              blurhash={item.blurhash}
              alt={item.displayName.text}
              className="h-full w-full transition-transform duration-500 group-hover/card:scale-105"
              objectFit="cover"
            />
            {/* Gradient overlay */}
            <div
              className="pointer-events-none absolute inset-0 z-20 bg-[linear-gradient(180deg,rgba(4,4,4,0.2)_0%,rgba(4,4,4,0.04)_24%,rgba(4,4,4,0.48)_68%,rgba(4,4,4,0.9)_100%)]"
              aria-hidden="true"
            />
            {/* Top-right: rating only */}
            {ratingLabel && (
              <div className="absolute right-4 top-4 z-30 inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-black/50 px-2.5 py-1 text-[11px] font-black tracking-[0.06em] text-white backdrop-blur-md md:right-5 md:top-5">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                <span>{ratingLabel}</span>
              </div>
            )}
            {/* Bottom: name + address */}
            <div className="absolute inset-x-0 bottom-0 z-30 p-4 md:p-5">
              <h3 className={`max-w-[16ch] text-white leading-[0.94] ${isFeatured ? "text-[1.75rem] md:text-[2.25rem]" : "text-[1.5rem] md:text-[1.75rem]"}`}>
                {item.displayName.text}
              </h3>
              {addressContext?.primary && (
                <div className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/50">
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
        <div className={`flex flex-col gap-3 px-4 pb-4 md:px-5 md:pb-5 ${item.imageUrl ? "pt-3" : "pt-5 md:pt-6"}`}>
          {/* No-image fallback title */}
          {!item.imageUrl && (
            <div className="rounded-[1.35rem] border border-white/6 bg-foreground/[0.03] p-4">
              <div className="flex items-start gap-4">
                <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border ${catColor.iconBg}`} aria-hidden="true">
                  <Compass className={`h-5 w-5 ${catColor.icon}`} />
                </div>
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border ${catColor.badge} px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]`}>
                      {primaryPulse}
                    </span>
                    {getPriceLevel(item.priceLevel) && (
                      <span className="rounded-full border border-foreground/10 bg-foreground/[0.03] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-foreground/55">
                        {getPriceLevel(item.priceLevel)}
                      </span>
                    )}
                  </div>
                  <h3 className="text-[1.55rem] leading-[0.98] text-foreground/92">
                    {item.displayName.text}
                  </h3>
                  {addressContext?.primary && (
                    <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/48">
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
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-foreground/40">
              {ratingLabel && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-foreground/8 bg-foreground/[0.03] px-3 py-1">
                  <Star className={`h-3.5 w-3.5 ${catColor.star}`} />
                  <span>{ratingLabel}</span>
                </span>
              )}
              {reviewLabel && (
                <span className="rounded-full border border-foreground/8 bg-foreground/[0.03] px-3 py-1">
                  {reviewLabel}
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
                className="inline-flex items-center gap-1.5 rounded-full border border-foreground/8 bg-foreground/[0.03] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/50 transition-all hover:border-sky-500/25 hover:text-sky-300 active:scale-[0.97]"
              >
                <MapPin className="h-3 w-3" />
                Maps
              </a>
            )}
            <button
              onClick={() => toggleSave(item, activeTab)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] transition-all active:scale-[0.97] ${savedIds.has(item.id)
                ? "border-orange-500/25 bg-orange-500/8 text-orange-300"
                : "border-foreground/8 bg-foreground/[0.03] text-foreground/50 hover:border-orange-500/20 hover:text-foreground/75"
                }`}
              aria-pressed={savedIds.has(item.id)}
            >
              {savedIds.has(item.id) ? <BookmarkCheck className="h-3 w-3" /> : <BookmarkPlus className="h-3 w-3" />}
              {savedIds.has(item.id) ? "Saved" : "Save"}
            </button>
            <button
              onClick={() => toggleExpand(item.id)}
              className={`ml-auto inline-flex items-center gap-1 rounded-full border border-foreground/6 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/35 transition-all ${catColor.moreHover} hover:text-foreground/60 active:scale-[0.97]`}
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
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="w-full space-y-3 border-t border-foreground/5 pt-3"
              >
                {/* Insider Tips — shown on expand */}
                {insiderTips.length > 0 && (
                  <div className="space-y-1 text-[11px] leading-relaxed text-foreground/55">
                    {insiderTips.map((tip) => (
                      <div key={tip} className="flex items-start gap-2">
                        <span className={`mt-[6px] h-1 w-1 flex-shrink-0 rounded-full ${catColor.dot}`} />
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                )}
                {savedNote && (
                  <div className={`rounded-xl border ${catColor.note} p-4 text-sm`}>
                    <div className={`mb-2 text-[10px] font-black uppercase tracking-[0.2em] ${catColor.noteLabel}`}>
                      Your note
                    </div>
                    <div className="leading-relaxed text-foreground/90">{savedNote}</div>
                  </div>
                )}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">
                    Add your insight
                    <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-foreground/30">
                      Local only
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                    <textarea
                      value={noteValue}
                      onChange={(e) => {
                        const value = e.target.value.slice(0, 280);
                        updateDraftNotes((map) => {
                          map.set(safePlaceId, value);
                        });
                      }}
                      rows={2}
                      maxLength={280}
                      className={`w-full rounded-xl border border-foreground/10 bg-foreground/[0.03] px-4 py-3 text-sm text-foreground/80 outline-none transition-colors duration-100 ${catColor.focus} focus:bg-foreground/[0.05]`}
                      placeholder="Share a quick tip, vibe, or hidden detail..."
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveNote(item.id, noteValue)}
                        className={`rounded-xl border px-4 py-2 text-[11px] font-black uppercase tracking-[0.15em] transition-colors duration-100 ${catColor.noteBtn}`}
                        disabled={!notesHydrated}
                      >
                        Save note
                      </button>
                      <button
                        onClick={() => clearNote(item.id)}
                        className="rounded-xl border border-foreground/10 bg-foreground/[0.02] px-4 py-2 text-[11px] font-black uppercase tracking-[0.15em] text-foreground/50 transition hover:border-foreground/20 hover:text-foreground"
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
      {/* Tab Switcher with Count Badges */}
      <div className="flex flex-col gap-4">
        <div className="flex w-fit flex-wrap items-center gap-1.5 rounded-2xl border border-line bg-background/55 p-1.5 md:rounded-[1.5rem]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const count = tabCounts[tab.id];
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSelectedPrice(null);
                }}
                className={`relative flex items-center gap-2 md:gap-2.5 px-4 md:px-5 py-2.5 md:py-3 rounded-xl md:rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-[0.1em] transition-all duration-200 ${isActive ? "text-foreground" : "text-foreground/30 hover:text-foreground/50"}`}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-tab"
                    className={`absolute inset-0 rounded-xl border ${tab.activeBorder} ${tab.activeBg} md:rounded-2xl`}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <Icon
                  className={`relative z-10 h-3.5 w-3.5 transition-colors duration-200 md:h-4 md:w-4 ${isActive ? tab.activeText : "text-foreground/20"}`}
                />
                <span className="relative z-10">{tab.label}</span>
                <span className={`relative z-10 rounded-full px-1.5 py-0.5 text-[8px] font-black tabular-nums transition-colors duration-200 md:text-[9px] ${isActive ? tab.activeCount : "bg-foreground/5 text-foreground/25"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Price Filter */}
        <AnimatePresence>
          {activeTab !== "landmarks" && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex w-fit items-center gap-1.5 rounded-2xl border border-line bg-background/45 p-1.5"
            >
              <button
                onClick={() => setSelectedPrice(null)}
                className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black transition-all ${selectedPrice === null
                  ? "border border-accent/20 bg-accent-soft text-accent"
                  : "text-foreground/20 hover:text-foreground/40 border border-transparent"
                  }`}
              >
                ALL
              </button>
              {priceLevels.map((level) => (
                <button
                  key={level.id}
                  onClick={() => setSelectedPrice(level.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black transition-all ${selectedPrice === level.id
                    ? "border border-accent/20 bg-accent-soft text-accent"
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

      {/* Saved Places */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-xl border border-line bg-background/45 px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.15em] text-foreground/50">
          <Bookmark className="h-3.5 w-3.5 text-accent" />
          <span>
            {savedForCity.length} saved in {cityName}
          </span>
        </div>
        <AnimatePresence>
          {savedForCity.map((item) => (
            <motion.a
              key={item.id}
              href={item.googleMapsUri || "#"}
              target={item.googleMapsUri ? "_blank" : undefined}
              rel={item.googleMapsUri ? "noopener noreferrer" : undefined}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="group flex items-center gap-2 rounded-xl border border-line bg-background/45 px-3 py-1.5 text-[11px] font-bold text-foreground/70 transition-all duration-200 hover:border-accent/30 hover:bg-accent-soft/70 hover:text-foreground"
            >
              <BookmarkCheck className="h-3.5 w-3.5 text-accent" />
              <span className="line-clamp-1 max-w-[120px] sm:max-w-[180px]">{item.name}</span>
              <span className="text-[9px] uppercase tracking-[0.15em] text-foreground/30 group-hover:text-accent">
                {item.type}
              </span>
            </motion.a>
          ))}
        </AnimatePresence>
      </div>

      {/* Cards: Featured (first) + Grid (rest) */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${activeTab}-${selectedPrice}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5"
        >
          {displayData.map((item, index) => renderCard(item, index))}
          {displayData.length === 0 && (
            <div className="md:col-span-2 flex flex-col items-center justify-center py-20 gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-foreground/5 bg-foreground/[0.02]">
                <Compass className="h-7 w-7 text-foreground/15" />
              </div>
              <div className="text-center">
                <div className="text-xs font-black uppercase tracking-[0.2em] text-foreground/25">
                  No {getPriceLevel(selectedPrice!) || activeTab} spots discovered
                </div>
                <div className="mt-1 text-[10px] text-foreground/15 font-bold tracking-wide">
                  Try adjusting your filters or explore another category
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

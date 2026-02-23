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
  ExternalLink,
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
    { id: "landmarks", label: "Landmarks", icon: Ticket },
    { id: "restaurants", label: "Dining", icon: Utensils },
    { id: "hotels", label: "Stays", icon: Hotel },
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        {/* Dynamic Tab Switcher */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl md:rounded-[1.5rem] bg-foreground/[0.02] border border-foreground/5 w-fit">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSelectedPrice(null); // Reset price when tab changes
                }}
                className={`relative flex items-center gap-2 md:gap-2.5 px-4 md:px-6 py-2 md:py-2.5 rounded-xl md:rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-[0.1em] transition-colors duration-100 ${isActive ? "text-foreground" : "text-foreground/30 hover:text-foreground/50"
                  }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-tab"
                    className="absolute inset-0 bg-purple-500/10 border border-purple-500/20 rounded-xl md:rounded-2xl"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <Icon
                  className={`w-3 h-3 md:w-3.5 md:h-3.5 transition-colors duration-100 ${isActive ? "text-purple-400" : "text-foreground/20"
                    }`}
                />
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Sub-Category Price Filter (Only for Dining and Stays) */}
        <AnimatePresence>
          {activeTab !== "landmarks" && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center gap-2 p-1.5 rounded-2xl bg-foreground/[0.01] border border-foreground/5 w-fit"
            >
              <button
                onClick={() => setSelectedPrice(null)}
                className={`px-4 py-1.5 rounded-xl text-[10px] font-black transition-all ${selectedPrice === null
                  ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                  : "text-foreground/20 hover:text-foreground/40 border border-transparent"
                  }`}
              >
                ALL
              </button>
              {priceLevels.map((level) => (
                <button
                  key={level.id}
                  onClick={() => setSelectedPrice(level.id)}
                  className={`px-4 py-1.5 rounded-xl text-[10px] font-black transition-all ${selectedPrice === level.id
                    ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
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

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-2xl border border-foreground/5 bg-foreground/[0.02] px-4 py-2 text-[10px] font-black uppercase tracking-[0.15em] text-foreground/60">
          <Bookmark className="h-4 w-4 text-purple-400/80" />
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
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="group flex items-center gap-2 rounded-xl border border-foreground/5 bg-foreground/[0.02] px-3 py-1.5 text-[11px] font-bold text-foreground/70 transition-colors duration-100 hover:border-purple-500/30 hover:bg-purple-500/10 hover:text-foreground"
            >
              <BookmarkCheck className="h-4 w-4 text-purple-400/80" />
              <span className="line-clamp-1">{item.name}</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-foreground/40 group-hover:text-purple-200">
                {item.type}
              </span>
            </motion.a>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${activeTab}-${selectedPrice}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-1 gap-4"
        >
          {displayData.map((item) => {
            const safePlaceId = sanitizeKey(item.id);
            const noteValue = draftNotesMap.get(safePlaceId) ?? "";
            const savedNote = placeNotesMap.get(safePlaceId);
            const isExpanded = expandedCards.has(item.id) || !!savedNote || !!noteValue;
            const pulseTags = getLocalPulseTags(item);
            const insiderTips = getInsiderTips(item);

            return (
              <div
                key={item.id}
                className="liquid-glass group/landmark flex flex-col gap-6 overflow-hidden rounded-2xl md:rounded-[2.5rem] transition-colors duration-100 hover:bg-foreground/[0.05]"
              >
                {item.imageUrl && (
                  <div className="relative h-40 md:h-52 w-full shrink-0">
                    <OptimizedImage
                      src={item.imageUrl}
                      blurhash={item.blurhash}
                      alt={item.displayName.text}
                      className="h-full w-full"
                      objectFit="cover"
                    />
                    <div
                      className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-t from-background/90 via-background/20 to-transparent"
                      aria-hidden
                    />
                  </div>
                )}
                <div
                  className={`flex flex-col gap-6 px-6 pb-6 md:px-8 md:pb-8 ${item.imageUrl ? "pt-0" : "pt-6 md:pt-8"}`}
                >
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-4 md:items-center md:gap-6">
                      <div
                        className="flex h-10 w-10 md:h-12 md:w-12 flex-shrink-0 items-center justify-center rounded-xl md:rounded-2xl border border-foreground/5 bg-foreground/[0.02]"
                        aria-hidden="true"
                      >
                        <Compass className="h-5 w-5 text-purple-400/60" />
                      </div>
                      <div>
                      <div className="text-lg md:text-xl font-black tracking-tight text-foreground/90">
                        {item.displayName.text}
                      </div>
                      <div className="mt-2 md:mt-3 flex flex-wrap items-center gap-2 md:gap-3">
                        <div className="rounded-md bg-purple-500/10 px-2 py-0.5 md:px-2.5 md:py-1 text-[9px] md:text-[10px] font-black tracking-[0.1em] text-purple-400/80 uppercase border border-purple-500/20">
                          {formatType(item.types)}
                        </div>
                        <div className="hidden md:block h-px w-4 bg-foreground/20" />
                        <div className="text-[10px] md:text-[11px] font-bold text-foreground/50 uppercase tracking-widest">
                          {item.formattedAddress.split(",")[0]}
                        </div>
                        {pulseTags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-foreground/10 bg-foreground/[0.03] px-2 py-0.5 md:px-3 md:py-1 text-[9px] md:text-[10px] font-bold uppercase tracking-[0.15em] text-foreground/50"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-start gap-3 lg:items-end">
                    <div className="flex items-center gap-3">
                      {item.priceLevel && (
                        <div className="text-[11px] font-black tracking-widest text-foreground/40 uppercase">
                          {getPriceLevel(item.priceLevel)}
                        </div>
                      )}
                      {item.rating && (
                        <div className="flex items-center gap-1.5 text-purple-400">
                          <Star className="h-4 w-4 fill-current" />
                          <span className="text-xl font-black tracking-tighter">
                            {item.rating}
                          </span>
                        </div>
                      )}
                    </div>
                    {item.userRatingCount && (
                      <>
                        <div className="text-[11px] font-black text-foreground/40 uppercase tracking-widest mt-1">
                          {formatPopulation(item.userRatingCount)} Reviews
                        </div>
                        <div className="text-[10px] font-black text-purple-300/70 uppercase tracking-[0.2em]">
                          {formatPopulation(item.userRatingCount)} Travelers Interested
                        </div>
                      </>
                    )}
                    {insiderTips.length > 0 && (
                      <div className="w-full rounded-2xl border border-purple-500/15 bg-purple-500/5 p-3 text-[11px] text-purple-50/90">
                        <div className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-purple-200/70">
                          Insider tips
                        </div>
                        <div className="space-y-1 text-foreground/80">
                          {insiderTips.map((tip) => (
                            <div key={tip}>{tip}</div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {item.googleMapsUri && (
                        <a
                          href={item.googleMapsUri}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => trackAction("click_maps_link")}
                          className="flex items-center justify-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.15em] text-blue-300 transition-all hover:border-blue-400/50 hover:bg-blue-500/20 hover:text-blue-200 active:scale-95"
                        >
                          <MapPin className="h-4 w-4" />
                          <span>Open in Maps</span>
                          <ExternalLink className="h-3 w-3 opacity-60" />
                        </a>
                      )}
                      <button
                        onClick={() => toggleSave(item, activeTab)}
                        className={`flex w-28 items-center justify-center gap-2 rounded-xl border py-2 text-[11px] font-black uppercase tracking-[0.15em] transition-all ${savedIds.has(item.id)
                          ? "border-purple-500/30 bg-purple-500/10 text-purple-200 hover:border-purple-400/50"
                          : "border-foreground/10 bg-foreground/[0.03] text-foreground/50 hover:border-purple-500/20 hover:text-foreground"
                          }`}
                        aria-pressed={savedIds.has(item.id)}
                      >
                        {savedIds.has(item.id) ? (
                          <>
                            <BookmarkCheck className="h-4 w-4" />
                            <span>Saved</span>
                          </>
                        ) : (
                          <>
                            <BookmarkPlus className="h-4 w-4" />
                            <span>Save</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => toggleExpand(item.id)}
                        className="flex w-28 items-center justify-center gap-2 rounded-xl border border-foreground/10 bg-foreground/[0.03] py-2 text-[11px] font-black uppercase tracking-[0.15em] text-foreground/60 transition-colors duration-100 hover:border-purple-500/30 hover:text-foreground"
                        aria-expanded={isExpanded}
                      >
                        {isExpanded ? "Hide notes" : "Add insight"}
                      </button>
                    </div>
                  </div>
                </div>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        key="notes"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                        className="w-full space-y-3 border-t border-foreground/5 pt-4"
                      >
                      {savedNote && (
                        <div className="rounded-2xl border border-purple-500/15 bg-purple-500/5 p-4 text-sm text-purple-100/90">
                          <div className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-purple-200/80">
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
                            className="w-full rounded-2xl border border-foreground/10 bg-foreground/[0.03] px-4 py-3 text-sm text-foreground/80 outline-none transition-colors duration-100 focus:border-purple-500/40 focus:bg-foreground/[0.05] focus:ring-2 focus:ring-purple-500/20"
                            placeholder="Share a quick tip, vibe, or hidden detail..."
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveNote(item.id, noteValue)}
                              className="rounded-xl border border-purple-500/30 bg-purple-500/20 px-4 py-2 text-[11px] font-black uppercase tracking-[0.15em] text-purple-50 transition-colors duration-100 hover:border-purple-400/50 hover:bg-purple-500/30"
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
              </div>
            );
          })}
          {displayData.length === 0 && (
            <div className="py-20 text-center text-foreground/20 text-xs font-black uppercase tracking-[0.2em]">
              No {getPriceLevel(selectedPrice!) || activeTab} spots discovered in this area
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

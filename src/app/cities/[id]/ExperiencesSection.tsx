"use client";

import { useEffect, useMemo, useState } from "react";
import { OptimizedImage } from "@/components/OptimizedImage";
import type { Landmark } from "@/lib/places";
import { formatPopulation } from "@/lib/format";
import {
  getJsonStorageItem,
  getStorageItem,
  setJsonStorageItem,
} from "@/lib/storage";
import {
  Star,
  Ticket,
  Utensils,
  Hotel,
  Bookmark,
  BookmarkCheck,
  MapPin,
  ExternalLink,
  Pencil,
  X,
} from "lucide-react";
import { useAnalytics } from "@/lib/useAnalytics";
import {
  Button,
  Caption,
  Card,
  Chip,
  EmptyState,
  Heading,
  Row,
  Stack,
  Text,
  cx,
} from "@/components/atlas";

const STORAGE_KEY = "atlas_saved_places";
const NOTES_STORAGE_KEY = "atlas_place_notes";
const NOTE_KEY_PREFIX = "k_";

type PlaceType = "landmarks" | "restaurants" | "hotels";

type SavedPlace = {
  id: string;
  city: string;
  name: string;
  type: PlaceType;
  address?: string;
  googleMapsUri?: string;
  priceLevel?: string;
  rating?: number;
};
type CityNotes = Record<string, string>;

const sanitizeKey = (key: string) => `${NOTE_KEY_PREFIX}${encodeURIComponent(key)}`;

const sanitizeNotes = (notes: CityNotes): CityNotes =>
  Object.fromEntries(
    Object.entries(notes)
      .filter(([, value]) => typeof value === "string")
      .map(([key, value]) => [sanitizeKey(key), value as string]),
  );

const parseStoredNotes = (raw: string | null): Map<string, CityNotes> => {
  if (!raw) return new Map();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return new Map();
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return new Map();
  }
  return new Map(
    Object.entries(parsed)
      .filter(([, v]) => v && typeof v === "object" && !Array.isArray(v))
      .map(([k, v]) => [sanitizeKey(k), sanitizeNotes(v as CityNotes)]),
  );
};

function topK<T>(arr: T[], k: number, score: (item: T) => number): T[] {
  if (arr.length <= k) return [...arr].sort((a, b) => score(b) - score(a));
  return [...arr].sort((a, b) => score(b) - score(a)).slice(0, k);
}

const priceLabels = new Map<string, string>([
  ["PRICE_LEVEL_FREE", "Free"],
  ["PRICE_LEVEL_INEXPENSIVE", "$"],
  ["PRICE_LEVEL_MODERATE", "$$"],
  ["PRICE_LEVEL_EXPENSIVE", "$$$"],
  ["PRICE_LEVEL_VERY_EXPENSIVE", "$$$$"],
]);

function formatType(types?: string[]) {
  const primary = types?.at(0);
  if (!primary) return "Point of interest";
  return primary.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function addressPrimary(address?: string): string | null {
  if (!address) return null;
  const first = address.split(",").map((s) => s.trim()).filter(Boolean)[0];
  return first || null;
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
  const [tab, setTab] = useState<PlaceType>("landmarks");
  const [priceFilter, setPriceFilter] = useState<string | null>(null);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [notes, setNotes] = useState<CityNotes>({});
  const [notesHydrated, setNotesHydrated] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const { trackAction } = useAnalytics();

  // Load saved places
  useEffect(() => {
    const parsed = getJsonStorageItem<SavedPlace[]>(STORAGE_KEY, []);
    queueMicrotask(() => {
      if (Array.isArray(parsed)) setSavedPlaces(parsed);
      setIsHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    setJsonStorageItem(STORAGE_KEY, savedPlaces);
  }, [isHydrated, savedPlaces]);

  // Load city notes
  useEffect(() => {
    const raw = getStorageItem(NOTES_STORAGE_KEY);
    const safeKey = sanitizeKey(cityName);
    const notesMap = parseStoredNotes(raw);
    const safeNotes = sanitizeNotes(notesMap.get(safeKey) ?? {});
    queueMicrotask(() => {
      setNotes(safeNotes);
      setNotesHydrated(true);
    });
  }, [cityName]);

  const persistNotes = (next: CityNotes) => {
    if (!notesHydrated) return;
    const raw = getStorageItem(NOTES_STORAGE_KEY);
    const notesMap = parseStoredNotes(raw);
    notesMap.set(sanitizeKey(cityName), sanitizeNotes(next));
    setJsonStorageItem(NOTES_STORAGE_KEY, Object.fromEntries(notesMap));
  };

  const saveNote = (placeId: string, text: string) => {
    const safeId = sanitizeKey(placeId);
    setNotes((prev) => {
      const next = { ...prev };
      const trimmed = text.trim();
      if (trimmed) {
        // eslint-disable-next-line security/detect-object-injection
        next[safeId] = trimmed;
        trackAction("add_note");
      } else {
        // eslint-disable-next-line security/detect-object-injection
        delete next[safeId];
      }
      persistNotes(next);
      return next;
    });
  };

  const rawData = tab === "landmarks" ? landmarks : tab === "restaurants" ? restaurants : hotels;
  const filtered = priceFilter
    ? rawData.filter((i) => i.priceLevel === priceFilter)
    : rawData;
  const display = topK(filtered, 6, (i) => i.userRatingCount || 0);

  const savedIds = useMemo(
    () => new Set(savedPlaces.filter((p) => p.city === cityName).map((p) => p.id)),
    [cityName, savedPlaces],
  );

  const tabs: { id: PlaceType; label: string; icon: typeof Ticket; count: number }[] = [
    { id: "landmarks", label: "Landmarks", icon: Ticket, count: landmarks.length },
    { id: "restaurants", label: "Dining", icon: Utensils, count: restaurants.length },
    { id: "hotels", label: "Stays", icon: Hotel, count: hotels.length },
  ];

  const toggleSave = (place: Landmark) => {
    setSavedPlaces((prev) => {
      const exists = prev.some((p) => p.id === place.id && p.city === cityName);
      if (exists) {
        trackAction("remove_save");
        return prev.filter((p) => !(p.id === place.id && p.city === cityName));
      }
      trackAction("save_place");
      return [
        ...prev,
        {
          id: place.id,
          city: cityName,
          name: place.displayName.text,
          type: tab,
          address: place.formattedAddress,
          googleMapsUri: place.googleMapsUri,
          priceLevel: place.priceLevel,
          rating: place.rating,
        },
      ];
    });
  };

  return (
    <section aria-labelledby="experiences-heading">
      <Stack gap={6}>
        <Stack gap={2}>
          <Caption>Top places</Caption>
          <Heading level={2} id="experiences-heading">
            Things to see, eat and rest
          </Heading>
        </Stack>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Experience category">
          {tabs.map(({ id, label, icon: Icon, count }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setTab(id);
                  setPriceFilter(null);
                }}
                className={cx(
                  "inline-flex min-h-[var(--touch-target-min)] items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "border-[color:var(--color-foreground)] bg-[color:var(--color-foreground)] text-[color:var(--color-background)]"
                    : "border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] text-[color:var(--color-foreground)] hover:border-[color:var(--color-foreground)]",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                <span>{label}</span>
                <span
                  className={cx(
                    "rounded-full px-1.5 text-xs font-semibold tabular-nums",
                    active
                      ? "bg-[color:var(--color-background)]/20"
                      : "bg-[color:var(--color-surface-muted)] text-[color:var(--color-muted)]",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {tab !== "landmarks" && (
          <Row gap={2} wrap aria-label="Filter by price">
            {["PRICE_LEVEL_INEXPENSIVE", "PRICE_LEVEL_MODERATE", "PRICE_LEVEL_EXPENSIVE", "PRICE_LEVEL_VERY_EXPENSIVE"].map((lvl) => (
              <Chip
                key={lvl}
                size="sm"
                selected={priceFilter === lvl}
                onClick={() => setPriceFilter(priceFilter === lvl ? null : lvl)}
              >
                {priceLabels.get(lvl)}
              </Chip>
            ))}
          </Row>
        )}

        {display.length === 0 ? (
          <EmptyState
            title="No places yet"
            description="We couldn't find curated places for this category in this city."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {display.map((item) => {
              const isSaved = savedIds.has(item.id);
              const safeId = sanitizeKey(item.id);
              // eslint-disable-next-line security/detect-object-injection
              const note = notes[safeId];
              const isEditing = editingId === item.id;
              const rating = item.rating ? item.rating.toFixed(1) : null;
              const reviews =
                item.userRatingCount != null && item.userRatingCount > 0
                  ? `${formatPopulation(item.userRatingCount)} reviews`
                  : null;
              const price = item.priceLevel ? priceLabels.get(item.priceLevel) : null;
              const addr = addressPrimary(item.formattedAddress);
              return (
                <Card key={item.id} variant="image">
                  {item.imageUrl ? (
                    <div className="relative aspect-[4/3] w-full overflow-hidden">
                      <OptimizedImage
                        src={item.imageUrl}
                        blurhash={item.blurhash}
                        alt={item.displayName.text}
                        className="h-full w-full"
                        objectFit="cover"
                      />
                      <div
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 to-transparent"
                      />
                      {rating && (
                        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/55 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur">
                          <Star className="h-3 w-3 fill-amber-300 text-amber-300" aria-hidden />
                          {rating}
                        </span>
                      )}
                    </div>
                  ) : null}
                  <Stack gap={3} className="p-4 md:p-5">
                    <Stack gap={1}>
                      <Row gap={2} wrap>
                        <Caption>{formatType(item.types)}</Caption>
                        {price && (
                          <Caption className="text-[color:var(--color-muted-soft)]">
                            · {price}
                          </Caption>
                        )}
                      </Row>
                      <Heading level={3}>{item.displayName.text}</Heading>
                      {addr && (
                        <Row gap={2} className="text-[color:var(--color-muted)]">
                          <MapPin className="h-3.5 w-3.5" aria-hidden />
                          <Text size="sm" tone="muted" className="truncate">
                            {addr}
                          </Text>
                        </Row>
                      )}
                    </Stack>

                    {!item.imageUrl && rating && (
                      <Row gap={3} className="text-xs text-[color:var(--color-muted)]">
                        <Row gap={1}>
                          <Star className="h-3.5 w-3.5 text-[color:var(--color-accent)]" aria-hidden />
                          <span className="font-semibold text-[color:var(--color-foreground)]">
                            {rating}
                          </span>
                        </Row>
                        {reviews && <span>· {reviews}</span>}
                      </Row>
                    )}

                    {/* Actions */}
                    <Row gap={2} wrap>
                      {item.googleMapsUri && (
                        <a
                          href={item.googleMapsUri}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex min-h-[var(--touch-target-min)] items-center gap-1.5 rounded-[var(--radius-md)] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] px-3 text-sm font-medium text-[color:var(--color-foreground)] transition-colors hover:border-[color:var(--color-foreground)]"
                        >
                          <ExternalLink className="h-4 w-4" aria-hidden />
                          Directions
                        </a>
                      )}
                      <Button
                        size="sm"
                        variant={isSaved ? "primary" : "secondary"}
                        onClick={() => toggleSave(item)}
                        aria-pressed={isSaved}
                        aria-label={isSaved ? `Remove ${item.displayName.text} from saved` : `Save ${item.displayName.text}`}
                      >
                        {isSaved ? (
                          <BookmarkCheck className="h-4 w-4" aria-hidden />
                        ) : (
                          <Bookmark className="h-4 w-4" aria-hidden />
                        )}
                        {isSaved ? "Saved" : "Save"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (isEditing) {
                            setEditingId(null);
                            setDraft("");
                          } else {
                            setEditingId(item.id);
                            setDraft(note ?? "");
                          }
                        }}
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                        {note ? "Edit note" : "Add note"}
                      </Button>
                    </Row>

                    {note && !isEditing && (
                      <div className="rounded-[var(--radius-md)] border border-[color:var(--color-line)] bg-[color:var(--color-surface-muted)] p-3">
                        <Caption className="mb-1">Your note</Caption>
                        <Text size="sm" tone="muted">
                          {note}
                        </Text>
                      </div>
                    )}

                    {isEditing && (
                      <div className="rounded-[var(--radius-md)] border border-[color:var(--color-line)] bg-[color:var(--color-surface-muted)] p-3">
                        <Row justify="between" align="center" className="mb-2">
                          <Caption>Note</Caption>
                          <button
                            type="button"
                            aria-label="Close note editor"
                            onClick={() => {
                              setEditingId(null);
                              setDraft("");
                            }}
                            className="text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </Row>
                        <textarea
                          value={draft}
                          onChange={(e) => setDraft(e.target.value.slice(0, 500))}
                          maxLength={500}
                          rows={3}
                          aria-label={`Note for ${item.displayName.text}`}
                          className="w-full rounded-[var(--radius-sm)] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-2 text-sm text-[color:var(--color-foreground)] outline-none focus-visible:border-[color:var(--color-accent)]"
                        />
                        <Row gap={2} className="mt-2" justify="end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              saveNote(item.id, "");
                              setEditingId(null);
                              setDraft("");
                            }}
                          >
                            Clear
                          </Button>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => {
                              saveNote(item.id, draft);
                              setEditingId(null);
                              setDraft("");
                            }}
                          >
                            Save note
                          </Button>
                        </Row>
                      </div>
                    )}
                  </Stack>
                </Card>
              );
            })}
          </div>
        )}
      </Stack>
    </section>
  );
}

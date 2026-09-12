"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Compass,
  Globe2,
  Info,
  Scale,
  Search,
  Wind,
  Laptop,
  Accessibility as AccessibilityIcon,
  CalendarDays,
} from "lucide-react";
import { searchCities, cityHref, type CitySearchResult } from "@/lib/cities";
import { sanitizeSearchInput } from "@/components/features/city/city-search-config";
import CityFingerprint from "@/components/ui/CityFingerprint";

/** Dispatch this event from anywhere to open the palette. */
export const OPEN_PALETTE_EVENT = "bcs:open-palette";

interface StaticDestination {
  href: string;
  label: string;
  keywords: string;
  icon: typeof Compass;
}

const DESTINATIONS: StaticDestination[] = [
  { href: "/", label: "Explore cities", keywords: "home search explore", icon: Compass },
  { href: "/cities", label: "All cities", keywords: "index list cities", icon: Globe2 },
  { href: "/countries", label: "Browse by country", keywords: "countries nations", icon: Globe2 },
  {
    href: "/resources/top-cities",
    label: "The Global 50",
    keywords: "top cities ranking editorial",
    icon: BookOpen,
  },
  {
    href: "/best-cities-by-air-quality",
    label: "Cleanest air",
    keywords: "air quality aqi pollution hub",
    icon: Wind,
  },
  {
    href: "/best-cities-for-digital-nomads",
    label: "For digital nomads",
    keywords: "remote work nomad wifi hub",
    icon: Laptop,
  },
  {
    href: "/best-cities-to-visit-in",
    label: "Best cities by month",
    keywords: "when to go seasons months",
    icon: CalendarDays,
  },
  { href: "/compare", label: "Compare cities", keywords: "compare side by side", icon: Scale },
  {
    href: "/passport",
    label: "Your passport",
    keywords: "passport stamps saved history record",
    icon: BookOpen,
  },
  { href: "/methodology", label: "Methodology", keywords: "sources how ranking works", icon: Info },
  { href: "/about", label: "About the project", keywords: "about team story", icon: Info },
  {
    href: "/accessibility",
    label: "Accessibility statement",
    keywords: "a11y wcag accessibility",
    icon: AccessibilityIcon,
  },
];

type PaletteItem =
  | { kind: "route"; href: string; label: string; icon: typeof Compass }
  | { kind: "city"; city: CitySearchResult };

/**
 * Command palette (innovation proposal Idea 6): ⌘K / Ctrl-K global search
 * over cities and site destinations. Renders as a centered dialog on
 * desktop and a bottom sheet on small screens (see .palette-* styles).
 */
export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cities, setCities] = useState<CitySearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setCities([]);
    setActiveIndex(0);
  }, []);

  // Global listeners: keyboard shortcut + programmatic open event.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
      if (event.key === "Escape") close();
    };
    const onOpenEvent = () => setOpen(true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_PALETTE_EVENT, onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_PALETTE_EVENT, onOpenEvent);
    };
  }, [close]);

  // Focus + scroll lock while open.
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Debounced city search.
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      queueMicrotask(() => setCities([]));
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchCities(trimmed, 6);
        setCities(results);
      } catch {
        setCities([]);
      }
    }, 180);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open]);

  const items = useMemo<PaletteItem[]>(() => {
    const needle = query.trim().toLowerCase();
    const routes = DESTINATIONS.filter(
      (d) =>
        needle.length === 0 || d.label.toLowerCase().includes(needle) || d.keywords.includes(needle)
    )
      .slice(0, needle.length === 0 ? 6 : 4)
      .map((d) => ({ kind: "route" as const, href: d.href, label: d.label, icon: d.icon }));
    const cityItems = cities.map((city) => ({ kind: "city" as const, city }));
    return [...cityItems, ...routes];
  }, [query, cities]);

  useEffect(() => {
    queueMicrotask(() => setActiveIndex(0));
  }, [items.length]);

  const navigate = useCallback(
    (item: PaletteItem) => {
      close();
      if (item.kind === "route") {
        router.push(item.href);
      } else {
        router.push(cityHref(item.city, { lat: item.city.lat, lng: item.city.lng }));
      }
    },
    [close, router]
  );

  const onInputKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, items.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const item = items.at(activeIndex);
      if (item) navigate(item);
    }
  };

  if (!open) return null;

  return (
    <div
      className="palette-overlay"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Site search"
        className="palette-panel glass-dropdown"
      >
        <div className="border-line flex items-center gap-3 border-b px-4 py-3">
          <Search className="text-muted h-4 w-4 shrink-0" aria-hidden />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(sanitizeSearchInput(event.target.value).slice(0, 100))}
            onKeyDown={onInputKeyDown}
            placeholder="Search cities and pages…"
            aria-label="Search cities and pages"
            autoComplete="off"
            role="combobox"
            aria-expanded={items.length > 0}
            aria-controls="palette-results"
            aria-activedescendant={items.length > 0 ? `palette-item-${activeIndex}` : undefined}
            className="text-foreground placeholder:text-muted w-full bg-transparent text-base outline-none"
          />
          <kbd className="border-line text-muted hidden rounded-md border px-1.5 py-0.5 text-[0.7rem] font-semibold sm:block">
            esc
          </kbd>
        </div>
        <ul id="palette-results" role="listbox" aria-label="Results" className="palette-results">
          {items.length === 0 ? (
            <li className="text-muted px-4 py-8 text-center text-sm" aria-live="polite">
              {query.trim().length >= 2 ? "No matches." : "Type to search cities and pages."}
            </li>
          ) : (
            items.map((item, index) => {
              const isActive = index === activeIndex;
              const rowClass = `flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors ${
                isActive ? "bg-accent-soft/80" : "hover:bg-surface/72"
              }`;
              return (
                <li
                  key={item.kind === "city" ? `city-${item.city.id}` : item.href}
                  id={`palette-item-${index}`}
                  role="option"
                  aria-selected={isActive}
                >
                  <button
                    type="button"
                    className={rowClass}
                    onClick={() => navigate(item)}
                    onPointerMove={() => setActiveIndex(index)}
                    tabIndex={-1}
                  >
                    {item.kind === "city" ? (
                      <>
                        <CityFingerprint
                          city={{
                            id: item.city.id,
                            lat: item.city.lat,
                            lng: item.city.lng,
                            population: item.city.population,
                          }}
                          className="h-7 w-7 shrink-0"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">
                            {item.city.city}
                          </span>
                          <span className="text-muted block truncate text-xs">
                            {item.city.country}
                          </span>
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="border-line bg-surface/72 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border">
                          <item.icon className="text-muted h-3.5 w-3.5" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                          {item.label}
                        </span>
                      </>
                    )}
                    <ArrowRight
                      className={`h-4 w-4 shrink-0 transition-colors ${isActive ? "text-accent" : "text-muted"}`}
                      aria-hidden
                    />
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}

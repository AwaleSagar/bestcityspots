"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, CornerDownLeft, LoaderCircle, Search } from "lucide-react";
import type { City } from "@/lib/cities";
import { cityHref } from "@/lib/city-href";
import { matchDestinations, sanitizeSearchInput, SITE_DESTINATIONS } from "@/lib/search-utils";
import { useRecentCities } from "@/hooks/useRecentCities";
import { Dialog } from "@/components/ui/Dialog";
import { cn } from "@/components/ui/cn";
import { CityOption } from "./CityOption";
import { OPEN_SEARCH_EVENT } from "./search-events";
import { useActiveIndex } from "./useActiveIndex";
import { useCitySearch } from "./useCitySearch";

type Item =
  | { kind: "city"; city: City }
  | { kind: "route"; href: string; label: string }
  | { kind: "all"; query: string };

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/**
 * Global search (⌘K / Ctrl+K / "/"): cities first, then site destinations.
 * Mounted once in the root layout; anything can open it with openSearch().
 */
export function SearchDialog() {
  const titleId = useId();
  const listId = useId();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [openedAt, setOpenedAt] = useState(pathname);
  const { recent, addRecent } = useRecentCities();
  const { query, results, status } = useCitySearch(open ? value : "", 6);
  const openRef = useRef(open);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  // Close when navigation lands on a new page.
  if (open && openedAt !== pathname) {
    setOpen(false);
    setOpenedAt(pathname);
  }

  useEffect(() => {
    const show = (initial = "") => {
      setValue(initial);
      setOpenedAt(window.location.pathname);
      setOpen(true);
    };
    const onKey = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (openRef.current) setOpen(false);
        else show();
      } else if (
        event.key === "/" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !isTypingTarget(event.target)
      ) {
        event.preventDefault();
        show();
      }
    };
    const onOpen = (event: Event) => show((event as CustomEvent<string>).detail ?? "");
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_SEARCH_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_SEARCH_EVENT, onOpen);
    };
  }, []);

  const cityItems: Item[] = (query ? results : recent.slice(0, 5)).map((city) => ({
    kind: "city",
    city,
  }));
  const routeItems: Item[] = (query ? matchDestinations(query) : SITE_DESTINATIONS.slice(0, 5)).map(
    (destination) => ({ kind: "route", href: destination.href, label: destination.label })
  );
  const allItem: Item[] = query ? [{ kind: "all", query }] : [];
  const items = [...cityItems, ...routeItems, ...allItem];

  const { activeIndex, setActiveIndex, onArrowKeys } = useActiveIndex(
    items.length,
    `${query ?? ""}:${items.length}`
  );

  const activate = (item: Item) => {
    if (item.kind === "city") {
      addRecent(item.city);
      router.push(cityHref(item.city));
    } else if (item.kind === "route") {
      router.push(item.href);
    } else {
      router.push(`/search?q=${encodeURIComponent(item.query)}`);
    }
    setOpen(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (onArrowKeys(event)) return;
    if (event.key === "Enter") {
      event.preventDefault();
      const item = items.at(activeIndex >= 0 ? activeIndex : 0);
      if (item) activate(item);
    }
  };

  const optionId = (index: number) => `${listId}-${index}`;
  const noCities = Boolean(query) && status === "ready" && results.length === 0;

  return (
    <Dialog open={open} onClose={() => setOpen(false)} labelledBy={titleId}>
      <h2 id={titleId} className="sr-only">
        Search Best City Spots
      </h2>
      <div className="border-rule flex items-center gap-3 border-b px-4">
        <Search aria-hidden className="text-ink-muted size-5 shrink-0" />
        <input
          type="search"
          role="combobox"
          aria-label="Search cities and pages"
          aria-expanded={items.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="go"
          autoFocus
          placeholder="Search cities, countries, guides…"
          value={value}
          maxLength={100}
          onChange={(event) => setValue(sanitizeSearchInput(event.target.value))}
          onKeyDown={onKeyDown}
          className="placeholder:text-ink-subtle h-14 min-w-0 flex-1 bg-transparent text-lg outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {status === "loading" ? (
          <LoaderCircle aria-hidden className="text-ink-muted size-4 shrink-0 animate-spin" />
        ) : null}
        <kbd className="border-rule text-ink-muted hidden rounded-sm border px-1.5 text-xs sm:inline">
          Esc
        </kbd>
      </div>

      <div className="max-h-[min(60vh,28rem)] overflow-y-auto p-2">
        <ul id={listId} role="listbox" aria-label="Search suggestions">
          {cityItems.length > 0 ? (
            <li role="presentation" className="text-ink-muted px-3 pt-2 pb-1 text-xs font-medium">
              {query ? "Cities" : "Recent"}
            </li>
          ) : null}
          {cityItems.map((item, index) =>
            item.kind === "city" ? (
              <CityOption
                key={`city-${item.city.id}`}
                id={optionId(index)}
                city={item.city}
                query={query}
                active={index === activeIndex}
                onSelect={() => activate(item)}
                onHover={() => setActiveIndex(index)}
              />
            ) : null
          )}
          {routeItems.length > 0 ? (
            <li role="presentation" className="text-ink-muted px-3 pt-3 pb-1 text-xs font-medium">
              {query ? "Pages" : "Jump to"}
            </li>
          ) : null}
          {[...routeItems, ...allItem].map((item, offset) => {
            const index = cityItems.length + offset;
            const active = index === activeIndex;
            const label =
              item.kind === "route"
                ? item.label
                : item.kind === "all"
                  ? `All results for “${item.query}”`
                  : "";
            return (
              <li
                key={item.kind === "route" ? item.href : "all"}
                id={optionId(index)}
                role="option"
                aria-selected={active}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => activate(item)}
                onMouseMove={() => setActiveIndex(index)}
                className={cn(
                  "flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm",
                  active ? "bg-accent-soft" : "hover:bg-sunken",
                  item.kind === "all" && "text-accent mt-1 font-medium"
                )}
              >
                <ArrowRight aria-hidden className="text-ink-subtle size-4 shrink-0" />
                <span className="flex-1">{label}</span>
              </li>
            );
          })}
        </ul>
        {noCities ? (
          <p className="text-ink-muted px-3 py-3 text-sm">No cities match “{query}”.</p>
        ) : null}
      </div>

      <div className="border-rule text-ink-muted hidden items-center gap-4 border-t px-4 py-2.5 text-xs sm:flex">
        <span className="inline-flex items-center gap-1">
          <kbd className="border-rule rounded-sm border px-1">↑</kbd>
          <kbd className="border-rule rounded-sm border px-1">↓</kbd> to move
        </span>
        <span className="inline-flex items-center gap-1">
          <CornerDownLeft aria-hidden className="size-3.5" /> to open
        </span>
      </div>
    </Dialog>
  );
}

"use client";

import { useSyncExternalStore } from "react";
import { Search } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { openSearch } from "./search-events";

const subscribeNoop = () => () => {};

function useShortcutLabel() {
  return useSyncExternalStore(
    subscribeNoop,
    () => (/Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘K" : "Ctrl K"),
    () => null
  );
}

/** Header button that opens the global search dialog. */
export function SearchTrigger({ className }: { className?: string }) {
  const shortcut = useShortcutLabel();
  return (
    <button
      type="button"
      onClick={() => openSearch()}
      aria-label="Search cities"
      aria-keyshortcuts="Meta+K Control+K /"
      className={cn(
        "text-ink-muted ease-standard hover:text-ink inline-flex h-11 items-center gap-2 rounded-md transition-colors duration-150",
        "hover:bg-sunken md:border-rule md:bg-surface md:hover:border-rule-strong md:hover:bg-surface w-11 justify-center md:w-56 md:justify-start md:border md:px-3",
        className
      )}
    >
      <Search aria-hidden className="size-5 md:size-4" />
      <span className="hidden flex-1 text-left text-sm md:inline">Search cities</span>
      {shortcut ? (
        <kbd className="border-rule hidden rounded-sm border px-1.5 text-xs md:inline">
          {shortcut}
        </kbd>
      ) : null}
    </button>
  );
}

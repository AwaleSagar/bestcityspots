"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { OPEN_PALETTE_EVENT } from "./CommandPalette";

/**
 * Nav trigger for the command palette. Shows the platform-correct shortcut
 * hint on pointer devices; a plain search button on touch.
 */
export default function PaletteTrigger() {
  const [isMac, setIsMac] = useState(true);

  useEffect(() => {
    const mac = /mac|iphone|ipad/i.test(navigator.platform ?? "");
    queueMicrotask(() => setIsMac(mac));
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_PALETTE_EVENT))}
      aria-label="Search cities and pages"
      aria-keyshortcuts="Meta+K Control+K"
      className="border-line bg-surface/72 text-muted hover:text-foreground hover:border-accent/18 flex min-h-11 items-center gap-2 rounded-full border px-3 transition-colors"
    >
      <Search className="h-4 w-4" aria-hidden />
      <kbd className="hidden text-[0.7rem] font-semibold tracking-wide md:block" aria-hidden>
        {isMac ? "⌘K" : "Ctrl K"}
      </kbd>
    </button>
  );
}

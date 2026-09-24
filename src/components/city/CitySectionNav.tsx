"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/components/ui/cn";

export interface SectionLink {
  id: string;
  label: string;
}

/**
 * Sticky in-page navigation with scroll-spy. Sits under the site header;
 * scrolls sideways on narrow screens and keeps the current item in view.
 */
export function CitySectionNav({ sections }: { sections: readonly SectionLink[] }) {
  const [active, setActive] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      // The current section is the last one whose top has passed the band
      // just below the sticky header + this nav.
      let current: string | null = null;
      for (const section of sections) {
        const element = document.getElementById(section.id);
        if (element && element.getBoundingClientRect().top <= 160) current = section.id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [sections]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    if (!active) {
      list.scrollTo({ left: 0 });
      return;
    }
    const link = listRef.current?.querySelector<HTMLElement>(`[data-section="${active}"]`);
    if (!link) return;
    const left = link.offsetLeft - list.clientWidth / 2 + link.clientWidth / 2;
    list.scrollTo({ left, behavior: "auto" });
  }, [active]);

  return (
    <nav
      aria-label="On this page"
      data-print-hide
      className="border-rule bg-paper sticky top-16 z-30 -mx-4 border-b px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
    >
      <ul ref={listRef} className="scroll-x flex gap-1">
        {sections.map((section) => {
          const current = section.id === active;
          return (
            <li key={section.id} className="shrink-0">
              <a
                href={`#${section.id}`}
                data-section={section.id}
                aria-current={current ? "location" : undefined}
                className={cn(
                  "ease-standard inline-flex h-12 items-center border-b-2 px-3 text-sm font-medium transition-colors duration-150",
                  current
                    ? "border-accent text-ink"
                    : "text-ink-muted hover:text-ink border-transparent"
                )}
              >
                {section.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

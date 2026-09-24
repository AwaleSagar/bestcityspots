"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark } from "lucide-react";
import { useSavedPlaces } from "@/hooks/useSavedPlaces";
import { cn } from "@/components/ui/cn";

/** Header link to /saved with a live count of saved places. */
export function SavedLink({ className }: { className?: string }) {
  const { places } = useSavedPlaces();
  const pathname = usePathname();
  const count = places.length;
  const active = pathname === "/saved";
  return (
    <Link
      href="/saved"
      aria-current={active ? "page" : undefined}
      aria-label={count > 0 ? `Saved places (${count})` : "Saved places"}
      className={cn(
        "ease-standard hover:bg-sunken relative inline-flex h-11 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors duration-150",
        active ? "text-ink" : "text-ink-muted hover:text-ink",
        className
      )}
    >
      <Bookmark aria-hidden className="size-4" />
      <span className="hidden xl:inline">Saved</span>
      {count > 0 ? (
        <span className="bg-accent text-on-accent rounded-full px-1.5 text-xs leading-5 font-semibold tabular-nums">
          {count}
        </span>
      ) : null}
    </Link>
  );
}

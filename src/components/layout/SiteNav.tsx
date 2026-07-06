import Link from "next/link";
import { MapPinned } from "lucide-react";
import DesktopNavLinks from "@/components/layout/DesktopNavLinks";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import PaletteTrigger from "@/components/features/palette/PaletteTrigger";

export default function SiteNav() {
  return (
    <header className="border-line bg-background/90 sticky top-0 z-[200] w-full border-b backdrop-blur-md">
      <div className="container-gutter mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="group flex min-h-11 min-w-0 flex-1 items-center gap-2.5"
          aria-label="Best City Spots home"
        >
          <div className="bg-accent text-accent-contrast flex h-11 w-11 shrink-0 items-center justify-center rounded-lg">
            <MapPinned className="h-4 w-4" aria-hidden />
          </div>
          <span className="text-foreground truncate text-base font-semibold tracking-tight">
            Best City Spots
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-1">
          <DesktopNavLinks />
          <PaletteTrigger />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

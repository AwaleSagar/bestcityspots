import Link from "next/link";
import { MapPin, BookOpen, Info } from "lucide-react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

type NavLink = {
  href: string;
  label: string;
  short: string;
  icon: typeof MapPin;
  cta?: boolean;
};

const navLinks: NavLink[] = [
  { href: "/", label: "Explore Cities", short: "Explore", icon: MapPin },
  { href: "/resources/top-cities", label: "Free Guide: Top Cities", short: "Guide", icon: BookOpen, cta: true },
  { href: "/about", label: "About Best City Spots", short: "About", icon: Info },
];

export default function SiteNav() {
  return (
    <>
      <header className="sticky top-0 z-[200] w-full bg-background/80 backdrop-blur-xl">
        <div className="container-gutter mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="group flex items-center gap-3 rounded-full bg-foreground/[0.04] px-4 py-2 text-[10px] font-black tracking-[0.3em] text-foreground/80 uppercase transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Best City Spots home"
          >
            <MapPin className="h-4 w-4 text-purple-400/80" aria-hidden />
            Best City Spots
          </Link>

          {/* Desktop: clean text nav (md and up) */}
          <nav className="hidden items-center gap-6 md:flex" aria-label="Main navigation">
            {navLinks.map(({ href, short, cta }) => (
              <Link
                key={href}
                href={href}
                className={
                  cta
                    ? "touch-target rounded-full bg-purple-500/10 px-5 py-2 text-[11px] font-bold tracking-wide text-purple-400 transition hover:bg-purple-500/20 active:scale-95"
                    : "touch-target text-[11px] font-bold tracking-wide text-foreground/60 transition hover:text-foreground"
                }
              >
                {short}
              </Link>
            ))}
            <div className="ml-2 pl-4 border-l border-foreground/10">
              <ThemeToggle />
            </div>
          </nav>

          {/* Mobile: theme toggle only (navigation handled by bottom nav) */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
          </div>
        </div>
      </header>
    </>
  );
}

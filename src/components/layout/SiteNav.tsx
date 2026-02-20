import Link from "next/link";
import { MapPin, BookOpen, Info, Compass } from "lucide-react";
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
  { href: "/resources/top-cities", label: "Free Guide: Top Cities", short: "Top Cities", icon: BookOpen, cta: true },
  { href: "/resources/top-cities#plan", label: "Plan Your Trip", short: "Plan", icon: Compass },
  { href: "/about", label: "About Best City Spots", short: "About", icon: Info },
];

export default function SiteNav() {
  return (
    <>
      <header className="sticky top-0 z-[200] w-full border-b border-foreground/[0.04] bg-background/80 backdrop-blur-xl">
        <div className="container-gutter mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="group flex items-center gap-2.5 rounded-full px-3 py-2 text-sm font-bold tracking-tight text-foreground/90 transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Best City Spots home"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10">
              <MapPin className="h-3.5 w-3.5 text-purple-400" aria-hidden />
            </div>
            <span className="font-bold">Best City Spots</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
            {navLinks.map(({ href, short, cta }) => (
              <Link
                key={href}
                href={href}
                className={
                  cta
                    ? "touch-target rounded-full bg-purple-500/10 px-5 py-2 text-sm font-semibold text-purple-400 transition-all duration-200 hover:bg-purple-500/20 active:scale-95"
                    : "touch-target rounded-full px-4 py-2 text-sm font-medium text-foreground/50 transition-all duration-200 hover:text-foreground hover:bg-foreground/[0.04]"
                }
              >
                {short}
              </Link>
            ))}
            <div className="ml-2 pl-3 border-l border-foreground/[0.06]">
              <ThemeToggle />
            </div>
          </nav>

          {/* Mobile: theme toggle only */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
          </div>
        </div>
      </header>
    </>
  );
}

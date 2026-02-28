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
      <header className="sticky top-0 z-[200] w-full border-b border-foreground/[0.05] bg-background/75 backdrop-blur-2xl backdrop-saturate-150">
        <div className="container-gutter mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link
            href="/"
            className="nav-link group flex items-center gap-3 rounded-full px-3 py-2 text-sm font-bold tracking-[-0.01em] text-foreground/90 transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Best City Spots home"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500/25 to-amber-500/10 transition-all duration-300 group-hover:from-orange-500/35 group-hover:to-amber-500/20 group-hover:shadow-lg group-hover:shadow-orange-500/15">
              <MapPin className="h-4 w-4 text-orange-400" aria-hidden />
            </div>
            <span className="font-bold tracking-tight">Best City Spots</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
            {navLinks.map(({ href, short, cta }) => (
              <Link
                key={href}
                href={href}
                className={
                  cta
                    ? "nav-link touch-target rounded-full bg-orange-500/[0.1] px-5 py-2.5 text-[13px] font-semibold text-orange-400 transition-all duration-300 hover:bg-orange-500/[0.2] active:scale-95"
                    : "nav-link touch-target rounded-full px-4 py-2.5 text-[13px] font-medium text-foreground/50 transition-all duration-300 hover:text-foreground hover:bg-foreground/[0.04]"
                }
              >
                {short}
              </Link>
            ))}
            <div className="ml-3 pl-3 border-l border-foreground/[0.07]">
              <ThemeToggle />
            </div>
          </nav>

          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
          </div>
        </div>
      </header>
    </>
  );
}

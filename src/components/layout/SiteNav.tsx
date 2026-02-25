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
      <header className="sticky top-0 z-[200] w-full border-b border-foreground/[0.04] bg-background/70 backdrop-blur-2xl backdrop-saturate-150">
        <div className="container-gutter mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link
            href="/"
            className="nav-link group flex items-center gap-3 rounded-full px-3 py-2 text-sm font-bold tracking-[-0.01em] text-foreground/90 transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Best City Spots home"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 transition-all duration-300 group-hover:from-purple-500/30 group-hover:to-purple-500/10 group-hover:shadow-lg group-hover:shadow-purple-500/10">
              <MapPin className="h-4 w-4 text-purple-400" aria-hidden />
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
                    ? "nav-link touch-target rounded-full bg-purple-500/8 px-5 py-2.5 text-[13px] font-semibold text-purple-400 transition-all duration-300 hover:bg-purple-500/15 active:scale-95"
                    : "nav-link touch-target rounded-full px-4 py-2.5 text-[13px] font-medium text-foreground/45 transition-all duration-300 hover:text-foreground hover:bg-foreground/[0.03]"
                }
              >
                {short}
              </Link>
            ))}
            <div className="ml-3 pl-3 border-l border-foreground/[0.06]">
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

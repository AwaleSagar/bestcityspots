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
      <header className="sticky top-0 z-[200] w-full border-b border-line/80 bg-background/78 backdrop-blur-2xl backdrop-saturate-150">
        <div className="container-gutter mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 md:py-4">
          <Link
            href="/"
            className="nav-link group flex items-center gap-3 rounded-full border border-line bg-surface/85 px-2.5 py-2 text-sm font-semibold tracking-[0.01em] text-foreground transition hover:border-accent/25 hover:bg-surface-strong/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Best City Spots home"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-accent text-accent-contrast shadow-sm transition-all duration-300 group-hover:scale-[1.03] group-hover:shadow-glow">
              <MapPin className="h-4 w-4" aria-hidden />
            </div>
            <div className="leading-tight">
              <span className="block font-semibold tracking-tight">Best City Spots</span>
              <span className="block text-[10px] font-medium uppercase tracking-[0.22em] text-muted">Atlas for urban explorers</span>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 md:flex" aria-label="Main navigation">
            {navLinks.map(({ href, short, cta }) => (
              <Link
                key={href}
                href={href}
                className={
                  cta
                    ? "nav-link touch-target rounded-full border border-accent/15 bg-accent-soft px-5 py-2.5 text-[12px] font-semibold tracking-[0.08em] text-accent-strong uppercase transition-all duration-300 hover:border-accent/25 hover:bg-accent-soft/80 active:scale-95"
                    : "nav-link touch-target rounded-full px-4 py-2.5 text-[12px] font-medium tracking-[0.06em] text-muted uppercase transition-all duration-300 hover:bg-surface hover:text-foreground"
                }
              >
                {short}
              </Link>
            ))}
            <div className="ml-2 border-l border-line pl-3">
              <ThemeToggle />
            </div>
          </nav>

          <div className="flex items-center gap-2 md:hidden">
            <Link
              href="/resources/top-cities"
              className="touch-target rounded-full border border-line bg-surface/85 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted transition-colors hover:text-foreground"
            >
              Guide
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>
    </>
  );
}

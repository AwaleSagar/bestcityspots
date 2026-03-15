import Link from "next/link";
import { MapPinned } from "lucide-react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const navLinks = [
  { href: "/", label: "Explore" },
  { href: "/resources/top-cities", label: "Top Cities" },
  { href: "/about", label: "About" },
] as const;

export default function SiteNav() {
  return (
    <header className="border-line/70 bg-background/92 sticky top-0 z-[200] w-full border-b backdrop-blur-xl">
      <div className="container-gutter mx-auto max-w-7xl px-4 py-3 sm:px-6">
        <div className="border-line bg-surface/82 flex items-center justify-between gap-3 rounded-[1.2rem] border px-3 py-3 shadow-sm sm:rounded-[1.4rem] md:rounded-[1.6rem] md:px-4">
          <Link
            href="/"
            className="group flex min-w-0 items-center gap-3 rounded-full px-1 py-1"
            aria-label="Best City Spots home"
          >
            <div className="border-line bg-accent text-accent-contrast flex h-11 w-11 shrink-0 items-center justify-center rounded-full border shadow-sm transition-transform duration-300 group-hover:scale-[1.03]">
              <MapPinned className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0 leading-none">
              <span className="text-foreground block truncate text-lg">Best City Spots</span>
              <span className="text-muted mt-1 block text-[0.62rem]">City intelligence</span>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 md:flex" aria-label="Main navigation">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="nav-pill touch-target text-muted-strong hover:border-accent/25 hover:text-foreground px-4 py-2 text-sm font-medium transition-colors duration-300"
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}

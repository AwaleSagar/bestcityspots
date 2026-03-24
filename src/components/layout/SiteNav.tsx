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
    <header className="sticky top-0 z-[200] w-full border-b border-line bg-background/90 backdrop-blur-lg">
      <div className="container-gutter mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="group flex min-w-0 items-center gap-2.5"
          aria-label="Best City Spots home"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-contrast">
            <MapPinned className="h-4 w-4" aria-hidden />
          </div>
          <span className="text-foreground truncate text-base font-semibold tracking-tight">
            Best City Spots
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <nav className="hidden items-center gap-0.5 md:flex" aria-label="Main navigation">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="nav-pill text-muted-strong hover:text-foreground rounded-lg px-3 py-2 text-sm font-medium transition-colors"
              >
                {label}
              </Link>
            ))}
          </nav>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

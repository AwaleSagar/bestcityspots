import Link from "next/link";
import { MapPinned } from "lucide-react";

const exploreLinks = [
  { href: "/", label: "Explore cities" },
  { href: "/cities", label: "All cities" },
  { href: "/countries", label: "Browse by country" },
  { href: "/resources/top-cities", label: "Top cities" },
  { href: "/best-cities-by-air-quality", label: "Cleanest air" },
  { href: "/best-cities-for-digital-nomads", label: "For digital nomads" },
] as const;

const companyLinks = [
  { href: "/about", label: "About the project" },
  { href: "/methodology", label: "Methodology" },
  { href: "/press", label: "Press kit" },
  { href: "/about#source-stack", label: "Data sources" },
] as const;

export default function SiteFooter() {
  return (
    <footer className="border-line border-t" role="contentinfo" aria-label="Site footer">
      <div
        className="container-gutter mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14"
        style={{ paddingBottom: "max(2.5rem, calc(env(safe-area-inset-bottom, 0px) + 2rem))" }}
      >
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="bg-accent text-accent-contrast flex h-9 w-9 items-center justify-center rounded-lg">
                <MapPinned className="h-4 w-4" aria-hidden />
              </div>
              <span className="text-foreground text-base font-semibold tracking-tight">
                Best City Spots
              </span>
            </div>

            <p className="text-muted mt-4 max-w-sm text-sm leading-relaxed">
              A city research tool with clear search, live urban signals, and AI-assisted briefings
              to help you decide where to go next.
            </p>
          </div>

          <div>
            <h3 className="text-muted text-xs font-semibold tracking-wider uppercase">Explore</h3>
            <nav className="mt-3" aria-label="Footer explore navigation">
              <ul className="space-y-2">
                {exploreLinks.map(({ href, label }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-muted-strong hover:text-foreground text-sm transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div>
            <h3 className="text-muted text-xs font-semibold tracking-wider uppercase">About</h3>
            <nav className="mt-3" aria-label="Footer company navigation">
              <ul className="space-y-2">
                {companyLinks.map(({ href, label }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-muted-strong hover:text-foreground text-sm transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        <div className="border-line text-muted mt-8 flex flex-col gap-1 border-t pt-6 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} Best City Spots</p>
          <p>City intelligence for deliberate travel</p>
        </div>

        <div
          className="md:hidden"
          style={{ height: "var(--mobile-bottom-nav-height)" }}
          aria-hidden
        />
      </div>
    </footer>
  );
}

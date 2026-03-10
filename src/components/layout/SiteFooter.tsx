import Link from "next/link";
import { MapPin, BookOpen, Info, Compass } from "lucide-react";

const exploreLinks = [
  { href: "/", label: "Explore Cities", icon: MapPin },
  { href: "/resources/top-cities", label: "Top 50 Cities Guide", icon: BookOpen },
  { href: "/resources/top-cities#plan", label: "Plan Your Trip", icon: Compass },
] as const;

const companyLinks = [
  { href: "/about", label: "About Us", icon: Info },
  { href: "/about", label: "Data Sources & Methodology" },
] as const;

export default function SiteFooter() {
  return (
    <footer
      className="relative border-t border-line/80 bg-surface/45"
      role="contentinfo"
      aria-label="Site footer"
    >
      <div
        className="container-gutter mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20"
        style={{ paddingBottom: "max(2.5rem, calc(env(safe-area-inset-bottom, 0px) + 2rem))" }}
      >
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.8fr)]">
          <div className="rounded-[2rem] border border-line bg-surface/70 p-6 shadow-lg backdrop-blur-xl md:p-8">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent text-accent-contrast shadow-sm">
                <MapPin className="h-4 w-4" aria-hidden />
              </div>
              <div>
                <span className="block text-base font-semibold tracking-tight text-foreground">Best City Spots</span>
                <span className="block text-[10px] font-medium uppercase tracking-[0.22em] text-muted">Editorial city intelligence</span>
              </div>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-muted">
              Best City Spots is built for travelers who want signal, not noise. We combine public data, live travel context, and AI-assisted summaries into a calmer way to choose where to go next.
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5 text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
              <span className="rounded-full border border-line bg-background/40 px-3 py-2">10,000+ cities</span>
              <span className="rounded-full border border-line bg-background/40 px-3 py-2">Mobile-first guides</span>
              <span className="rounded-full border border-line bg-background/40 px-3 py-2">Transparent sources</span>
            </div>
          </div>

          <div>
            <h3 className="mb-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              Explore
            </h3>
            <nav aria-label="Footer explore navigation">
              <ul className="space-y-3.5">
                {exploreLinks.map(({ href, label, icon: Icon }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="link touch-target inline-flex items-center gap-2.5 text-sm font-medium text-muted transition-colors duration-300 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
                    >
                      <Icon className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div>
            <h3 className="mb-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              Company
            </h3>
            <nav aria-label="Footer company navigation">
              <ul className="space-y-3.5">
                {companyLinks.map(({ href, label }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="link touch-target inline-flex items-center text-sm font-medium text-muted transition-colors duration-300 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-3 border-t border-line pt-8 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-muted">
            &copy; {new Date().getFullYear()} Best City Spots. Built for travelers who value clarity.
          </p>
          <p className="text-xs text-muted">
            Made in Pune &middot; Designed for deliberate trips
          </p>
        </div>
      </div>
    </footer>
  );
}

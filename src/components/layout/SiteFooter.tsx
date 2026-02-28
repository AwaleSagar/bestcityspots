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
      className="relative border-t border-foreground/[0.05] bg-foreground/[0.015]"
      role="contentinfo"
      aria-label="Site footer"
    >
      <div
        className="container-gutter mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20"
        style={{ paddingBottom: "max(2.5rem, calc(env(safe-area-inset-bottom, 0px) + 2rem))" }}
      >
        <div className="grid gap-12 md:grid-cols-3">
          {/* Brand */}
          <div>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500/25 to-amber-500/10">
                <MapPin className="h-4 w-4 text-orange-400" aria-hidden />
              </div>
              <span className="text-sm font-bold tracking-tight text-foreground/90">Best City Spots</span>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-foreground/35">
              Curated city experiences for modern explorers. Powered by verified data and AI-assisted insights.
            </p>
          </div>

          {/* Explore */}
          <div>
            <h3 className="mb-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground/25">
              Explore
            </h3>
            <nav aria-label="Footer explore navigation">
              <ul className="space-y-3.5">
                {exploreLinks.map(({ href, label, icon: Icon }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="link touch-target inline-flex items-center gap-2.5 text-sm font-medium text-foreground/45 transition-colors duration-300 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50"
                    >
                      <Icon className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Company */}
          <div>
            <h3 className="mb-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground/25">
              Company
            </h3>
            <nav aria-label="Footer company navigation">
              <ul className="space-y-3.5">
                {companyLinks.map(({ href, label }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="link touch-target inline-flex items-center text-sm font-medium text-foreground/45 transition-colors duration-300 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-3 border-t border-foreground/[0.05] pt-8 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-foreground/25">
            &copy; {new Date().getFullYear()} Best City Spots. Built for travelers who value clarity.
          </p>
          <p className="text-xs text-foreground/25">
            Made with ❤️ in Pune &middot; Sagar Awale
          </p>
        </div>
      </div>
    </footer>
  );
}

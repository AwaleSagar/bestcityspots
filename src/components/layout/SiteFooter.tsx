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
      className="border-t border-foreground/[0.04] bg-foreground/[0.015]"
      role="contentinfo"
      aria-label="Site footer"
    >
      <div
        className="container-gutter mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16"
        style={{ paddingBottom: "max(2.5rem, calc(env(safe-area-inset-bottom, 0px) + 2rem))" }}
      >
        <div className="grid gap-10 sm:grid-cols-3">
          {/* Brand */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10">
                <MapPin className="h-3.5 w-3.5 text-purple-400" aria-hidden />
              </div>
              <span className="text-sm font-bold text-foreground/90">Best City Spots</span>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-foreground/40">
              Curated city experiences for modern explorers. Powered by verified data and AI-assisted insights.
            </p>
          </div>

          {/* Explore */}
          <div>
            <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-foreground/30">
              Explore
            </h3>
            <nav aria-label="Footer explore navigation">
              <ul className="space-y-3">
                {exploreLinks.map(({ href, label, icon: Icon }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="touch-target inline-flex items-center gap-2 text-sm font-medium text-foreground/55 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
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
            <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-foreground/30">
              Company
            </h3>
            <nav aria-label="Footer company navigation">
              <ul className="space-y-3">
                {companyLinks.map(({ href, label }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="touch-target inline-flex items-center text-sm font-medium text-foreground/55 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-foreground/[0.04] pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-foreground/30">
            © {new Date().getFullYear()} Best City Spots. Built for travelers who value clarity.
          </p>
          <p className="text-xs text-foreground/30">
            Made with ❤️ in Pune · Sagar Awale
          </p>
        </div>
      </div>
    </footer>
  );
}

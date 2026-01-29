import Link from "next/link";
import { MapPin, BookOpen, Info } from "lucide-react";

const internalLinks = [
  { href: "/", label: "Explore Cities", icon: MapPin },
  { href: "/resources/top-cities", label: "Free Guide: Top Cities", icon: BookOpen },
  { href: "/about", label: "About", icon: Info },
] as const;

export default function SiteFooter() {
  return (
    <footer
      className="border-t border-foreground/5 bg-foreground/[0.02]"
      role="contentinfo"
      aria-label="Site footer"
    >
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="sr-only">Site navigation</h2>
            <nav aria-label="Footer navigation">
              <ul className="flex flex-wrap gap-x-8 gap-y-4">
                {internalLinks.map(({ href, label, icon: Icon }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="inline-flex items-center gap-2 text-sm font-medium text-foreground/70 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          <div className="text-sm text-foreground/50">
            <p className="font-medium text-foreground/70">Best City Spots</p>
            <p className="mt-1 max-w-xs">
              Urban intelligence and trusted city data. No paywalls, no dark patterns.
            </p>
          </div>
        </div>
        <div className="mt-10 flex flex-col gap-4 border-t border-foreground/5 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-foreground/40">
            © {new Date().getFullYear()} Best City Spots. Built for travelers who value clarity.
          </p>
          <Link
            href="/about"
            className="text-xs font-medium text-foreground/50 underline underline-offset-2 hover:text-foreground/70"
          >
            How we work &amp; our data sources
          </Link>
        </div>
      </div>
    </footer>
  );
}

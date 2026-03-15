import Link from "next/link";
import { BookOpen, Compass, Info, MapPinned } from "lucide-react";

const exploreLinks = [
  { href: "/", label: "Explore cities" },
  { href: "/resources/top-cities", label: "Top cities" },
] as const;

const companyLinks = [
  { href: "/about", label: "About the project" },
  { href: "/about#source-stack", label: "Data sources" },
] as const;

export default function SiteFooter() {
  return (
    <footer className="border-t border-line/70 bg-background/65" role="contentinfo" aria-label="Site footer">
      <div
        className="container-gutter mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14"
        style={{ paddingBottom: "max(2.5rem, calc(env(safe-area-inset-bottom, 0px) + 2rem))" }}
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,0.8fr)]">
          <div className="atlas-frame rounded-[1.4rem] p-5 sm:rounded-[1.8rem] md:rounded-[2rem] md:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-accent text-accent-contrast">
                <MapPinned className="h-4 w-4" aria-hidden />
              </div>
              <div>
                <span className="block text-xl leading-none text-foreground">Best City Spots</span>
                <span className="mt-1 block font-mono text-[0.62rem] uppercase tracking-[0.28em] text-muted">
                  Atlas for deliberate travel
                </span>
              </div>
            </div>

            <p className="mt-5 max-w-xl text-sm leading-7 text-muted">
              A city research tool built to reduce noise: clear search, live urban signals, AI-assisted
              briefings, and city pages that help you decide where to go next without fighting the interface.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              {["10,000+ cities", "AI clearly labeled", "Mobile-first planning"].map((item) => (
                <span key={item} className="atlas-chip">
                  <Compass className="h-3.5 w-3.5 text-accent" aria-hidden />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="atlas-panel rounded-[1.4rem] p-5 sm:rounded-[1.8rem] md:rounded-[2rem] md:p-6">
            <div className="labelled-rule">Explore</div>
            <nav className="mt-5" aria-label="Footer explore navigation">
              <ul className="space-y-3">
                {exploreLinks.map(({ href, label }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="inline-flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.14em] text-muted-strong transition-colors duration-300 hover:text-foreground"
                    >
                      <BookOpen className="h-3.5 w-3.5 text-[color:var(--color-brand-accent)]" aria-hidden />
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div className="atlas-panel rounded-[1.4rem] p-5 sm:rounded-[1.8rem] md:rounded-[2rem] md:p-6">
            <div className="labelled-rule">About</div>
            <nav className="mt-5" aria-label="Footer company navigation">
              <ul className="space-y-3">
                {companyLinks.map(({ href, label }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="inline-flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.14em] text-muted-strong transition-colors duration-300 hover:text-foreground"
                    >
                      <Info className="h-3.5 w-3.5 text-[color:var(--color-brand-secondary)]" aria-hidden />
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-line pt-5 text-xs uppercase tracking-[0.14em] text-muted md:flex-row md:items-center md:justify-between">
          <p>&copy; {new Date().getFullYear()} Best City Spots</p>
          <p>Designed as an editorial atlas for city-first trips</p>
        </div>

        {/* Clearance for mobile bottom nav */}
        <div className="h-4 md:hidden" aria-hidden />
      </div>
    </footer>
  );
}

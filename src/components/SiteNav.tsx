"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { Menu, X, MapPin, BookOpen, Info } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

type NavLink = {
  href: string;
  label: string;
  short: string;
  icon: typeof MapPin;
  cta?: boolean;
};

const navLinks: NavLink[] = [
  { href: "/", label: "Explore Cities", short: "Explore", icon: MapPin },
  { href: "/resources/top-cities", label: "Free Guide: Top Cities", short: "Guide", icon: BookOpen, cta: true },
  { href: "/about", label: "About Best City Spots", short: "About", icon: Info },
];

export default function SiteNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const toggleMobile = useCallback(() => setMobileOpen((prev) => !prev), []);

  // Close on escape and lock body scroll when menu open
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMobile();
    };
    if (mobileOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [mobileOpen, closeMobile]);

  return (
    <>
      <header className="sticky top-0 z-[200] w-full bg-background/80 backdrop-blur-xl">
        <div className="container-gutter mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="group flex items-center gap-3 rounded-full bg-foreground/[0.04] px-4 py-2 text-[10px] font-black tracking-[0.3em] text-foreground/80 uppercase transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Best City Spots home"
          >
            <MapPin className="h-4 w-4 text-purple-400/80" aria-hidden />
            Best City Spots
          </Link>

          {/* Desktop: clean text nav (md and up) */}
          <nav className="hidden items-center gap-6 md:flex" aria-label="Main navigation">
            {navLinks.map(({ href, short, cta }) => (
              <Link
                key={href}
                href={href}
                className={
                  cta
                    ? "rounded-full bg-purple-500/10 px-5 py-2 text-[11px] font-bold tracking-wide text-purple-400 transition hover:bg-purple-500/20 active:scale-95"
                    : "text-[11px] font-bold tracking-wide text-foreground/60 transition hover:text-foreground"
                }
              >
                {short}
              </Link>
            ))}
            <div className="ml-2 pl-4 border-l border-foreground/10">
              <ThemeToggle />
            </div>
          </nav>

          {/* Mobile: hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            <span className="text-[10px] font-black tracking-[0.3em] text-foreground/40 uppercase">
              Menu
            </span>
            <button
              type="button"
              onClick={toggleMobile}
              className="touch-target flex h-[var(--touch-target-min)] w-[var(--touch-target-min)] items-center justify-center rounded-full border border-foreground/10 bg-foreground/[0.04] text-foreground/80 transition hover:border-foreground/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:ring-offset-2"
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Mobile overlay + sheet */}
      <div
        id="mobile-nav"
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
        className="fixed inset-0 z-[190] md:hidden"
        hidden={!mobileOpen}
      >
        <div
          className="absolute inset-0 bg-foreground/20 backdrop-blur-sm transition-opacity"
          aria-hidden
          onClick={closeMobile}
        />
        <div
          className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col border-l border-foreground/10 bg-background/95 shadow-2xl backdrop-blur-xl"
          style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
        >
          <div className="flex flex-1 flex-col gap-1 p-4">
            <span className="mb-4 block text-[10px] font-black uppercase tracking-[0.3em] text-foreground/40">
              Menu
            </span>
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={closeMobile}
                className="touch-target flex min-h-[var(--touch-target-min)] items-center gap-3 rounded-xl bg-foreground/[0.03] px-5 py-3 text-sm font-bold text-foreground/80 transition hover:bg-foreground/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:ring-offset-2"
              >
                <Icon className="h-5 w-5 text-purple-400/80" aria-hidden />
                {label}
              </Link>
            ))}
          </div>
          <div
            className="border-t border-foreground/5 p-4"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
          >
            <p className="text-xs text-foreground/50">
              Best City Spots — Urban intelligence, no paywalls.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

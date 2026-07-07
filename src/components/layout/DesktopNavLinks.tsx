"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActiveNavPath, primaryNavItems } from "@/config/nav";
import { getJsonStorageItem } from "@/lib/storage";

const RECENT_KEY = "atlas_recent_searches";

export default function DesktopNavLinks() {
  const pathname = usePathname();
  // B5: passport link appears only once the visitor has explored cities
  // (localStorage gate). null = not yet hydrated; true/false = has recents.
  // Deferred via queueMicrotask per the React Compiler convention.
  const [hasPassport, setHasPassport] = useState<boolean | null>(null);

  useEffect(() => {
    const recents = getJsonStorageItem<unknown[]>(RECENT_KEY, []);
    queueMicrotask(() => setHasPassport(Array.isArray(recents) && recents.length > 0));
  }, []);

  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
      {primaryNavItems.map(({ href, label }) => {
        const isActive = isActiveNavPath(pathname, href);

        return (
          <Link
            key={href}
            href={href}
            className={`nav-pill flex min-h-11 items-center rounded-lg px-3 text-sm font-medium transition-colors ${
              isActive
                ? "bg-accent-soft text-accent-strong"
                : "text-muted-strong hover:text-foreground"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            {label}
          </Link>
        );
      })}
      {hasPassport === true ? (
        <Link
          href="/passport"
          className={`nav-pill flex min-h-11 items-center rounded-lg px-3 text-sm font-medium transition-colors ${
            pathname === "/passport"
              ? "bg-accent-soft text-accent-strong"
              : "text-muted-strong hover:text-foreground"
          }`}
          aria-current={pathname === "/passport" ? "page" : undefined}
        >
          Passport
        </Link>
      ) : null}
    </nav>
  );
}

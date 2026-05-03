"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActiveNavPath, primaryNavItems } from "@/config/nav";

export default function DesktopNavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1" aria-label="Main navigation">
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
    </nav>
  );
}
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, BookOpen, Info } from "lucide-react";
import { isActiveNavPath, primaryNavItems, type PrimaryNavItem } from "@/config/nav";

function getNavIcon(href: PrimaryNavItem["href"]) {
  switch (href) {
    case "/resources/top-cities":
      return BookOpen;
    case "/about":
      return Info;
    default:
      return MapPin;
  }
}

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="border-line bg-background/95 fixed right-0 bottom-0 left-0 z-[200] border-t backdrop-blur-md md:hidden"
      aria-label="Mobile navigation"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0)" }}
    >
      <ul className="flex items-stretch justify-around" role="list">
        {primaryNavItems.map(({ href, label }) => {
          const Icon = getNavIcon(href);
          const isActive = isActiveNavPath(pathname, href);

          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 py-2 text-center transition-colors ${
                  isActive ? "text-accent-strong" : "text-muted"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon
                  className={`h-5 w-5 transition-transform duration-200 motion-reduce:transform-none ${
                    isActive ? "-translate-y-0.5 scale-110" : ""
                  }`}
                  aria-hidden
                />
                <span className="text-xs font-medium">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

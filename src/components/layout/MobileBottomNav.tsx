"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, BookOpen, Info } from "lucide-react";

const navItems = [
  { href: "/", label: "Explore", icon: MapPin },
  { href: "/resources/top-cities", label: "Top Cities", icon: BookOpen },
  { href: "/about", label: "About", icon: Info },
] as const;

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[200] border-t border-foreground/[0.06] bg-background/85 backdrop-blur-2xl backdrop-saturate-150 md:hidden"
      aria-label="Mobile navigation"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0)" }}
    >
      <ul className="flex items-stretch justify-around" role="list">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/"
              ? pathname === "/"
              : pathname === href || pathname.startsWith(href + "/");

          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`nav-link flex flex-col items-center justify-center gap-1.5 px-2 py-3.5 min-h-[var(--mobile-bottom-nav-height)] text-center transition-colors duration-300 ${
                  isActive
                    ? "text-purple-400"
                    : "text-foreground/40 active:text-foreground/70"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="h-5 w-5" aria-hidden />
                <span className="text-[10px] font-semibold tracking-wide">
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

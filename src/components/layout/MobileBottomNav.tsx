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
      className="fixed bottom-0 left-0 right-0 z-[200] border-t border-line bg-background/95 backdrop-blur-md md:hidden"
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
                className={`flex flex-col items-center justify-center gap-0.5 py-2 text-center transition-colors ${isActive
                  ? "text-accent-strong"
                  : "text-muted"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="h-5 w-5" aria-hidden />
                <span className="text-[10px] font-medium">
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

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
      className="fixed bottom-3 left-1/2 z-[200] w-[calc(100%-1.5rem)] max-w-sm -translate-x-1/2 rounded-[1.2rem] border border-line bg-surface-strong/92 shadow-3xl backdrop-blur-2xl backdrop-saturate-150 sm:rounded-[1.4rem] md:hidden"
      aria-label="Mobile navigation"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0)" }}
    >
      <ul className="flex items-stretch justify-around px-2 py-2" role="list">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/"
              ? pathname === "/"
              : pathname === href || pathname.startsWith(href + "/");

          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-[1rem] px-2 py-2 text-center transition-all duration-300 ${isActive
                  ? "bg-accent-soft text-accent-strong shadow-sm"
                  : "text-muted active:text-foreground"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="h-5 w-5" aria-hidden />
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">
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

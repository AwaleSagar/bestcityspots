"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/atlas";
import { navItems, isActive } from "./navConfig";

export default function BottomBar() {
  const pathname = usePathname() ?? "/";
  return (
    <nav
      aria-label="Primary mobile"
      className="fixed inset-x-0 bottom-0 z-[200] border-t border-[color:var(--color-line)] bg-[color:var(--color-background)]/95 backdrop-blur-md md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0)" }}
    >
      <ul className="flex items-stretch" role="list">
        {navItems.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex min-h-[var(--mobile-bottom-nav-height)] flex-col items-center justify-center gap-0.5 py-2 text-center transition-colors",
                  active
                    ? "text-[color:var(--color-foreground)]"
                    : "text-[color:var(--color-muted)]",
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
                <span className="text-[0.68rem] font-medium">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

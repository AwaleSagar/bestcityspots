"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui/cn";
import { isActivePath, PRIMARY_NAV } from "./nav-config";

export function HeaderNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="hidden lg:block">
      <ul className="flex items-center gap-1">
        {PRIMARY_NAV.map((item) => {
          const active = isActivePath(pathname, item);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "ease-standard relative inline-flex h-11 items-center rounded-md px-3 text-sm font-medium transition-colors duration-150",
                  active ? "text-ink" : "text-ink-muted hover:bg-sunken hover:text-ink"
                )}
              >
                {item.label}
                {active ? (
                  <span aria-hidden className="bg-accent absolute inset-x-3 -bottom-[10px] h-0.5" />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

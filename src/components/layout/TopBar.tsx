"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Container, Row, cx } from "@/components/atlas";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { navItems, isActive } from "./navConfig";

export default function TopBar() {
  const pathname = usePathname() ?? "/";
  return (
    <header
      className="sticky top-0 z-[200] w-full border-b border-[color:var(--color-line)] bg-[color:var(--color-background)]/92 backdrop-blur-md"
      role="banner"
    >
      <Container size="wide" className="h-14 sm:h-16">
        <Row justify="between" className="h-full">
          <Link
            href="/"
            className="group inline-flex min-w-0 items-center gap-2"
            aria-label="Best City Spots — home"
          >
            <span
              aria-hidden="true"
              className="inline-block h-2 w-2 rounded-full bg-[color:var(--color-accent)]"
            />
            <span className="truncate font-[family-name:var(--font-display)] text-lg font-medium tracking-[-0.01em] text-[color:var(--color-foreground)] sm:text-xl">
              Best City Spots
            </span>
          </Link>

          <Row gap={1} as="nav" aria-label="Primary">
            <ul className="hidden items-center gap-1 md:flex" role="list">
              {navItems.map((item) => {
                const active = isActive(pathname, item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cx(
                        "inline-flex min-h-[var(--touch-target-min)] items-center rounded-[var(--radius-md)] px-3 text-sm font-medium transition-colors duration-[var(--duration-base)] ease-[var(--ease-out)]",
                        active
                          ? "text-[color:var(--color-foreground)]"
                          : "text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <ThemeToggle />
          </Row>
        </Row>
      </Container>
    </header>
  );
}

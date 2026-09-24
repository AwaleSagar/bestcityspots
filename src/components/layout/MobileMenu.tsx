"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, Menu, X } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/components/ui/cn";
import { FOOTER_NAV, isActivePath, PRIMARY_NAV } from "./nav-config";
import { ThemeSwitcher } from "./ThemeControls";

/** Below `lg`: a right-hand sheet with the primary nav, Saved and theme. */
export function MobileMenu() {
  const titleId = useId();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(pathname);

  if (open && openedAt !== pathname) {
    setOpen(false);
    setOpenedAt(pathname);
  }

  const aboutLinks = FOOTER_NAV.find((group) => group.title === "About")?.items ?? [];

  return (
    <>
      <IconButton
        label="Open menu"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setOpenedAt(pathname);
          setOpen(true);
        }}
        className="lg:hidden"
      >
        <Menu aria-hidden />
      </IconButton>
      <Dialog open={open} onClose={() => setOpen(false)} labelledBy={titleId} variant="sheet">
        <div className="flex h-full flex-col">
          <div className="border-rule flex h-16 items-center justify-between border-b px-4">
            <h2 id={titleId} className="font-sans text-base font-semibold">
              Menu
            </h2>
            <IconButton label="Close menu" onClick={() => setOpen(false)}>
              <X aria-hidden />
            </IconButton>
          </div>
          <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-2 py-4">
            <ul>
              {PRIMARY_NAV.map((item) => {
                const active = isActivePath(pathname, item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "font-display flex min-h-12 items-center rounded-md px-3 text-2xl",
                        active ? "text-accent" : "hover:bg-sunken"
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
              <li className="border-rule mt-2 border-t pt-2">
                <Link
                  href="/saved"
                  aria-current={pathname === "/saved" ? "page" : undefined}
                  className="hover:bg-sunken flex min-h-12 items-center gap-2 rounded-md px-3 font-medium"
                >
                  <Bookmark aria-hidden className="size-4" />
                  Saved places
                </Link>
              </li>
            </ul>
            <ul className="border-rule mt-4 border-t pt-4">
              {aboutLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-ink-muted hover:bg-sunken hover:text-ink flex min-h-11 items-center rounded-md px-3 text-sm"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="border-rule flex items-center justify-between border-t px-4 py-4">
            <span className="text-ink-muted text-sm">Theme</span>
            <ThemeSwitcher />
          </div>
        </div>
      </Dialog>
    </>
  );
}

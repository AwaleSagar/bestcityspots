import { Compass, BookOpen, Info } from "lucide-react";
import type { ComponentType } from "react";

export interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  match?: "exact" | "prefix";
}

/** Single source of truth for primary site navigation. */
export const navItems: NavItem[] = [
  { href: "/", label: "Explore", icon: Compass, match: "exact" },
  { href: "/resources/top-cities", label: "Top Cities", icon: BookOpen, match: "prefix" },
  { href: "/about", label: "About", icon: Info, match: "prefix" },
];

export function isActive(pathname: string, item: NavItem) {
  if (item.match === "exact") return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

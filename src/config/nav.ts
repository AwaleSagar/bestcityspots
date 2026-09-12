export const primaryNavItems = [
  { href: "/", label: "Explore" },
  { href: "/resources/top-cities", label: "Top Cities" },
  { href: "/about", label: "About" },
] as const;

export type PrimaryNavItem = (typeof primaryNavItems)[number];

export function isActiveNavPath(pathname: string, href: PrimaryNavItem["href"]) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

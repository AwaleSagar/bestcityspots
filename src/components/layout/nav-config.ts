export interface NavItem {
  href: string;
  label: string;
  /** Extra path prefixes that should mark this item as current. */
  match?: readonly string[];
}

export const PRIMARY_NAV: readonly NavItem[] = [
  { href: "/cities", label: "Cities" },
  { href: "/countries", label: "Countries" },
  {
    href: "/guides",
    label: "Guides",
    match: ["/best-cities-", "/resources/top-cities"],
  },
  { href: "/compare", label: "Compare" },
];

export function isActivePath(pathname: string, item: NavItem): boolean {
  if (pathname === item.href || pathname.startsWith(`${item.href}/`)) return true;
  return (item.match ?? []).some((prefix) => pathname.startsWith(prefix));
}

export const FOOTER_NAV: ReadonlyArray<{ title: string; items: readonly NavItem[] }> = [
  {
    title: "Explore",
    items: [
      { href: "/cities", label: "All cities" },
      { href: "/countries", label: "Countries" },
      { href: "/resources/top-cities", label: "The Top 250" },
      { href: "/compare", label: "Compare cities" },
      { href: "/saved", label: "Saved places" },
    ],
  },
  {
    title: "Guides",
    items: [
      { href: "/best-cities-by-air-quality", label: "Cleanest air" },
      { href: "/best-cities-for-digital-nomads", label: "For digital nomads" },
      { href: "/guides#by-month", label: "Best cities by month" },
      { href: "/guides", label: "All guides" },
    ],
  },
  {
    title: "About",
    items: [
      { href: "/about", label: "About" },
      { href: "/methodology", label: "Methodology" },
      { href: "/about#source-stack", label: "Data sources" },
      { href: "/press", label: "Press" },
      { href: "/accessibility", label: "Accessibility" },
    ],
  },
];

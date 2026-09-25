import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { FOOTER_NAV } from "./nav-config";
import { Wordmark } from "./Logo";
import { ThemeSwitcher } from "./ThemeControls";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer data-print-hide className="border-rule bg-sunken mt-auto border-t">
      <Container className="grid gap-10 py-12 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] md:gap-8">
        <div className="max-w-sm">
          <Link href="/" aria-label="Best City Spots — home" className="inline-block rounded-md">
            <Wordmark />
          </Link>
          <p className="text-ink-muted mt-4 text-sm">
            City guides that show their sources: live conditions, clearly labelled AI briefings and
            places ranked by what travelers actually rate.
          </p>
        </div>
        {FOOTER_NAV.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <h2 className="font-sans text-sm font-semibold">{group.title}</h2>
            <ul className="mt-3 space-y-1">
              {group.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-ink-muted hover:text-ink inline-flex min-h-9 items-center text-sm hover:underline hover:underline-offset-4"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </Container>
      <Container className="border-rule text-ink-muted flex flex-col gap-4 border-t py-6 text-xs sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {year} Best City Spots · Weather: OpenWeather &amp; Open-Meteo · Places: Google · Maps:
          © OpenStreetMap contributors · Cities: GeoNames (CC BY 4.0) · Country data: World Bank (CC
          BY 4.0) · Briefings: Google Gemini
        </p>
        <ThemeSwitcher />
      </Container>
    </footer>
  );
}

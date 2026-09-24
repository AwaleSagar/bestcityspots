import type { Metadata } from "next";
import Link from "next/link";
import { cityHref, getTopCities, type City } from "@/lib/cities";
import { buttonClasses } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { SearchField } from "@/components/search/SearchField";

// SEO Phase 1 (T9, audit 1.4): branded 404 with a popular-cities recovery
// surface, so internal links recover equity instead of dead-ending.
export const metadata: Metadata = {
  title: "Page Not Found",
  description:
    "We couldn't find the page you were looking for. Browse popular city travel guides or return to the homepage.",
  robots: { index: false, follow: true },
};

const RECOVERY_CITY_COUNT = 12;

export default async function NotFound() {
  let popular: City[] = [];
  try {
    popular = await getTopCities(RECOVERY_CITY_COUNT);
  } catch {
    popular = [];
  }

  return (
    <main id="main-content">
      <Container className="py-16 pb-24 sm:py-24">
        <p className="font-display text-ink-subtle text-7xl leading-none tabular-nums">404</p>
        <h1 className="text-h1 mt-6 max-w-2xl">This page is off the map.</h1>
        <p className="text-lede text-ink-muted mt-4 max-w-xl">
          The link may be old or mistyped. Search for a city, or head back to familiar ground.
        </p>
        <div className="mt-8 max-w-xl">
          <SearchField label="Search for a city" />
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/" className={buttonClasses({ variant: "primary" })}>
            Go to the home page
          </Link>
          <Link href="/cities" className={buttonClasses()}>
            Browse all cities
          </Link>
        </div>
        {popular.length > 0 ? (
          <nav aria-labelledby="popular-title" className="border-rule mt-16 border-t pt-8">
            <h2 id="popular-title" className="font-sans text-base font-semibold">
              Popular guides
            </h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {popular.map((city) => (
                <li key={city.id}>
                  <Link
                    href={cityHref(city)}
                    className="border-rule bg-surface hover:border-rule-strong hover:text-accent inline-flex h-9 items-center rounded-full border px-3.5 text-sm pointer-coarse:h-11"
                  >
                    {city.city}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </Container>
    </main>
  );
}

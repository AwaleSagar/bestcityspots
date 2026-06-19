import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Compass, MapPinned } from "lucide-react";
import { type City, getTopCities, cityHref } from "@/lib/cities";

// SEO Phase 1 (T9, audit 1.4): branded 404 page with a popular-cities
// recovery surface. Internal links from this page recover link equity that
// would otherwise leak out via the default Next.js error chrome.
export const metadata: Metadata = {
  title: "Page Not Found",
  description:
    "We couldn't find the page you were looking for. Browse popular city travel guides or return to the homepage.",
  robots: { index: false, follow: true },
};

// Render at most this many recovery links so the 404 stays fast and focused.
const RECOVERY_CITY_COUNT = 12;

export default async function NotFound() {
  let popularCities: City[] = [];
  try {
    popularCities = await getTopCities(RECOVERY_CITY_COUNT);
  } catch {
    // Database unavailable — render the static recovery layout without
    // a per-city list rather than crashing the 404 itself.
    popularCities = [];
  }

  return (
    <main id="main-content" className="text-foreground min-h-screen bg-transparent font-sans">
      <div
        className="container-gutter mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20"
        style={{ paddingTop: "max(4rem, calc(env(safe-area-inset-top, 0px) + 5rem))" }}
      >
        <Image
          src="/illustrations/404-off-the-map.webp"
          alt="A map pin drifting off the edge of a folded paper map"
          width={720}
          height={540}
          priority
          className="mb-8 w-full max-w-sm"
        />

        <span className="eyebrow">
          <Compass className="text-accent h-3.5 w-3.5" aria-hidden />
          404 / Off the map
        </span>
        <h1 className="page-title text-foreground mt-6 max-w-2xl">
          We couldn&rsquo;t find that page.
        </h1>
        <p className="lede mt-5 max-w-xl">
          The link may have moved or the city slug changed. Try returning to the explorer, or jump
          straight into one of the most-loved guides below.
        </p>

        <nav aria-label="Recover navigation" className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/"
            className="border-line bg-background/65 text-muted-strong hover:text-foreground inline-flex items-center gap-3 rounded-full border px-4 py-3 text-xs font-bold tracking-[0.18em] uppercase transition-colors duration-300"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Return to explorer
          </Link>
          <Link
            href="/resources/top-cities"
            className="border-line bg-background/65 text-muted-strong hover:text-foreground inline-flex items-center gap-3 rounded-full border px-4 py-3 text-xs font-bold tracking-[0.18em] uppercase transition-colors duration-300"
          >
            <MapPinned className="h-4 w-4" aria-hidden />
            Browse top cities
          </Link>
        </nav>

        {popularCities.length > 0 ? (
          <section aria-labelledby="popular-cities" className="mt-12">
            <h2
              id="popular-cities"
              className="text-muted text-xs font-semibold tracking-[0.22em] uppercase"
            >
              Popular destinations
            </h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {popularCities.map((city) => (
                <li key={city.id}>
                  <Link
                    href={cityHref(city)}
                    className="border-line bg-surface/72 text-muted hover:border-accent/18 hover:text-foreground inline-block rounded-full border px-4 py-2 text-sm font-medium transition-colors"
                  >
                    {city.city}
                    <span className="text-muted/70"> · {city.country}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </main>
  );
}

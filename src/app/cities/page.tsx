import { serializeJsonLd } from "@/lib/json-ld";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import CityCard from "@/components/seo/CityCard";
import { getTopCities } from "@/lib/cities";
import { getCountrySummaries } from "@/lib/countries";
import { publicEnv } from "@/lib/env";

const siteUrl = (publicEnv().NEXT_PUBLIC_SITE_URL ?? "https://bestcityspots.com").replace(
  /\/$/,
  ""
);

// SEO Phase 2.3 (audit 7.2): the `/cities` hub becomes the true crawl-
// friendly index. The home page stays brand-led; this surface ranks for
// generic "cities" head-term queries and forwards link equity.
export const metadata: Metadata = {
  title: "All Cities: Browse 200+ Travel Guides with Live Weather",
  description:
    "Browse all cities in Best City Spots. Find travel guides with live weather, neighborhood texture, and AI-assisted briefings — searchable by country.",
  alternates: { canonical: "/cities" },
  openGraph: {
    title: "All Cities | Best City Spots",
    description: "Browse all cities in Best City Spots — searchable by country.",
    url: "/cities",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "All Cities | Best City Spots",
    description: "Browse all cities in Best City Spots — searchable by country.",
  },
};

export const revalidate = 86400;

const CITIES_INDEX_TOP_LIMIT = 200;

export default async function CitiesIndexPage() {
  const [cities, countries] = await Promise.all([
    getTopCities(CITIES_INDEX_TOP_LIMIT),
    getCountrySummaries(),
  ]);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
      { "@type": "ListItem", position: 2, name: "Cities", item: `${siteUrl}/cities` },
    ],
  };

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "All cities",
    url: `${siteUrl}/cities`,
    isPartOf: { "@id": `${siteUrl}/#website` },
    numberOfItems: cities.length,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(collectionJsonLd) }}
      />
      <main id="main-content" className="text-foreground min-h-screen bg-transparent">
        <div
          className="container-gutter mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20"
          style={{ paddingTop: "max(4rem, calc(env(safe-area-inset-top, 0px) + 5rem))" }}
        >
          <Breadcrumbs items={[{ label: "Cities" }]} />

          <span className="eyebrow">
            <Compass className="text-accent h-3.5 w-3.5" aria-hidden />
            Browse all
          </span>
          <h1 className="page-title text-foreground mt-6 max-w-3xl">
            All cities &mdash; the full Best City Spots index.
          </h1>
          <p className="lede mt-5 max-w-2xl">
            Browse the most-visited cities indexed by Best City Spots, or jump straight to a country
            to see its full city list.
          </p>

          <section aria-labelledby="facets-heading" className="mt-10">
            <h2
              id="facets-heading"
              className="text-muted text-xs font-semibold tracking-[0.22em] uppercase"
            >
              Browse by country
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {countries.slice(0, 36).map((country) => (
                <Link
                  key={country.slug}
                  href={`/countries/${country.slug}`}
                  className="border-line bg-surface/65 text-muted-strong hover:text-foreground rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
                >
                  {country.country}{" "}
                  <span className="text-muted ml-1 text-xs">{country.cityCount}</span>
                </Link>
              ))}
              <Link
                href="/countries"
                className="border-accent/30 bg-accent-soft text-accent rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors"
              >
                All countries →
              </Link>
            </div>
          </section>

          <section aria-labelledby="top-cities-heading" className="mt-12">
            <h2
              id="top-cities-heading"
              className="text-muted text-xs font-semibold tracking-[0.22em] uppercase"
            >
              Top {cities.length} cities by population
            </h2>
            <ul className="card-grid mt-4">
              {cities.map((city) => (
                <li key={city.id}>
                  <CityCard city={city} />
                </li>
              ))}
            </ul>
          </section>

          <nav className="mt-12 flex flex-wrap gap-3" aria-label="Cities navigation">
            <Link
              href="/"
              className="border-line bg-background/65 text-muted-strong hover:text-foreground inline-flex items-center gap-3 rounded-full border px-4 py-3 text-xs font-bold tracking-[0.18em] uppercase transition-colors duration-300"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back to home
            </Link>
          </nav>
        </div>
      </main>
    </>
  );
}

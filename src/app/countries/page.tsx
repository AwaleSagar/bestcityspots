import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Globe2 } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { getCountrySummaries } from "@/lib/countries";
import { publicEnv } from "@/lib/env";

const siteUrl = (
  publicEnv().NEXT_PUBLIC_SITE_URL ?? "https://bestcityspots.com"
).replace(/\/$/, "");

// SEO Phase 2.3 (audit 7.2): the `/countries` hub is the parent index for
// the country pages. It exists primarily as a crawl-friendly entry point
// — every country listed here links to its own programmatic hub page.
export const metadata: Metadata = {
  title: "City Guides by Country: Browse Travel Destinations Worldwide",
  description:
    "Browse Best City Spots travel guides organized by country. Live weather, neighborhoods, and AI-assisted briefings for cities across every continent.",
  alternates: { canonical: "/countries" },
  openGraph: {
    title: "City Guides by Country | Best City Spots",
    description:
      "Browse Best City Spots travel guides organized by country.",
    url: "/countries",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "City Guides by Country | Best City Spots",
    description: "Browse Best City Spots travel guides organized by country.",
  },
};

// Re-render daily so newly-added countries surface without a full deploy.
export const revalidate = 86400;

export default async function CountriesIndexPage() {
  const countries = await getCountrySummaries();

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
      { "@type": "ListItem", position: 2, name: "Countries", item: `${siteUrl}/countries` },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <main id="main-content" className="text-foreground min-h-screen bg-transparent">
        <div
          className="container-gutter mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20"
          style={{ paddingTop: "max(4rem, calc(env(safe-area-inset-top, 0px) + 5rem))" }}
        >
          <Breadcrumbs items={[{ label: "Countries" }]} />

          <span className="eyebrow">
            <Globe2 className="text-accent h-3.5 w-3.5" aria-hidden />
            Browse by country
          </span>
          <h1 className="page-title text-foreground mt-6 max-w-3xl">
            City guides by country.
          </h1>
          <p className="lede mt-5 max-w-2xl">
            {countries.length} countries indexed. Each country page lists its most-visited
            cities with population, region context, and a direct link into the full city
            guide.
          </p>

          <ul className="mt-10 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {countries.map((country) => (
              <li key={country.slug}>
                <Link
                  href={`/countries/${country.slug}`}
                  className="border-line bg-surface/65 hover:bg-surface text-foreground flex items-center justify-between gap-4 rounded-[1rem] border px-4 py-3 transition-colors duration-200"
                >
                  <span className="truncate text-sm font-semibold">{country.country}</span>
                  <span className="text-muted text-[11px] font-semibold tracking-[0.18em] uppercase">
                    {country.cityCount} {country.cityCount === 1 ? "city" : "cities"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <nav className="mt-12 flex flex-wrap gap-3" aria-label="Countries navigation">
            <Link
              href="/"
              className="border-line bg-background/65 text-muted-strong hover:text-foreground inline-flex items-center gap-3 rounded-full border px-4 py-3 text-[0.72rem] font-bold tracking-[0.18em] uppercase transition-colors duration-300"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back to home
            </Link>
            <Link
              href="/cities"
              className="border-line bg-background/65 text-muted-strong hover:text-foreground inline-flex items-center gap-3 rounded-full border px-4 py-3 text-[0.72rem] font-bold tracking-[0.18em] uppercase transition-colors duration-300"
            >
              All cities A→Z
            </Link>
          </nav>
        </div>
      </main>
    </>
  );
}

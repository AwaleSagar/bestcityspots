import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Globe2 } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import CityCard from "@/components/seo/CityCard";
import { getCitiesByCountry, getCountryBySlug, getCountrySummaries } from "@/lib/countries";
import { publicEnv } from "@/lib/env";
import { citySlugSchema } from "@/lib/validation";

const siteUrl = (publicEnv().NEXT_PUBLIC_SITE_URL ?? "https://bestcityspots.com").replace(
  /\/$/,
  ""
);

type RouteParams = { slug: string };

// Allow long-tail countries to render via ISR while pre-rendering the head
// of the distribution at build time.
export const dynamicParams = true;
export const revalidate = 86400;

export async function generateStaticParams(): Promise<RouteParams[]> {
  const countries = await getCountrySummaries();
  return countries.slice(0, 60).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const parsed = citySlugSchema.safeParse(slug);
  if (!parsed.success) return { title: "Country not found" };
  const country = await getCountryBySlug(parsed.data);
  if (!country) return { title: "Country not found" };

  const year = new Date().getFullYear();
  const title = `${country.country} Travel Guide: Cities, Weather & AI Insights (${year})`;
  const description = `Browse Best City Spots travel guides for ${country.cityCount} cities in ${country.country}. Live weather, neighborhood texture, and AI-assisted briefings for ${year}.`;

  return {
    title,
    description,
    alternates: { canonical: `/countries/${country.slug}` },
    openGraph: {
      title: `${country.country} Travel Guide | Best City Spots`,
      description,
      url: `/countries/${country.slug}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${country.country} Travel Guide | Best City Spots`,
      description,
    },
  };
}

export default async function CountryPage({ params }: { params: Promise<RouteParams> }) {
  const { slug } = await params;
  const parsed = citySlugSchema.safeParse(slug);
  if (!parsed.success) notFound();

  const country = await getCountryBySlug(parsed.data);
  if (!country) notFound();

  const cities = await getCitiesByCountry(country.country);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: "Countries",
        item: `${siteUrl}/countries`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: country.country,
        item: `${siteUrl}/countries/${country.slug}`,
      },
    ],
  };

  // SEO Phase 2.3: a `Country` + `CollectionPage` pairing makes the page's
  // intent explicit and ties each listed city back to the country entity
  // via `containedInPlace` (matches city page schema added in Phase 1.3).
  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${country.country} city guides`,
    url: `${siteUrl}/countries/${country.slug}`,
    isPartOf: { "@id": `${siteUrl}/#website` },
    about: {
      "@type": "Country",
      name: country.country,
      ...(country.iso2 ? { identifier: country.iso2 } : {}),
    },
    numberOfItems: cities.length,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <main id="main-content" className="text-foreground min-h-screen bg-transparent">
        <div
          className="container-gutter mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20"
          style={{ paddingTop: "max(4rem, calc(env(safe-area-inset-top, 0px) + 5rem))" }}
        >
          <Breadcrumbs
            items={[{ label: "Countries", href: "/countries" }, { label: country.country }]}
          />

          <span className="eyebrow">
            <Globe2 className="text-accent h-3.5 w-3.5" aria-hidden />
            {country.country}
          </span>
          <h1 className="page-title text-foreground mt-6 max-w-3xl">
            {country.country} travel guide.
          </h1>
          <p className="lede mt-5 max-w-2xl">
            {cities.length} cities indexed in {country.country}. Each links to a city page with live
            weather, air-quality, neighborhood texture, and AI-assisted briefings sourced from
            public providers.
          </p>

          <section aria-labelledby="cities-heading" className="mt-12">
            <h2
              id="cities-heading"
              className="text-muted text-xs font-semibold tracking-[0.22em] uppercase"
            >
              Cities in {country.country}
            </h2>
            <ul className="card-grid mt-4">
              {cities.map((city) => (
                <li key={city.id}>
                  <CityCard city={city} />
                </li>
              ))}
            </ul>
          </section>

          <nav className="mt-12 flex flex-wrap gap-3" aria-label="Country navigation">
            <Link
              href="/countries"
              className="border-line bg-background/65 text-muted-strong hover:text-foreground inline-flex items-center gap-3 rounded-full border px-4 py-3 text-xs font-bold tracking-[0.18em] uppercase transition-colors duration-300"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              All countries
            </Link>
          </nav>
        </div>
      </main>
    </>
  );
}

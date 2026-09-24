import type { Metadata } from "next";
import Link from "next/link";
import { Globe2 } from "lucide-react";
import { getTopCities } from "@/lib/cities";
import { getCountrySummaries } from "@/lib/countries";
import { getSiteUrl } from "@/lib/site";
import { buttonClasses } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { CountryChips } from "@/components/discovery/CountryChips";
import { FilterableCityList } from "@/components/discovery/FilterableCityList";
import { JsonLd } from "@/components/seo/JsonLd";

// SEO Phase 2.3 (audit 7.2): the `/cities` hub is the crawl-friendly index.
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
const COUNTRY_CHIP_LIMIT = 24;

export default async function CitiesIndexPage() {
  const [cities, countries] = await Promise.all([
    getTopCities(CITIES_INDEX_TOP_LIMIT),
    getCountrySummaries().catch(() => []),
  ]);
  const siteUrl = getSiteUrl();

  return (
    <main id="main-content">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
            { "@type": "ListItem", position: 2, name: "Cities", item: `${siteUrl}/cities` },
          ],
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "All cities",
          url: `${siteUrl}/cities`,
          isPartOf: { "@id": `${siteUrl}/#website` },
          numberOfItems: cities.length,
        }}
      />
      <Container>
        <PageHeader
          breadcrumbs={[{ label: "Home", href: "/" }, { label: "Cities" }]}
          title="Cities"
          lede="The world's largest cities, ranked by population. Open any guide for live conditions, seasons and places — or filter the list below."
        />
        <div className="space-y-16 py-12 pb-20">
          {countries.length > 0 ? (
            <Section
              id="by-country"
              title="Browse by country"
              actions={
                <Link href="/countries" className={buttonClasses({ variant: "link" })}>
                  All {countries.length} countries
                </Link>
              }
            >
              <CountryChips countries={countries.slice(0, COUNTRY_CHIP_LIMIT)} />
            </Section>
          ) : null}
          <Section
            id="top-cities"
            title={`Top ${cities.length || CITIES_INDEX_TOP_LIMIT} cities by population`}
          >
            {cities.length > 0 ? (
              <FilterableCityList
                label="cities"
                cities={cities.map(({ id, slug, city, admin_name, country, population }) => ({
                  id,
                  slug,
                  city,
                  admin_name,
                  country,
                  population,
                }))}
              />
            ) : (
              <EmptyState
                icon={<Globe2 aria-hidden />}
                title="The city index is unavailable right now"
              >
                We couldn&apos;t load the list. Search still works, or try again in a moment.
              </EmptyState>
            )}
          </Section>
        </div>
      </Container>
    </main>
  );
}

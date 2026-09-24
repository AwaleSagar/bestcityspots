import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPinOff } from "lucide-react";
import { getCitiesByCountry, getCountryBySlug, getCountrySummaries } from "@/lib/countries";
import { getSiteUrl } from "@/lib/site";
import { citySlugSchema } from "@/lib/validation";
import { buttonClasses } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterableCityList } from "@/components/discovery/FilterableCityList";
import { JsonLd } from "@/components/seo/JsonLd";

type RouteParams = { slug: string };

// Long-tail countries render via ISR; the head of the distribution is
// pre-rendered at build time.
export const dynamicParams = true;
export const revalidate = 86400;

export async function generateStaticParams(): Promise<RouteParams[]> {
  try {
    const countries = await getCountrySummaries();
    return countries.slice(0, 60).map((c) => ({ slug: c.slug }));
  } catch (error) {
    console.warn("[countries/[slug]] generateStaticParams failed:", error);
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const parsed = citySlugSchema.safeParse(slug);
  if (!parsed.success) return { title: "Country not found" };
  const country = await getCountryBySlug(parsed.data).catch(() => null);
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

  const country = await getCountryBySlug(parsed.data).catch(() => null);
  if (!country) notFound();

  const cities = await getCitiesByCountry(country.country).catch(() => []);
  const siteUrl = getSiteUrl();

  return (
    <main id="main-content">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
            { "@type": "ListItem", position: 2, name: "Countries", item: `${siteUrl}/countries` },
            {
              "@type": "ListItem",
              position: 3,
              name: country.country,
              item: `${siteUrl}/countries/${country.slug}`,
            },
          ],
        }}
      />
      {/* SEO Phase 2.3: Country + CollectionPage makes the page's intent explicit. */}
      <JsonLd
        data={{
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
        }}
      />
      <Container>
        <PageHeader
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: "Countries", href: "/countries" },
            { label: country.country },
          ]}
          eyebrow="Country guide"
          title={`Cities in ${country.country}`}
          lede={`${country.cityCount} ${country.cityCount === 1 ? "city" : "cities"} in our index, largest first. Each guide has live conditions, seasons and places.`}
          actions={
            <Link href="/countries" className={buttonClasses({ variant: "link" })}>
              All countries
            </Link>
          }
        />
        <div className="py-12 pb-20">
          {cities.length > 0 ? (
            <FilterableCityList
              label="cities"
              cities={cities.map(
                ({ id, slug: citySlug, city, admin_name, country: name, population }) => ({
                  id,
                  slug: citySlug,
                  city,
                  admin_name,
                  country: name,
                  population,
                })
              )}
            />
          ) : (
            <EmptyState
              icon={<MapPinOff aria-hidden />}
              title={`No city guides for ${country.country} yet`}
            >
              Search for a nearby city, or browse the full index.
            </EmptyState>
          )}
        </div>
      </Container>
    </main>
  );
}

import type { Metadata } from "next";
import { fetchTrendingCityIds } from "@/app/actions";
import { SITEMAP_CITY_COUNT } from "@/app/sitemap";
import { getTopCities } from "@/lib/cities";
import { formatPopulation } from "@/lib/format";
import { getSiteUrl } from "@/lib/site";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { FilterableCityList } from "@/components/discovery/FilterableCityList";
import { PrioritiesMixer } from "@/components/discovery/PrioritiesMixer";
import { JsonLd } from "@/components/seo/JsonLd";
import { ListOrdered } from "lucide-react";

const siteUrl = getSiteUrl();

const year = new Date().getFullYear();

export const metadata: Metadata = {
  title: `Best Cities to Visit in ${year}: ${SITEMAP_CITY_COUNT}-City Travel Guide`,
  description:
    `A free, curated index of the ${SITEMAP_CITY_COUNT} best cities to visit in ${year} — ` +
    `with live weather, AI-assisted briefings, neighborhoods, and trip-planning context. No sign-up required.`,
  alternates: {
    canonical: "/resources/top-cities",
  },
  openGraph: {
    title: `Best Cities to Visit in ${year} | Best City Spots`,
    description:
      `A free, curated index of the ${SITEMAP_CITY_COUNT} best cities to visit in ${year} ` +
      "with live data and AI-assisted travel briefings.",
    url: "/resources/top-cities",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `Best Cities to Visit in ${year} | Best City Spots`,
    description: `Free curated index of the ${SITEMAP_CITY_COUNT} best cities to visit in ${year} with full guides.`,
  },
};

export const revalidate = 86400;

export default async function TopCitiesPage() {
  const [cities, trendingIdsArr] = await Promise.all([
    getTopCities(SITEMAP_CITY_COUNT),
    fetchTrendingCityIds().catch(() => []),
  ]);
  const trendingIds = new Set(trendingIdsArr);

  // §3: enrich with the aggregate-demand flag so the client component can
  // render the "trending with readers" chip without a Set crossing the
  // server→client serialization boundary.
  const citiesWithTrending = cities.map((city) => ({
    ...city,
    trending: trendingIds.has(city.id),
  }));

  const itemListStructuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Best Cities to Visit in ${year}`,
    description:
      `A curated list of the ${SITEMAP_CITY_COUNT} best cities to visit in ${year}, ` +
      "with links to full city guides.",
    numberOfItems: cities.length,
    itemListElement: cities.slice(0, SITEMAP_CITY_COUNT).map((city, index) => {
      const segment =
        typeof city.slug === "string" && city.slug.length > 0 ? city.slug : String(city.id);
      return {
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Place",
          name: `${city.city}, ${city.country}`,
          url: `${siteUrl}/cities/${segment}`,
        },
      };
    }),
  };

  const breadcrumbStructuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: `Best Cities to Visit in ${year}`,
        item: `${siteUrl}/resources/top-cities`,
      },
    ],
  };

  const countryCount = new Set(cities.map((city) => city.country)).size;
  const capitalCount = cities.filter((city) => city.capital === "primary").length;
  const combinedPopulation = cities.reduce((sum, city) => sum + (city.population ?? 0), 0);
  const stats = [
    { label: "Cities", value: String(cities.length) },
    { label: "Countries", value: String(countryCount) },
    { label: "National capitals", value: String(capitalCount) },
    { label: "Combined population", value: formatPopulation(combinedPopulation) },
  ];

  return (
    <main id="main-content">
      <JsonLd data={itemListStructuredData} />
      <JsonLd data={breadcrumbStructuredData} />
      <Container>
        <PageHeader
          breadcrumbs={[
            { label: "Guides", href: "/guides" },
            { label: `The Top ${SITEMAP_CITY_COUNT}` },
          ]}
          eyebrow={`Best cities to visit in ${year}`}
          title={`The Top ${SITEMAP_CITY_COUNT}`}
          lede="The world's largest cities, each with a full guide — then re-ranked by the priorities you choose. Free, no sign-up."
        >
          {cities.length > 0 ? (
            <dl className="border-rule bg-rule grid grid-cols-2 gap-px overflow-hidden rounded-md border sm:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="bg-surface p-4">
                  <dt className="text-ink-muted text-sm">{stat.label}</dt>
                  <dd className="font-display mt-1 text-3xl tabular-nums">{stat.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </PageHeader>
        <div className="space-y-20 py-12 pb-20">
          <Section
            id="mixer"
            title="Rank by your priorities"
            description="Weigh budget, air quality and safety. Scores come from the same metrics shown on each city guide."
          >
            <PrioritiesMixer
              cities={citiesWithTrending.map(({ id, slug, city, admin_name, country }) => ({
                id,
                slug,
                city,
                admin_name,
                country,
              }))}
            />
          </Section>
          <Section id="all" title={`All ${cities.length || SITEMAP_CITY_COUNT}, by population`}>
            {cities.length > 0 ? (
              <FilterableCityList
                label="cities"
                cities={citiesWithTrending.map(
                  ({ id, slug, city, admin_name, country, population, trending }) => ({
                    id,
                    slug,
                    city,
                    admin_name,
                    country,
                    population,
                    trending,
                  })
                )}
              />
            ) : (
              <EmptyState
                icon={<ListOrdered aria-hidden />}
                title="The ranking is unavailable right now"
              >
                Try again in a moment, or search for a city directly.
              </EmptyState>
            )}
          </Section>
        </div>
      </Container>
    </main>
  );
}

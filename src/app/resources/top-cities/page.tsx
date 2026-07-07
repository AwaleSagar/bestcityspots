import { serializeJsonLd } from "@/lib/json-ld";
import type { Metadata } from "next";
import { getTopCities } from "@/lib/cities";
import { fetchTrendingCityIds } from "@/app/actions";
import TopCitiesPageContent from "@/components/pages/TopCitiesPageContent";
import { publicEnv } from "@/lib/env";
import { SITEMAP_CITY_COUNT } from "@/app/sitemap";

const siteUrl = (publicEnv().NEXT_PUBLIC_SITE_URL ?? "https://bestcityspots.com").replace(
  /\/$/,
  ""
);

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
    fetchTrendingCityIds(),
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(itemListStructuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbStructuredData) }}
      />
      <TopCitiesPageContent cities={citiesWithTrending} />
    </>
  );
}

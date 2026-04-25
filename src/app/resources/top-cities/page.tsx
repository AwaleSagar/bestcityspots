import type { Metadata } from "next";
import { getTopCities } from "@/lib/cities";
import TopCitiesPageContent from "@/components/pages/TopCitiesPageContent";
import { publicEnv } from "@/lib/env";

const siteUrl = publicEnv().NEXT_PUBLIC_SITE_URL ?? "https://bestcityspots.com";

export const metadata: Metadata = {
  title: "Top 50 Cities to Explore | Free City Guide",
  description:
    "A free curated list of the top 50 cities to explore—with quick links to full guides, metrics, and AI briefings. No sign-up required.",
  alternates: {
    canonical: "/resources/top-cities",
  },
  openGraph: {
    title: "Top 50 Cities to Explore | Best City Spots",
    description:
      "A free curated list of the top 50 cities to explore—with quick links to full guides. No sign-up required.",
    url: "/resources/top-cities",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Top 50 Cities to Explore | Best City Spots",
    description: "Free curated list of top cities with links to full guides.",
  },
};

export const revalidate = 86400;

export default async function TopCitiesPage() {
  const cities = await getTopCities(50);

  const itemListStructuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Top 50 Cities to Explore",
    description: "A curated list of the top 50 cities to explore, with links to full city guides.",
    numberOfItems: cities.length,
    itemListElement: cities.slice(0, 50).map((city, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Place",
        name: city.city,
        url: `${siteUrl}/cities/${city.id}`,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListStructuredData) }}
      />
      <TopCitiesPageContent cities={cities} />
    </>
  );
}

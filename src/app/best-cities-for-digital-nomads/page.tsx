import type { Metadata } from "next";
import { getDigitalNomadCities } from "@/lib/topical-hubs";
import { getSiteUrl } from "@/lib/site";
import { HubLayout } from "@/components/discovery/HubLayout";
import { JsonLd } from "@/components/seo/JsonLd";

const siteUrl = getSiteUrl();

const year = new Date().getFullYear();

export const metadata: Metadata = {
  title: `Best Cities for Digital Nomads (${year}): Connectivity & Comfort Ranked`,
  description: `Cities ranked for remote-work suitability based on cached connectivity, climate comfort, and safety signals (${year}).`,
  alternates: { canonical: "/best-cities-for-digital-nomads" },
  openGraph: {
    title: `Best Cities for Digital Nomads (${year}) | Best City Spots`,
    description:
      "Cities ranked for remote-work suitability based on cached connectivity, climate, and safety signals.",
    url: "/best-cities-for-digital-nomads",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `Best Cities for Digital Nomads (${year}) | Best City Spots`,
    description:
      "Cities ranked for remote-work suitability based on cached connectivity, climate, and safety signals.",
  },
};

export const revalidate = 86400;

export default async function DigitalNomadHubPage() {
  const cities = await getDigitalNomadCities().catch(() => []);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: "Best cities for digital nomads",
        item: `${siteUrl}/best-cities-for-digital-nomads`,
      },
    ],
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Best cities for digital nomads",
    url: `${siteUrl}/best-cities-for-digital-nomads`,
    numberOfItems: cities.length,
    itemListElement: cities.map((city, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${siteUrl}/cities/${city.slug ?? city.id}`,
      name: `${city.city}, ${city.country}`,
    })),
  };

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <JsonLd data={itemListJsonLd} />
      <HubLayout
        eyebrow="Remote work"
        title={`Best cities for digital nomads (${year})`}
        lede="Cities ranked for remote work: fast connections first, then a livable climate and a safety signal — scored from the same data shown on each city guide."
        methodologyNote="Score = download speed in Mbps, plus 12 points for a mild or warm climate and 6 for a safety score above 60. Cities under 200,000 people are left out."
        breadcrumbLabel="For digital nomads"
        currentPath="/best-cities-for-digital-nomads"
        cities={cities}
      />
    </>
  );
}

import { serializeJsonLd } from "@/lib/json-ld";
import type { Metadata } from "next";
import { Laptop2 } from "lucide-react";
import TopicalHubLayout from "@/components/seo/TopicalHubLayout";
import { getDigitalNomadCities } from "@/lib/topical-hubs";
import { publicEnv } from "@/lib/env";

const siteUrl = (
  publicEnv().NEXT_PUBLIC_SITE_URL ?? "https://bestcityspots.com"
).replace(/\/$/, "");

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
  const cities = await getDigitalNomadCities();

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(itemListJsonLd) }}
      />
      <TopicalHubLayout
        eyebrow="Digital nomads"
        eyebrowIcon={<Laptop2 className="text-accent h-3.5 w-3.5" aria-hidden />}
        title={`Best cities for digital nomads (${year}).`}
        lede="A working ranking of remote-work-suitable cities, scored from connectivity bandwidth, climate comfort, and safety signals already cached for each city page."
        methodologyNote="Score = connectivity_mbps + mild/warm climate bonus + safety bonus. Cities under 200,000 population are excluded so the surface stays useful for nomads."
        breadcrumbLabel="Best cities for digital nomads"
        cities={cities}
      />
    </>
  );
}

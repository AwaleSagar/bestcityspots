import type { Metadata } from "next";
import { getCleanestAirCities } from "@/lib/topical-hubs";
import { getSiteUrl } from "@/lib/site";
import { HubLayout } from "@/components/discovery/HubLayout";
import { JsonLd } from "@/components/seo/JsonLd";

const siteUrl = getSiteUrl();

const year = new Date().getFullYear();

export const metadata: Metadata = {
  title: `Best Cities by Air Quality (${year}): Lowest PM2.5, Cleanest Air`,
  description: `Cities with the cleanest air right now, ranked by cached PM2.5 readings. Updated continuously from public air-quality providers (${year}).`,
  alternates: { canonical: "/best-cities-by-air-quality" },
  openGraph: {
    title: `Best Cities by Air Quality (${year}) | Best City Spots`,
    description: "Cities with the cleanest air right now, ranked by cached PM2.5 readings.",
    url: "/best-cities-by-air-quality",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `Best Cities by Air Quality (${year}) | Best City Spots`,
    description: "Cities with the cleanest air right now, ranked by cached PM2.5 readings.",
  },
};

export const revalidate = 86400;

export default async function CleanestAirHubPage() {
  const cities = await getCleanestAirCities().catch(() => []);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: "Best cities by air quality",
        item: `${siteUrl}/best-cities-by-air-quality`,
      },
    ],
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Best cities by air quality",
    url: `${siteUrl}/best-cities-by-air-quality`,
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
        eyebrow="Air quality"
        title={`Best cities by air quality (${year})`}
        lede="The cities in our index with the cleanest air, ranked by their most recent PM2.5 readings — the fine particles that matter most for health."
        methodologyNote="Lower PM2.5 ranks higher. Readings come from Open-Meteo and OpenWeather and refresh when a city's guide is viewed, so recently visited cities carry the newest numbers."
        breadcrumbLabel="Cleanest air"
        currentPath="/best-cities-by-air-quality"
        cities={cities}
      />
    </>
  );
}

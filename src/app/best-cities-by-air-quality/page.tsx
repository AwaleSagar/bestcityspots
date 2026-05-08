import type { Metadata } from "next";
import { Wind } from "lucide-react";
import TopicalHubLayout from "@/components/seo/TopicalHubLayout";
import { getCleanestAirCities } from "@/lib/topical-hubs";
import { publicEnv } from "@/lib/env";

const siteUrl = (
  publicEnv().NEXT_PUBLIC_SITE_URL ?? "https://bestcityspots.com"
).replace(/\/$/, "");

const year = new Date().getFullYear();

export const metadata: Metadata = {
  title: `Best Cities by Air Quality (${year}): Lowest PM2.5, Cleanest Air`,
  description: `Cities with the cleanest air right now, ranked by cached PM2.5 readings. Updated continuously from public air-quality providers (${year}).`,
  alternates: { canonical: "/best-cities-by-air-quality" },
  openGraph: {
    title: `Best Cities by Air Quality (${year}) | Best City Spots`,
    description:
      "Cities with the cleanest air right now, ranked by cached PM2.5 readings.",
    url: "/best-cities-by-air-quality",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `Best Cities by Air Quality (${year}) | Best City Spots`,
    description:
      "Cities with the cleanest air right now, ranked by cached PM2.5 readings.",
  },
};

export const revalidate = 86400;

export default async function CleanestAirHubPage() {
  const cities = await getCleanestAirCities();

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <TopicalHubLayout
        eyebrow="Air quality"
        eyebrowIcon={<Wind className="text-accent h-3.5 w-3.5" aria-hidden />}
        title={`Best cities by air quality (${year}).`}
        lede="The cleanest-air cities indexed by Best City Spots, ranked by the most recent cached PM2.5 readings from public air-quality providers."
        methodologyNote="Lower PM2.5 ranks higher. Readings come from the city_metrics cache populated by Open-Meteo and OpenWeather and refreshed when a city page is viewed."
        breadcrumbLabel="Best cities by air quality"
        cities={cities}
      />
    </>
  );
}

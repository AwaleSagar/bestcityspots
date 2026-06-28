import { serializeJsonLd } from "@/lib/json-ld";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarRange } from "lucide-react";
import TopicalHubLayout from "@/components/seo/TopicalHubLayout";
import {
  getCitiesForMonth,
  isValidMonthSlug,
  listMonthSlugs,
  monthLabel,
} from "@/lib/topical-hubs";
import { publicEnv } from "@/lib/env";

const siteUrl = (
  publicEnv().NEXT_PUBLIC_SITE_URL ?? "https://bestcityspots.com"
).replace(/\/$/, "");

type RouteParams = { month: string };

export const dynamicParams = false;
export const revalidate = 86400;

export async function generateStaticParams(): Promise<RouteParams[]> {
  return listMonthSlugs().map((m) => ({ month: m }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { month } = await params;
  if (!isValidMonthSlug(month)) return { title: "Month not found" };
  const label = monthLabel(month);
  const year = new Date().getFullYear();
  const title = `Best Cities to Visit in ${label} (${year}): Climate-Ranked Travel Guide`;
  const description = `Where to travel in ${label} ${year} — cities ranked by climate comfort and air quality from the Best City Spots cache.`;
  return {
    title,
    description,
    alternates: { canonical: `/best-cities-to-visit-in/${month}` },
    openGraph: {
      title: `Best Cities to Visit in ${label} (${year}) | Best City Spots`,
      description,
      url: `/best-cities-to-visit-in/${month}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `Best Cities to Visit in ${label} (${year}) | Best City Spots`,
      description,
    },
  };
}

export default async function BestCitiesByMonthPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { month } = await params;
  if (!isValidMonthSlug(month)) notFound();

  const cities = await getCitiesForMonth(month);
  const label = monthLabel(month);
  const year = new Date().getFullYear();

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: `Best cities to visit in ${label}`,
        item: `${siteUrl}/best-cities-to-visit-in/${month}`,
      },
    ],
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Best cities to visit in ${label}`,
    url: `${siteUrl}/best-cities-to-visit-in/${month}`,
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
        eyebrow={`Travel in ${label}`}
        eyebrowIcon={<CalendarRange className="text-accent h-3.5 w-3.5" aria-hidden />}
        title={`Best cities to visit in ${label} ${year}.`}
        lede={`A working list of cities whose cached climate comfort and air quality align with travel in ${label}, ranked using deterministic scoring so the page stays stable between visits.`}
        methodologyNote={`Cities whose cached climate_comfort label matches a travel-friendly band for ${label} score higher; PM2.5 reads in as a small penalty so cleaner-air cities surface first.`}
        breadcrumbLabel={`Best cities to visit in ${label}`}
        cities={cities}
      />
    </>
  );
}

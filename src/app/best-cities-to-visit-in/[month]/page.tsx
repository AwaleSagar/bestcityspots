import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getCitiesForMonth,
  isValidMonthSlug,
  listMonthSlugs,
  monthLabel,
} from "@/lib/topical-hubs";
import { MonthSwitcher } from "@/components/discovery/MonthSwitcher";
import { getSiteUrl } from "@/lib/site";
import { HubLayout } from "@/components/discovery/HubLayout";
import { JsonLd } from "@/components/seo/JsonLd";

const siteUrl = getSiteUrl();

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

export default async function BestCitiesByMonthPage({ params }: { params: Promise<RouteParams> }) {
  const { month } = await params;
  if (!isValidMonthSlug(month)) notFound();

  const cities = await getCitiesForMonth(month).catch(() => []);
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
      <JsonLd data={breadcrumbJsonLd} />
      <JsonLd data={itemListJsonLd} />
      <HubLayout
        eyebrow={`Travel in ${label}`}
        title={`Best cities to visit in ${label} ${year}`}
        lede={`Cities whose current climate and air quality suit a trip in ${label}. The ranking is deterministic, so it stays stable between visits.`}
        methodologyNote={`Cities whose climate band suits ${label} travel score higher, larger cities get a small boost, and PM2.5 counts as a small penalty so cleaner air rises. Month preferences follow Northern Hemisphere seasons.`}
        breadcrumbLabel={`Best in ${label}`}
        currentPath={`/best-cities-to-visit-in/${month}`}
        subnav={<MonthSwitcher current={month} />}
        cities={cities}
      />
    </>
  );
}

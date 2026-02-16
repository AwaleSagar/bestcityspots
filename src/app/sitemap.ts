import type { MetadataRoute } from "next";

import { getTopCities } from "@/lib/cities";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bestcityspots.com";

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/resources/top-cities`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];

  const topCities = await getTopCities(100);
  const cityRoutes = topCities
    .filter((city) => typeof city.id === "number")
    .map((city) => ({
      url: `${siteUrl}/cities/${city.id}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

  return routes.concat(cityRoutes);
}

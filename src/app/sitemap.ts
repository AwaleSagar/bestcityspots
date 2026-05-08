import type { MetadataRoute } from "next";

import { getTopCities } from "@/lib/cities";
import { publicEnv } from "@/lib/env";

const siteUrl = (
  publicEnv().NEXT_PUBLIC_SITE_URL ?? "https://bestcityspots.com"
).replace(/\/$/, "");

export const revalidate = 86400;

/**
 * Number of cities surfaced both in the sitemap and on `/resources/top-cities`.
 * Keeping the two in lock-step satisfies SEO audit T4 (sitemap/listing parity)
 * — every URL we submit is reachable via on-site navigation, eliminating
 * orphaned URLs and crawl waste.
 */
export const SITEMAP_CITY_COUNT = 50;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const routes: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${siteUrl}/resources/top-cities`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];

  const topCities = await getTopCities(SITEMAP_CITY_COUNT);

  // SEO audit T14: vary `priority` by population band so the signal carries
  // information instead of repeating 0.6 across every city.
  // SEO audit 4.3: `changeFrequency: daily` reflects that city pages embed
  // live weather/AQI; the surrounding chrome is mostly stable.
  const cityRoutes = topCities
    .map((city) => {
      const segment =
        typeof city.slug === "string" && city.slug.length > 0
          ? city.slug
          : typeof city.id === "number"
            ? String(city.id)
            : null;
      if (!segment) return null;

      const priority =
        city.population >= 5_000_000 ? 0.8 : city.population >= 1_000_000 ? 0.6 : 0.4;

      return {
        url: `${siteUrl}/cities/${segment}`,
        // The `cities` table has no `updated_at` today; use `now` so the
        // timestamp is at least honest about the daily ISR cycle (the
        // sitemap itself revalidates every 24h via the `revalidate`
        // export above). When a per-row `updated_at` ships, swap this in.
        lastModified: now,
        changeFrequency: "daily" as const,
        priority,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  return routes.concat(cityRoutes);
}

import type { MetadataRoute } from "next";

import { getTopCities } from "@/lib/cities";
import { getCountrySummaries } from "@/lib/countries";
import { listMonthSlugs } from "@/lib/topical-hubs";
import { publicEnv } from "@/lib/env";

const siteUrl = (publicEnv().NEXT_PUBLIC_SITE_URL ?? "https://bestcityspots.com").replace(
  /\/$/,
  ""
);

export const revalidate = 86400;

/**
 * Number of cities surfaced in the sitemap.
 *
 * US-02 (product audit AF-3): this is pinned to the cache-warmed set — the
 * top 250 cities warmed nightly by `scripts/warm-cache.ts --top-cities=250`
 * (also the Top 250 index at /resources/top-cities). Submitting
 * only pages with real cached content follows Google's thin-content guidance
 * ("fewer, stronger pages"): long-tail cities remain reachable and render
 * the reduced template, but are never advertised to crawlers. If the warm
 * envelope changes, change the warmer and this constant together.
 */
export const SITEMAP_CITY_COUNT = 250;

const homeImage = `${siteUrl}/opengraph-image`;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const routes: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
      images: [homeImage],
    },
    {
      url: `${siteUrl}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
      images: [homeImage],
    },
    // SEO Phase 2.4 / 3.5: methodology + press are E-E-A-T surfaces; both
    // should be discoverable directly from the sitemap.
    {
      url: `${siteUrl}/methodology`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
      images: [homeImage],
    },
    {
      url: `${siteUrl}/press`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
      images: [homeImage],
    },
    // UI review item 4: accessibility statement (EAA expectation).
    {
      url: `${siteUrl}/accessibility`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
      images: [homeImage],
    },
    // SEO Phase 2.3: IA hubs.
    {
      url: `${siteUrl}/guides`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
      images: [homeImage],
    },
    {
      url: `${siteUrl}/cities`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
      images: [homeImage],
    },
    {
      url: `${siteUrl}/countries`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
      images: [homeImage],
    },
    {
      url: `${siteUrl}/best-cities-by-air-quality`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
      images: [homeImage],
    },
    {
      url: `${siteUrl}/best-cities-for-digital-nomads`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
      images: [homeImage],
    },
    {
      url: `${siteUrl}/resources/top-cities`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
      images: [homeImage],
    },
  ];

  // Twelve evergreen month hubs.
  for (const month of listMonthSlugs()) {
    routes.push({
      url: `${siteUrl}/best-cities-to-visit-in/${month}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.5,
      images: [homeImage],
    });
  }

  // Country pages — limited to the most-populous countries to match the
  // generateStaticParams head and keep crawl budget aligned with on-site
  // navigation (audit T4 parity).
  try {
    const countries = await getCountrySummaries();
    for (const country of countries.slice(0, 60)) {
      routes.push({
        url: `${siteUrl}/countries/${country.slug}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.5,
        images: [homeImage],
      });
    }
  } catch {
    // Country hubs are nice-to-have in the sitemap; if the lookup fails
    // (e.g. database unavailable during build), the city + hub entries
    // still ship.
  }

  const topCities = await getTopCities(SITEMAP_CITY_COUNT);

  // SEO audit T14: vary `priority` by population band so the signal carries
  // information instead of repeating 0.6 across every city.
  // SEO audit 4.3: `changeFrequency: daily` reflects that city pages embed
  // live weather/AQI; the surrounding chrome is mostly stable.
  // SEO Phase 2.2: each city URL declares an associated `<image:image>` so
  // the OG card is discoverable through the standard image-sitemap surface.
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
        images: [homeImage],
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  return routes.concat(cityRoutes);
}

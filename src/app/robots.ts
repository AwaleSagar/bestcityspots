import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/env";

const siteUrl = (
  publicEnv().NEXT_PUBLIC_SITE_URL ?? "https://bestcityspots.com"
).replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // SEO audit T8: API routes return JSON only — keep them out of the
        // crawl budget so search engines focus on indexable HTML pages.
        disallow: ["/api/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}

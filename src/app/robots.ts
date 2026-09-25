import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/env";

const siteUrl = (publicEnv().NEXT_PUBLIC_SITE_URL ?? "https://bestcityspots.com").replace(
  /\/$/,
  ""
);

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // SEO audit T8: API routes return JSON only — keep them out of the
        // crawl budget so search engines focus on indexable HTML pages.
        disallow: ["/api/", "/admin", "/auth/"],
      },
      // Cost guard: block high-volume AI/data crawlers from indexing the site.
      // Well-behaved bots honor robots.txt and this can materially reduce
      // crawler-triggered SSR/database load.
      { userAgent: "GPTBot", disallow: ["/"] },
      { userAgent: "ChatGPT-User", disallow: ["/"] },
      { userAgent: "CCBot", disallow: ["/"] },
      { userAgent: "anthropic-ai", disallow: ["/"] },
      { userAgent: "ClaudeBot", disallow: ["/"] },
      { userAgent: "Bytespider", disallow: ["/"] },
      { userAgent: "PerplexityBot", disallow: ["/"] },
      { userAgent: "Amazonbot", disallow: ["/"] },
      { userAgent: "Diffbot", disallow: ["/"] },
      { userAgent: "PetalBot", disallow: ["/"] },
      { userAgent: "SemrushBot", disallow: ["/"] },
      { userAgent: "AhrefsBot", disallow: ["/"] },
      { userAgent: "MJ12bot", disallow: ["/"] },
      { userAgent: "DotBot", disallow: ["/"] },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}

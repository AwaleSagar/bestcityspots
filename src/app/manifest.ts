import type { MetadataRoute } from "next";

/**
 * SEO Phase 4.2 (audit T10): minimal PWA manifest so the app is installable.
 * Icons point at routes we control: `/icon.svg` (src/app/icon.svg),
 * `/apple-icon` (src/app/apple-icon.tsx) and the 1200×630 `/opengraph-image`.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Best City Spots",
    short_name: "City Spots",
    description:
      "City travel guides with live weather, neighborhood texture, and AI-assisted briefings.",
    start_url: "/",
    display: "standalone",
    // Paper / ink — keep in sync with globals.css.
    background_color: "#f7f4ee",
    theme_color: "#f7f4ee",
    orientation: "portrait-primary",
    categories: ["travel", "lifestyle", "navigation"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png", purpose: "any" },
      { src: "/opengraph-image", sizes: "1200x630", type: "image/png", purpose: "any" },
    ],
  };
}

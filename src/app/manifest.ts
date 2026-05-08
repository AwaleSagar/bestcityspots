import type { MetadataRoute } from "next";

/**
 * SEO Phase 4.2 (audit T10): minimal PWA manifest so the app is installable
 * and so search engines treat the brand as a coherent application surface.
 *
 * The icon set here intentionally points at routes we already control:
 *   - `/opengraph-image` for the rich 1200x630 PNG
 *   - `/icon.svg` (Next.js automatic icon convention for `src/app/icon.svg`)
 *   - `/apple-icon.png` (Next.js automatic Apple touch icon)
 * No additional binary assets are introduced; if/when maskable PNG icons are
 * commissioned, drop them under `src/app/icon-*.png` and Next will pick them
 * up automatically (no edits to this file required).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Best City Spots",
    short_name: "City Spots",
    description:
      "City travel guides with live weather, neighborhood texture, and AI-assisted briefings.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    orientation: "portrait-primary",
    categories: ["travel", "lifestyle", "navigation"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/opengraph-image",
        sizes: "1200x630",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}

import type { Metadata } from "next";
import AboutPageContent from "@/components/pages/AboutPageContent";
import { publicEnv } from "@/lib/env";

const siteUrl = publicEnv().NEXT_PUBLIC_SITE_URL ?? "https://bestcityspots.com";

export const metadata: Metadata = {
  title: "About Best City Spots",
  description:
    "Transparent overview of how Best City Spots works: our data sources, methodology, and commitment to no paywalls, no dark patterns, and ethical design.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "About Best City Spots | How We Work & Our Data",
    description:
      "Transparent overview of our data sources, methodology, and commitment to ethical design.",
    url: "/about",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Best City Spots - Urban Intelligence",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "About Best City Spots | How We Work & Our Data",
    description: "Transparent overview of our data sources and ethical design.",
    images: ["/opengraph-image"],
  },
};

const structuredData = [
  {
    "@context": "https://schema.org",
    // SEO Phase 2.2 (audit 5.5): emit `AboutPage` here so search engines map
    // /about to the right knowledge-graph type, distinct from the
    // Organization/WebSite blocks in the root layout. Cross-references the
    // `@id`s declared in `src/app/layout.tsx` so all three blocks compose
    // into a single graph rather than three orphan nodes.
    "@type": "AboutPage",
    name: "About Best City Spots",
    url: `${siteUrl}/about`,
    description:
      "Transparent overview of how Best City Spots works: data sources, methodology, and our commitment to ethical design.",
    isPartOf: { "@id": `${siteUrl}/#website` },
    publisher: { "@id": `${siteUrl}/#organization` },
    mainEntity: { "@id": `${siteUrl}/#organization` },
  },
];

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <AboutPageContent />
    </>
  );
}

import type { Metadata } from "next";
import AboutPageContent from "@/components/pages/AboutPageContent";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bestcityspots.com";

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
    "@type": "Organization",
    name: "Best City Spots",
    url: siteUrl,
    description:
      "Best City Spots is a curated atlas of global cities blending live signals with urban intelligence.",
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Best City Spots",
    url: siteUrl,
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

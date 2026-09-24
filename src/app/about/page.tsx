import type { Metadata } from "next";
import Link from "next/link";
import { getSiteUrl } from "@/lib/site";
import { ProseLayout } from "@/components/editorial/ProseLayout";
import { JsonLd } from "@/components/seo/JsonLd";

const siteUrl = getSiteUrl();

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

const PRINCIPLES = [
  {
    title: "No paywalls",
    text: "The core city research stays open, so planning is never gated behind an account.",
  },
  {
    title: "No dark patterns",
    text: "No fake scarcity, countdown timers or disguised calls to action.",
  },
  {
    title: "Transparent data",
    text: "Numbers come from recognizable providers, described in plain language, with their age shown.",
  },
  {
    title: "AI as a summary, not a source",
    text: "AI adds synthesis. It never replaces source data or hides where a fact came from.",
  },
];

const SOURCES = [
  "Google Places for landmarks, restaurants, hotels, ratings and reviews",
  "OpenWeather and Open-Meteo for live conditions and air quality",
  "Public census and geographic datasets for population, region and coordinates",
  "Google Gemini for clearly labelled AI briefings and city summaries",
  "OpenStreetMap contributors for map tiles",
];

const TOC = [
  { id: "principles", label: "Principles" },
  { id: "source-stack", label: "Data sources" },
  { id: "reading", label: "How to read a guide" },
];

export default function AboutPage() {
  return (
    <>
      <JsonLd data={structuredData} />
      <ProseLayout
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "About" }]}
        eyebrow="About"
        title="City guides that show their sources"
        lede="Best City Spots helps deliberate travelers choose where to go and plan what to do there — with live conditions, a clearly labelled AI briefing and places ranked by what travelers actually rate."
        toc={TOC}
      >
        <h2 id="principles">Principles</h2>
        <div className="not-prose mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2">
          {PRINCIPLES.map((principle) => (
            <div key={principle.title} className="border-rule border-t pt-4">
              <h3 className="text-base font-semibold">{principle.title}</h3>
              <p className="text-ink-muted mt-1.5">{principle.text}</p>
            </div>
          ))}
        </div>

        <h2 id="source-stack">Data sources</h2>
        <ul>
          {SOURCES.map((source) => (
            <li key={source}>{source}</li>
          ))}
        </ul>
        <p>
          Refresh windows and caching are documented in the{" "}
          <Link href="/methodology">methodology</Link>.
        </p>

        <h2 id="reading">How to read a guide</h2>
        <p>
          Every city guide opens with the city&apos;s live conditions, then a short overview.
          Anything written by AI is marked as such and dated; everything else is a provider field
          with its own timestamp. Places are ordered by the number of traveler reviews, and you can
          save them, add private notes and group them into days — all stored on your device.
        </p>
        <p>
          Cities we haven&apos;t fully covered yet show a lightweight profile — verified facts and
          live conditions only — and point you to the nearest full guide instead of padding the
          page.
        </p>
        <p>
          <Link href="/resources/top-cities">Browse the Top 250</Link> or{" "}
          <Link href="/guides">explore the guides</Link>.
        </p>
      </ProseLayout>
    </>
  );
}

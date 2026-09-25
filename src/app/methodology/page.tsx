import type { Metadata } from "next";
import Link from "next/link";
import { getSiteUrl } from "@/lib/site";
import { ProseLayout } from "@/components/editorial/ProseLayout";
import { JsonLd } from "@/components/seo/JsonLd";

const siteUrl = getSiteUrl();

// SEO Phase 2.4 (audit 7.3): explicit, structured methodology page that
// surfaces sources, refresh cadence, and AI-vs-human attribution. Linked
// from the footer (and Phase 2.2's `AboutPage` schema on `/about`) so
// search engines and readers can audit the data trail.
export const metadata: Metadata = {
  title: "Methodology: Sources, Refresh Cadence & AI Attribution",
  description:
    "How Best City Spots collects, caches, and labels city data — including provider sources, refresh cadences, and where AI assists vs. where humans verify.",
  alternates: { canonical: "/methodology" },
  openGraph: {
    title: "Methodology | Best City Spots",
    description: "Sources, refresh cadence, and AI-vs-human attribution behind every city guide.",
    url: "/methodology",
    type: "article",
  },
  twitter: {
    card: "summary",
    title: "Methodology | Best City Spots",
    description: "Sources, refresh cadence, and AI-vs-human attribution behind every city guide.",
  },
};

const sources: Array<{
  name: string;
  used_for: string;
  refreshes: string;
}> = [
  {
    name: "Google Places API",
    used_for: "Landmarks, restaurants, hotels, ratings, reviews, photos.",
    refreshes:
      "Cached 30 days; soft-refreshed in the background after 7 days when a city page is viewed.",
  },
  {
    name: "OpenWeather + Open-Meteo",
    used_for: "Live weather, temperature, conditions, and PM2.5 air quality.",
    refreshes:
      "Cached 60 minutes per city; served stale-while-revalidate up to 24 hours when providers are unreachable.",
  },
  {
    name: "GeoNames",
    used_for:
      "Cities with a population above 15,000 (and every national capital): names, alternate names used by search, coordinates, population, region and country. Licensed CC BY 4.0.",
    refreshes: "Static reference data; re-imported from geonames.org when we refresh the dataset.",
  },
  {
    name: "World Bank (WDI)",
    used_for:
      "Country-level price level (PPP ÷ exchange rate, United States = 100), intentional homicide rate (UNODC) and physicians per capita (WHO). These are national figures, not city measurements, and every city page labels them that way. Licensed CC BY 4.0.",
    refreshes: "Re-imported from the World Bank API; each value shows the year it describes.",
  },
  {
    name: "Google Gemini",
    used_for:
      "City briefings, attractions/seasons summaries, and trending destinations — always labeled as AI-assisted.",
    refreshes:
      "Cached 365 days per city, keyed by a prompt version that we bump whenever the underlying prompts change.",
  },
];

const principles: string[] = [
  "Cache-first reads. We prefer recent cached data over hammering providers; if a provider is down we serve the last known good value with a clearly-labeled timestamp.",
  "AI is summary, not source. AI text is generated from cached source data and labeled visibly. We do not hide what came from an AI summary vs. a structured provider field.",
  "Auditability over freshness. Every city page renders an updated-at line so readers can judge how recent each data point is.",
  "Schema-versioned caches. Every cache row carries a schema version; bumping the version invalidates stale rows safely without a manual purge.",
];

const aboutPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "Methodology",
  url: `${siteUrl}/methodology`,
  description:
    "How Best City Spots collects, caches, and labels city data — sources, refresh cadence, and AI vs. human attribution.",
  isPartOf: { "@id": `${siteUrl}/#website` },
  publisher: { "@id": `${siteUrl}/#organization` },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
    { "@type": "ListItem", position: 2, name: "About", item: `${siteUrl}/about` },
    {
      "@type": "ListItem",
      position: 3,
      name: "Methodology",
      item: `${siteUrl}/methodology`,
    },
  ],
};

const TOC = [
  { id: "sources", label: "Data sources" },
  { id: "ai", label: "How we use AI" },
  { id: "rankings", label: "Rankings" },
  { id: "privacy", label: "Privacy & analytics" },
  { id: "counters", label: "Counters & partner links" },
  { id: "principles", label: "Principles" },
];

export default function MethodologyPage() {
  return (
    <>
      <JsonLd data={aboutPageJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <ProseLayout
        breadcrumbs={[{ label: "About", href: "/about" }, { label: "Methodology" }]}
        eyebrow="How we work"
        title="Methodology: sources, refresh cadence and AI attribution"
        lede="We treat travel data like a public record: every number on a city guide traces back to a named provider, a refresh window, and a clear note about whether a person or an AI assembled it."
        toc={TOC}
      >
        <h2 id="sources">Data sources</h2>
        <div className="not-prose divide-rule border-rule mt-6 divide-y border-y">
          {sources.map((source) => (
            <div
              key={source.name}
              className="grid gap-2 py-5 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-6"
            >
              <h3 className="text-base font-semibold">{source.name}</h3>
              <div>
                <p>{source.used_for}</p>
                <p className="text-ink-muted mt-1 text-sm">{source.refreshes}</p>
              </div>
            </div>
          ))}
        </div>

        <h2 id="ai">How we use AI</h2>
        <p>
          Each city&apos;s overview, highlights and season notes are written by Google Gemini from a
          fixed prompt, then validated against a schema before they&apos;re stored. They carry an
          &ldquo;AI-written&rdquo; label and the date they were generated. AI never produces the
          live numbers — temperature, air quality, ratings and population always come straight from
          the providers above.
        </p>
        <p>
          When a briefing is missing or outdated, the guide shows the last good version while a
          fresh one is written, and falls back quietly if the AI service is unavailable.
          Visitor-triggered AI generation draws from a small daily budget of its own, so it can
          never exhaust the budget reserved for scheduled refreshes.
        </p>

        <h2 id="rankings">How rankings work</h2>
        <p>
          Every ranked guide states its scoring in plain language beside the list. Places within a
          city are ordered by their number of traveler reviews. The{" "}
          <Link href="/resources/top-cities#mixer">priorities mixer</Link> re-ranks the Top 250 in
          your browser from the same public metrics; your weights never leave the device.
        </p>

        <h2 id="privacy">Privacy &amp; analytics</h2>
        <p>
          We count pageviews and a short list of anonymous actions (such as &ldquo;saved a
          place&rdquo;) as aggregate totals. There are no accounts, no advertising trackers and no
          cross-site identifiers, and we honor Do Not Track. Country and city — derived from your
          connection, never your precise location — are recorded only if you opt in, and only as
          totals. Saved places, notes and plans are stored in your browser and never uploaded.
        </p>

        {/* US-12 + US-13: transparency for counters and partner links. */}
        <h2 id="counters">Counters &amp; partner links</h2>
        <p>
          &ldquo;Saved by&rdquo; counters on place cards are fully anonymous aggregates: we store
          only a per-place daily tally, never who saved what. No user identifiers, sessions, or IP
          addresses are recorded, and counts appear only once a place has been saved at least five
          times.
        </p>
        <p>
          Some stays include a clearly labelled <em>partner</em> link to a booking site. If you book
          through one, we may earn a commission at no extra cost to you. Partner links never
          influence rankings — ordering comes from the same public rating data as everything else —
          and we count only an anonymous total of clicks.
        </p>

        <h2 id="principles">Principles</h2>
        <ul>
          {principles.map((principle) => (
            <li key={principle}>{principle}</li>
          ))}
        </ul>
      </ProseLayout>
    </>
  );
}

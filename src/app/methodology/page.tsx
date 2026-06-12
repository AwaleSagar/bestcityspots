import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, Database, Sparkles } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { publicEnv } from "@/lib/env";

const siteUrl = (publicEnv().NEXT_PUBLIC_SITE_URL ?? "https://bestcityspots.com").replace(
  /\/$/,
  ""
);

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
    name: "Public city datasets",
    used_for: "Population, country, ISO codes, region/admin name, coordinates.",
    refreshes: "Static reference data; updated when upstream datasets release new revisions.",
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

export default function MethodologyPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutPageJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <main id="main-content" className="text-foreground min-h-screen bg-transparent">
        <div
          className="container-gutter mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20"
          style={{ paddingTop: "max(4rem, calc(env(safe-area-inset-top, 0px) + 5rem))" }}
        >
          <Breadcrumbs items={[{ label: "About", href: "/about" }, { label: "Methodology" }]} />

          <span className="eyebrow">
            <Sparkles className="text-accent h-3.5 w-3.5" aria-hidden />
            How we work
          </span>
          <h1 className="page-title text-foreground mt-6 max-w-2xl">
            Methodology &mdash; sources, refresh cadence, and AI attribution.
          </h1>
          <p className="lede mt-5 max-w-xl">
            We treat travel data like a public record: every metric on a city page traces back to a
            named provider, a refresh window, and a clear note about whether humans or AI assembled
            it.
          </p>

          <section aria-labelledby="sources-heading" className="mt-12">
            <h2
              id="sources-heading"
              className="text-muted text-xs font-semibold tracking-[0.22em] uppercase"
            >
              <Database className="text-accent mr-2 inline h-3.5 w-3.5" aria-hidden />
              Data sources
            </h2>
            <ul className="mt-4 space-y-4">
              {sources.map((source) => (
                <li key={source.name} className="border-line bg-surface/60 rounded-xl border p-5">
                  <h3 className="text-foreground text-base font-semibold">{source.name}</h3>
                  <p className="text-muted mt-2 text-sm leading-relaxed">{source.used_for}</p>
                  <p className="text-muted-strong mt-2 flex items-center gap-2 text-xs">
                    <Clock className="h-3.5 w-3.5" aria-hidden />
                    {source.refreshes}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {/* US-12 + US-13: transparency for counters and partner links. */}
          <section aria-labelledby="transparency-heading" className="mt-12">
            <h2
              id="transparency-heading"
              className="text-muted text-xs font-semibold tracking-[0.22em] uppercase"
            >
              <CheckCircle2 className="text-accent mr-2 inline h-3.5 w-3.5" aria-hidden />
              Counters &amp; partner links
            </h2>
            <div className="text-muted-strong mt-4 space-y-3 text-sm leading-relaxed">
              <p>
                &ldquo;Saved&rdquo; counters on place cards are fully anonymous aggregates: we store
                only a per-place daily tally, never who saved what. No user identifiers, sessions,
                or IP addresses are recorded, and counts are shown only once a place has been saved
                at least five times.
              </p>
              <p>
                Some stay listings include a clearly labeled <em>Partner</em> link to a booking
                site. If you book through one, we may earn a commission at no extra cost to you.
                Partner links never influence rankings — ordering comes from the same public rating
                data as everything else — and we count only an anonymous total of clicks.
              </p>
            </div>
          </section>

          <section aria-labelledby="principles-heading" className="mt-12">
            <h2
              id="principles-heading"
              className="text-muted text-xs font-semibold tracking-[0.22em] uppercase"
            >
              <CheckCircle2 className="text-accent mr-2 inline h-3.5 w-3.5" aria-hidden />
              Principles
            </h2>
            <ul className="mt-4 space-y-3">
              {principles.map((p) => (
                <li
                  key={p}
                  className="text-muted-strong border-line border-l-2 pl-4 text-sm leading-relaxed"
                >
                  {p}
                </li>
              ))}
            </ul>
          </section>

          <nav className="mt-12 flex flex-wrap gap-3" aria-label="Methodology navigation">
            <Link
              href="/about"
              className="border-line bg-background/65 text-muted-strong hover:text-foreground inline-flex items-center gap-3 rounded-full border px-4 py-3 text-xs font-bold tracking-[0.18em] uppercase transition-colors duration-300"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back to About
            </Link>
            <Link
              href="/resources/top-cities"
              className="border-line bg-background/65 text-muted-strong hover:text-foreground inline-flex items-center gap-3 rounded-full border px-4 py-3 text-xs font-bold tracking-[0.18em] uppercase transition-colors duration-300"
            >
              Browse city guides
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </nav>
        </div>
      </main>
    </>
  );
}

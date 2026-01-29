import type { Metadata } from "next";
import Link from "next/link";
import { getTopCities } from "@/lib/cities";
import { formatPopulation } from "@/lib/format";
import { ArrowLeft, MapPin } from "lucide-react";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bestcityspots.com";

export const metadata: Metadata = {
  title: "Top 50 Cities to Explore | Free City Guide",
  description:
    "A free curated list of the top 50 cities to explore—with quick links to full guides, metrics, and AI briefings. No sign-up required.",
  alternates: {
    canonical: "/resources/top-cities",
  },
  openGraph: {
    title: "Top 50 Cities to Explore | Best City Spots",
    description:
      "A free curated list of the top 50 cities to explore—with quick links to full guides. No sign-up required.",
    url: "/resources/top-cities",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Top 50 Cities to Explore | Best City Spots",
    description: "Free curated list of top cities with links to full guides.",
  },
};

export const revalidate = 86400;

export default async function TopCitiesPage() {
  const cities = await getTopCities(50);

  const itemListStructuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Top 50 Cities to Explore",
    description: "A curated list of the top 50 cities to explore, with links to full city guides.",
    numberOfItems: cities.length,
    itemListElement: cities.slice(0, 50).map((city, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Place",
        name: city.city,
        url: `${siteUrl}/cities/${city.id}`,
      },
    })),
  };

  return (
    <main
      id="main-content"
      className="min-h-screen bg-transparent font-sans text-foreground"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListStructuredData) }}
      />
      <div className="mx-auto max-w-3xl px-6 py-12">
        <nav className="mb-8 md:mb-12" aria-label="Breadcrumb">
          <Link
            href="/"
            className="group inline-flex items-center gap-3 text-foreground/50 transition-colors hover:text-foreground py-2"
          >
            <span className="liquid-glass flex h-10 w-10 items-center justify-center rounded-full border border-foreground/10 bg-foreground/[0.03] transition-colors group-hover:border-purple-500/40 group-hover:bg-purple-500/20">
              <ArrowLeft className="h-4 w-4" aria-hidden />
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">
              Back to Explorer
            </span>
          </Link>
        </nav>

        <header className="mb-12">
          <h1 className="text-4xl font-black tracking-tight text-foreground md:text-5xl">
            Top 50 Cities to Explore
          </h1>
          <p className="mt-4 text-base leading-relaxed text-foreground/70 md:text-lg">
            A free curated list of world cities with quick links to full guides, live metrics,
            and AI briefings. No sign-up required—just explore.
          </p>
        </header>

        <section aria-labelledby="cities-list-heading">
          <h2 id="cities-list-heading" className="sr-only">
            List of top 50 cities with links to city guides
          </h2>
          <ol className="space-y-2" start={1}>
            {cities.map((city, index) => (
              <li key={city.id}>
                <Link
                  href={`/cities/${city.id}?lat=${city.lat}&lng=${city.lng}`}
                  className="liquid-glass flex min-h-[56px] items-center gap-4 rounded-2xl border border-foreground/5 px-5 py-4 transition-colors hover:border-foreground/15 hover:bg-foreground/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <span
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-foreground/10 bg-foreground/[0.03] text-xs font-bold text-foreground/60"
                    aria-hidden
                  >
                    {index + 1}
                  </span>
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center text-foreground/40">
                    <MapPin className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 font-semibold text-foreground">
                    {city.city}
                  </span>
                  <span className="text-sm text-foreground/50">{city.country}</span>
                  <span className="text-right text-sm font-medium text-foreground/40">
                    {formatPopulation(city.population)}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-14 rounded-2xl border border-purple-500/20 bg-purple-500/5 p-8" aria-labelledby="cta-heading">
          <h2 id="cta-heading" className="text-sm font-black uppercase tracking-[0.2em] text-purple-300">
            Explore any city in depth
          </h2>
          <p className="mt-2 text-foreground/80">
            Each city has a full guide with metrics, AI briefings, and experiences. Start from the
            homepage or search by name.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-full border border-purple-400/40 bg-purple-500/20 px-6 py-3 text-sm font-bold text-foreground transition-colors hover:bg-purple-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
          >
            Go to Explorer
          </Link>
        </section>
      </div>
    </main>
  );
}

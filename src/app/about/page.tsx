import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Globe2, Radar, Shield, Sparkles } from "lucide-react";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bestcityspots.com";

export const metadata: Metadata = {
  title: "About Best City Spots",
  description:
    "Learn how Best City Spots blends urban intelligence, live data, and expert signals to help you choose your next destination.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "About Best City Spots",
    description:
      "Learn how Best City Spots blends urban intelligence, live data, and expert signals to help you choose your next destination.",
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
    title: "About Best City Spots",
    description:
      "Learn how Best City Spots blends urban intelligence, live data, and expert signals to help you choose your next destination.",
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
    <main
      id="main-content"
      className="min-h-screen bg-transparent font-sans text-foreground selection:bg-purple-500/30 selection:text-purple-200"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="mx-auto max-w-5xl px-6 py-12">
        <nav className="mb-8 md:mb-12">
          <Link
            href="/"
            className="group inline-flex items-center gap-3 md:gap-4 text-foreground/50 transition-colors duration-100 hover:text-foreground py-2"
          >
            <div className="liquid-glass flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full border border-foreground/10 bg-foreground/[0.03] transition-colors duration-100 group-hover:border-purple-500/40 group-hover:bg-purple-500/20">
              <ArrowLeft className="h-4 w-4 md:h-5 md:w-5 transition-transform group-hover:-translate-x-1" />
            </div>
            <span className="text-[10px] md:text-xs font-black tracking-[0.2em] uppercase">
              Return to Explorer
            </span>
          </Link>
        </nav>

        <header className="relative space-y-6 overflow-visible py-6">
          <div className="absolute -top-16 -right-10 -z-10 h-56 w-56 animate-pulse rounded-full bg-purple-600/10 blur-[120px]" />
          <div className="flex items-center gap-3 text-[10px] font-black tracking-[0.4em] text-purple-400 uppercase">
            <Sparkles className="h-4 w-4" />
            Atlas // Index 02
          </div>
          <h1 className="text-5xl leading-[1.1] font-black tracking-tighter text-foreground md:text-7xl">
            About Best City Spots
          </h1>
          <p className="max-w-2xl text-base md:text-lg leading-loose text-foreground/70">
            We combine trusted data sources, spatial intelligence, and human curation to help
            travelers find cities that fit their mood, budget, and rhythm. The goal is simple:
            make discovering your next destination feel effortless.
          </p>
        </header>

        <section className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {[
            {
              title: "Global Coverage",
              description:
                "A continuously refined map of world cities with fresh demographics and geography.",
              icon: Globe2,
            },
            {
              title: "Live Signals",
              description:
                "Climate, activity, and travel indicators are refreshed to reflect real-world shifts.",
              icon: Radar,
            },
            {
              title: "Responsible Intelligence",
              description:
                "We prioritize privacy and transparency when blending AI insights with source data.",
              icon: Shield,
            },
          ].map((item) => (
            <div
              key={item.title}
              className="liquid-glass flex flex-col gap-4 rounded-[2.5rem] border border-foreground/5 bg-foreground/[0.02] p-8 shadow-2xl"
            >
              <item.icon className="h-5 w-5 text-purple-300" />
              <div className="text-lg font-black tracking-tight text-foreground">
                {item.title}
              </div>
              <p className="text-sm leading-loose text-foreground/60">{item.description}</p>
            </div>
          ))}
        </section>

        <section className="mt-14 space-y-10">
          <div className="space-y-4">
            <h2 className="flex items-center gap-4 text-sm font-black tracking-[0.4em] text-foreground/40 uppercase">
              Our Mission <span className="h-px flex-1 bg-foreground/5" />
            </h2>
            <p className="text-base md:text-lg leading-loose text-foreground/70">
              Best City Spots exists to guide confident travel decisions. We highlight places that
              match your preferences, reduce time spent comparing scattered sources, and surface
              insights that travelers can actually use.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-[2.5rem] border border-foreground/5 bg-foreground/[0.02] p-8">
              <div className="text-xs font-black tracking-[0.3em] text-purple-300 uppercase">
                What We Track
              </div>
              <ul className="mt-6 space-y-4 text-sm text-foreground/70">
                <li>Population momentum and regional influence</li>
                <li>Climate comfort, air quality, and seasonal patterns</li>
                <li>Landmark density, cultural signals, and local momentum</li>
              </ul>
            </div>
            <div className="rounded-[2.5rem] border border-foreground/5 bg-foreground/[0.02] p-8">
              <div className="text-xs font-black tracking-[0.3em] text-purple-300 uppercase">
                How We Curate
              </div>
              <ul className="mt-6 space-y-4 text-sm text-foreground/70">
                <li>Blend AI context with verified data sources</li>
                <li>Filter for credibility, recency, and relevance</li>
                <li>Continuously learn from traveler behavior</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mt-14 rounded-[2.5rem] border border-purple-500/20 bg-purple-500/10 p-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs font-black tracking-[0.3em] text-purple-200 uppercase">
                Ready to Explore
              </div>
              <p className="mt-4 max-w-xl text-base md:text-lg leading-relaxed text-foreground/80">
                Dive into the atlas to compare cities, uncover hidden gems, and plan your next
                journey with confidence.
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-purple-400/40 bg-purple-500/20 px-6 py-3 text-xs font-black uppercase tracking-[0.2em] text-purple-100 transition-colors duration-100 hover:bg-purple-500/30"
            >
              Start Exploring
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

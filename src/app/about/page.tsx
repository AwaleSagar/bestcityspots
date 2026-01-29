import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Globe2, Radar, Shield, Sparkles, Heart, BookOpen } from "lucide-react";

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
    <main
      id="main-content"
      className="min-h-screen bg-transparent font-sans text-foreground selection:bg-purple-500/30 selection:text-purple-200"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div
        className="container-gutter mx-auto max-w-5xl px-4 py-12 sm:px-6"
        style={{ paddingTop: "max(3rem, calc(env(safe-area-inset-top, 0px) + 4rem))" }}
      >
        <nav className="mb-8 md:mb-12" aria-label="Breadcrumb">
          <Link
            href="/"
            className="group touch-target inline-flex min-h-[var(--touch-target-min)] items-center gap-3 text-foreground/50 transition-colors duration-100 hover:text-foreground md:gap-4 py-2"
          >
            <div className="liquid-glass flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-foreground/10 bg-foreground/[0.03] transition-colors duration-100 group-hover:border-purple-500/40 group-hover:bg-purple-500/20 md:h-12 md:w-12">
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
            make discovering your next destination feel effortless—with no paywalls and no dark
            patterns.
          </p>
        </header>

        <section className="mt-12 rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-6 sm:rounded-[2rem] sm:p-8" aria-labelledby="trust-principles-heading">
          <h2 id="trust-principles-heading" className="flex items-center gap-3 text-sm font-black uppercase tracking-[0.2em] text-foreground/50">
            <Heart className="h-4 w-4 text-purple-400" aria-hidden />
            Why we’re different
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2" role="list">
            <li className="flex gap-3 text-sm text-foreground/70">
              <span className="text-purple-400" aria-hidden>✓</span>
              <span><strong className="text-foreground/90">No paywalls.</strong> All city guides and the free Top 50 list are available without sign-up.</span>
            </li>
            <li className="flex gap-3 text-sm text-foreground/70">
              <span className="text-purple-400" aria-hidden>✓</span>
              <span><strong className="text-foreground/90">No dark patterns.</strong> We don’t use countdown timers, fake scarcity, or manipulative CTAs.</span>
            </li>
            <li className="flex gap-3 text-sm text-foreground/70">
              <span className="text-purple-400" aria-hidden>✓</span>
              <span><strong className="text-foreground/90">Transparent data.</strong> We clearly state what we track and how we curate; this page explains it.</span>
            </li>
            <li className="flex gap-3 text-sm text-foreground/70">
              <span className="text-purple-400" aria-hidden>✓</span>
              <span><strong className="text-foreground/90">Ethical AI.</strong> AI is used only to add context and summaries; core data comes from verified sources.</span>
            </li>
          </ul>
        </section>

        <section className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3" aria-labelledby="how-we-work-heading">
          <h2 id="how-we-work-heading" className="sr-only">How we work</h2>
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
              className="liquid-glass flex flex-col gap-4 rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6 shadow-2xl sm:rounded-[2.5rem] sm:p-8"
            >
              <item.icon className="h-5 w-5 text-purple-300" />
              <div className="text-lg font-black tracking-tight text-foreground">
                {item.title}
              </div>
              <p className="text-sm leading-loose text-foreground/60">{item.description}</p>
            </div>
          ))}
        </section>

        <section className="mt-14 space-y-10" aria-labelledby="mission-heading">
          <div className="space-y-4">
            <h2 id="mission-heading" className="flex items-center gap-4 text-sm font-black tracking-[0.4em] text-foreground/40 uppercase">
              Our Mission <span className="h-px flex-1 bg-foreground/5" />
            </h2>
            <p className="text-base md:text-lg leading-loose text-foreground/70">
              Best City Spots exists to guide confident travel decisions. We highlight places that
              match your preferences, reduce time spent comparing scattered sources, and surface
              insights that travelers can actually use—without gatekeeping or manipulation.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6 sm:rounded-[2.5rem] sm:p-8">
              <h3 className="text-xs font-black tracking-[0.3em] text-purple-300 uppercase">
                What We Track
              </h3>
              <ul className="mt-6 space-y-4 text-sm text-foreground/70">
                <li>Population momentum and regional influence</li>
                <li>Climate comfort, air quality, and seasonal patterns</li>
                <li>Landmark density, cultural signals, and local momentum</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-6 sm:rounded-[2.5rem] sm:p-8">
              <h3 className="text-xs font-black tracking-[0.3em] text-purple-300 uppercase">
                How We Curate
              </h3>
              <ul className="mt-6 space-y-4 text-sm text-foreground/70">
                <li>Blend AI context with verified data sources</li>
                <li>Filter for credibility, recency, and relevance</li>
                <li>Continuously learn from traveler behavior</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mt-14 rounded-2xl border border-purple-500/20 bg-purple-500/10 p-6 sm:rounded-[2.5rem] sm:p-10" aria-labelledby="cta-heading">
          <h2 id="cta-heading" className="text-xs font-black tracking-[0.3em] text-purple-200 uppercase">
            Ready to Explore
          </h2>
          <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="max-w-xl text-base md:text-lg leading-relaxed text-foreground/80">
                Dive into the atlas to compare cities, uncover hidden gems, and plan your next
                journey with confidence.
              </p>
              <p className="mt-3 text-sm text-foreground/60">
                Try our free <Link href="/resources/top-cities" className="font-semibold text-purple-300 underline underline-offset-2 hover:text-purple-200">Top 50 Cities guide</Link>—no sign-up required.
              </p>
            </div>
            <div className="flex flex-shrink-0 flex-wrap gap-3">
              <Link
                href="/resources/top-cities"
                className="touch-target inline-flex min-h-[var(--touch-target-min)] items-center gap-2 rounded-full border border-foreground/20 bg-foreground/[0.05] px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-foreground/80 transition-colors hover:bg-foreground/10"
              >
                <BookOpen className="h-4 w-4" aria-hidden />
                Free Guide
              </Link>
              <Link
                href="/"
                className="touch-target inline-flex min-h-[var(--touch-target-min)] items-center justify-center rounded-full border border-purple-400/40 bg-purple-500/20 px-6 py-3 text-xs font-black uppercase tracking-[0.2em] text-purple-100 transition-colors duration-100 hover:bg-purple-500/30"
              >
                Start Exploring
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

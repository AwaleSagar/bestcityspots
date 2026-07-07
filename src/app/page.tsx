import { fetchTrendingDestinations, fetchLivingIndexCities } from "@/app/actions";
import HeroHeader from "@/components/sections/HeroHeader";
import HomeSearchShowcase from "@/components/sections/HomeSearchShowcase";
import FreeResourceCTA from "@/components/sections/FreeResourceCTA";
import TrustIndicators from "@/components/sections/TrustIndicators";
import LivingIndex from "@/components/sections/LivingIndex";
import { Suspense } from "react";

export const metadata = {
  title: "Best City Spots: City Travel Guides with Live Weather & AI Insights",
  description:
    "City travel guides with live weather, neighborhood texture, and AI-assisted briefings — discover the best cities to visit and plan smarter, deliberate trips.",
  alternates: { canonical: "/" },
};

function HomeSearchShowcaseFallback() {
  return (
    <section
      role="status"
      aria-label="Loading city search"
      className="grid gap-10 pb-16 sm:pb-20 lg:grid-cols-[minmax(0,1.08fr)_minmax(20rem,0.92fr)] lg:items-start lg:gap-12 lg:pb-24"
    >
      <div className="lg:sticky lg:top-24">
        <div className="bg-muted/20 h-3 w-40 rounded-full" />
        <div className="bg-muted/20 mt-5 h-20 max-w-xl rounded-xl" />
        <div className="bg-muted/15 mt-4 h-12 max-w-lg rounded-lg" />
        <div className="border-line bg-surface/88 mt-7 h-16 rounded-2xl border shadow-sm" />
      </div>

      <div className="space-y-5">
        <div className="organic-panel rounded-2xl p-5 sm:p-6">
          <div className="bg-muted/20 h-7 w-36 rounded-full" />
          <div className="bg-muted/20 mt-4 h-16 max-w-md rounded-lg" />
          <div className="mt-6 space-y-3">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="border-line flex items-center gap-4 border-b py-3.5">
                <div className="bg-muted/20 h-3 w-5 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="bg-muted/20 h-5 w-32 rounded-full" />
                  <div className="bg-muted/15 h-4 w-48 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

async function HomeSearchShowcaseSection() {
  const topCities = await fetchTrendingDestinations();

  return <HomeSearchShowcase topCities={topCities} />;
}

/**
 * Living Index — the audience-demand band (redesign 2026 H2, B1 + §3).
 * Suspended so the weather fan-out never blocks the first viewport; the hero
 * and search CTA paint immediately and the index streams in below.
 */
function LivingIndexSection() {
  return (
    <Suspense fallback={<LivingIndexFallback />}>
      <LivingIndexAsync />
    </Suspense>
  );
}

async function LivingIndexAsync() {
  const cities = await fetchLivingIndexCities();
  return <LivingIndex cities={cities} />;
}

function LivingIndexFallback() {
  return (
    <section className="section-stack" aria-label="Loading featured cities">
      <div>
        <div className="bg-muted/20 h-3 w-28 rounded-full" />
        <div className="bg-muted/20 mt-3 h-9 w-72 rounded-xl" />
      </div>
      <ul className="card-grid" role="list">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i}>
            <div className="intent-card h-36 animate-pulse rounded-xl p-5">
              <div className="bg-muted/15 h-12 w-12 rounded-full" />
              <div className="bg-muted/15 mt-8 h-4 w-24 rounded-full" />
              <div className="bg-muted/10 mt-2 h-3 w-16 rounded-full" />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Home() {
  return (
    <main id="main-content" className="text-foreground min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* B1: one editorial scroll — hero → living index → search → trust/CTA.
            The search bar in the hero is the only coral moment above the fold. */}
        <HeroHeader />

        <div className="section-stack pb-14 md:pb-20">
          <LivingIndexSection />

          <Suspense fallback={<HomeSearchShowcaseFallback />}>
            <HomeSearchShowcaseSection />
          </Suspense>

          <TrustIndicators />
          <FreeResourceCTA />
        </div>
      </div>
    </main>
  );
}

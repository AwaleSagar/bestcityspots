import { fetchTrendingDestinations } from "@/app/actions";
import HeroHeader from "@/components/sections/HeroHeader";
import HomeSearchShowcase from "@/components/sections/HomeSearchShowcase";
import FreeResourceCTA from "@/components/sections/FreeResourceCTA";
import TrustIndicators from "@/components/sections/TrustIndicators";
import { Suspense } from "react";

export const metadata = {
  title: "Best City Spots: City Travel Guides with Live Weather & AI Insights",
  description:
    "City travel guides with live weather, neighborhood texture, and AI-assisted briefings — discover the best cities to visit and plan smarter, deliberate trips.",
  alternates: { canonical: "/" },
};

function HomeSearchShowcaseFallback() {
  return (
    <section className="grid gap-10 pb-16 sm:pb-20 lg:grid-cols-[minmax(0,1.08fr)_minmax(20rem,0.92fr)] lg:items-start lg:gap-12 lg:pb-24">
      <div className="lg:sticky lg:top-24">
        <div className="bg-muted/20 h-3 w-40 rounded-full" />
        <div className="bg-muted/20 mt-5 h-20 max-w-xl rounded-[1.2rem]" />
        <div className="bg-muted/15 mt-4 h-12 max-w-lg rounded-[1rem]" />
        <div className="border-line bg-surface/88 mt-7 h-16 rounded-[1.4rem] border shadow-sm" />
      </div>

      <div className="space-y-5">
        <div className="flow-grid">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="intent-card rounded-[1.25rem] p-4 sm:p-5">
              <div className="bg-muted/20 h-4 w-4 rounded-full" />
              <div className="bg-muted/20 mt-4 h-5 w-28 rounded-full" />
              <div className="bg-muted/15 mt-3 h-10 rounded-[0.8rem]" />
            </div>
          ))}
        </div>

        <div className="organic-panel rounded-[1.6rem] p-5 sm:p-6">
          <div className="bg-muted/20 h-7 w-36 rounded-full" />
          <div className="bg-muted/20 mt-4 h-16 max-w-md rounded-[1rem]" />
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

export default function Home() {
  return (
    <main id="main-content" className="text-foreground min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <HeroHeader />

        <Suspense fallback={<HomeSearchShowcaseFallback />}>
          <HomeSearchShowcaseSection />
        </Suspense>

        <div className="space-y-12 pb-14 sm:space-y-14 md:space-y-16 md:pb-20">
          <TrustIndicators />
          <FreeResourceCTA />
        </div>
      </div>
    </main>
  );
}

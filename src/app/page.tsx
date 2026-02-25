import { fetchTrendingDestinations } from "@/app/actions";
import CitySearch from "@/components/features/city/CitySearch";
import HeroHeader from "@/components/sections/HeroHeader";
import TrustIndicators from "@/components/sections/TrustIndicators";
import TestimonialsSection from "@/components/sections/TestimonialsSection";
import FreeResourceCTA from "@/components/sections/FreeResourceCTA";

export const metadata = {
  title: "Best City Spots | Curated City Experiences for Modern Explorers",
  description: "Discover hidden gems, plan smarter trips, and explore the world's most vibrant cities with curated guides and AI-powered insights.",
};

export default async function Home() {
  const topCities = await fetchTrendingDestinations();

  return (
    <main id="main-content" className="min-h-screen bg-transparent font-sans text-foreground">
      <div
        className="container-gutter mx-auto max-w-5xl px-4 sm:px-6"
        style={{ paddingTop: "max(2rem, calc(env(safe-area-inset-top, 0px) + 3rem))" }}
      >
        <HeroHeader />

        {/* Search Experience */}
        <div className="mx-auto max-w-3xl">
          <CitySearch topCities={topCities} />
        </div>

        {/* Trust & Features */}
        <div className="mt-32 space-y-32 content-lazy md:mt-40 md:space-y-40">
          <TrustIndicators />
          <FreeResourceCTA />
          <TestimonialsSection />
        </div>
      </div>
    </main>
  );
}

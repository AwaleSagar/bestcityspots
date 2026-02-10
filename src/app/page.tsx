import { fetchTrendingDestinations } from "@/app/actions";
import CitySearch from "@/components/features/city/CitySearch";
import HeroHeader from "@/components/sections/HeroHeader";
import TrustIndicators from "@/components/sections/TrustIndicators";
import TestimonialsSection from "@/components/sections/TestimonialsSection";
import FreeResourceCTA from "@/components/sections/FreeResourceCTA";

export const metadata = {
  title: "Best City Spots | Urban Intelligence & Discovery",
  description: "Explore the world's most vibrant cities with real-time data, AI-driven insights, and premium urban intelligence.",
};

export default async function Home() {
  // Fetch trending cities on the server for better SEO and initial load performance
  const topCities = await fetchTrendingDestinations();

  return (
    <main id="main-content" className="min-h-screen bg-transparent font-sans text-foreground">
      <div
        className="container-gutter mx-auto max-w-2xl py-12 px-4 sm:px-6"
        style={{ paddingTop: "max(3rem, calc(env(safe-area-inset-top, 0px) + 4rem))" }}
      >
        <HeroHeader />

        {/* Search Experience */}
        <CitySearch topCities={topCities} />

        {/* Social Proof & Trust */}
        <div className="mt-20 space-y-20 content-lazy">
          <TrustIndicators />
          <FreeResourceCTA />
          <TestimonialsSection />
        </div>
      </div>
    </main>
  );
}

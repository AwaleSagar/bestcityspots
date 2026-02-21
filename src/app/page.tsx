import { fetchTrendingDestinations } from "@/app/actions";
import CitySearch from "@/components/features/city/CitySearch";
import HeroHeader from "@/components/sections/HeroHeader";
import CuratedTrails from "@/components/sections/CuratedTrails";
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
    <main id="main-content" className="grid-layout-full-bleed min-h-screen bg-transparent font-sans text-foreground">
      {/* Full-bleed hero with video background */}
      <HeroHeader />

      <div
        className="container-gutter mx-auto max-w-3xl px-4 sm:px-6"
        style={{ paddingTop: "var(--space-12)" }}
      >
        {/* Predictive Search Experience */}
        <CitySearch topCities={topCities} />

        {/* Curated Trails — swipe-friendly horizontal scroll */}
        {topCities.length > 0 && (
          <div style={{ marginTop: "var(--space-16)" }}>
            <CuratedTrails cities={topCities} />
          </div>
        )}

        {/* Trust & Features */}
        <div className="mt-24 space-y-24 content-lazy">
          <TrustIndicators />
          <FreeResourceCTA />
          <TestimonialsSection />
        </div>
      </div>
    </main>
  );
}

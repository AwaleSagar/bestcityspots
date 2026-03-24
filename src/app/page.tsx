import { fetchTrendingDestinations } from "@/app/actions";
import HeroHeader from "@/components/sections/HeroHeader";
import HomeSearchShowcase from "@/components/sections/HomeSearchShowcase";
import TrustIndicators from "@/components/sections/TrustIndicators";
import TestimonialsSection from "@/components/sections/TestimonialsSection";
import FreeResourceCTA from "@/components/sections/FreeResourceCTA";

export const metadata = {
  title: "Best City Spots | City Intelligence for Deliberate Travel",
  description:
    "Discover cities through an editorial atlas of live signals, neighborhood texture, and AI-assisted travel briefings.",
};

export default async function Home() {
  const topCities = await fetchTrendingDestinations();

  return (
    <main id="main-content" className="text-foreground min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <HeroHeader />

        <HomeSearchShowcase topCities={topCities} />

        <div className="space-y-16 pb-16 sm:space-y-20 md:space-y-24 md:pb-24">
          <TrustIndicators />
          <FreeResourceCTA />
          <TestimonialsSection />
        </div>
      </div>
    </main>
  );
}

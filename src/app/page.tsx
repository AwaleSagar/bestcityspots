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
    <main id="main-content" className="text-foreground min-h-screen bg-transparent">
      <div
        className="container-gutter mx-auto max-w-7xl px-4 sm:px-6"
        style={{ paddingTop: "max(1.5rem, calc(env(safe-area-inset-top, 0px) + 2rem))" }}
      >
        <HeroHeader />

        <HomeSearchShowcase topCities={topCities} />

        <div className="content-lazy mb-16 space-y-16 md:mb-24 md:space-y-24">
          <TrustIndicators />
          <FreeResourceCTA />
          <TestimonialsSection />
        </div>
      </div>
    </main>
  );
}

import { fetchTrendingDestinations } from "@/app/actions";
import HeroHeader from "@/components/sections/HeroHeader";
import HomeSearchShowcase from "@/components/sections/HomeSearchShowcase";
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

        <div className="space-y-12 pb-14 sm:space-y-14 md:space-y-16 md:pb-20">
          <FreeResourceCTA />
        </div>
      </div>
    </main>
  );
}

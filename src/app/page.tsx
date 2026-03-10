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
        className="container-gutter mx-auto max-w-6xl px-4 sm:px-6"
        style={{ paddingTop: "max(1.75rem, calc(env(safe-area-inset-top, 0px) + 2.75rem))" }}
      >
        <HeroHeader />

        <section className="grid gap-8 pb-24 pt-10 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:items-start lg:gap-12 lg:pb-32 lg:pt-14">
          <div className="space-y-5 lg:sticky lg:top-28">
            <span className="section-heading">Start with intent</span>
            <h2 className="max-w-sm text-[clamp(2rem,5vw,3.4rem)] leading-[0.96] text-foreground">
              Search like you already know how you want the trip to feel.
            </h2>
            <p className="max-w-md text-sm leading-relaxed text-muted md:text-base">
              Type a city, browse trending metros, or jump straight into the Top 50 index. The search flow stays fast, but the framing is calmer and easier to use on a phone.
            </p>
          </div>

          <div className="rounded-[2rem] border border-line bg-surface/68 p-4 shadow-xl backdrop-blur-xl md:p-6 lg:rounded-[2.5rem]">
            <CitySearch topCities={topCities} />
          </div>
        </section>

        <div className="mb-28 space-y-28 content-lazy md:mb-36 md:space-y-36">
          <TrustIndicators />
          <FreeResourceCTA />
          <TestimonialsSection />
        </div>
      </div>
    </main>
  );
}

import { Suspense } from "react";
import { Container } from "@/components/ui/Container";
import { BrowseCountries } from "@/components/home/BrowseCountries";
import { HomeHero } from "@/components/home/HomeHero";
import { HowItsBuilt } from "@/components/home/HowItsBuilt";
import { OpeningNow, OpeningNowFallback } from "@/components/home/OpeningNow";
import { StartWithAQuestion } from "@/components/home/StartWithAQuestion";

export const metadata = {
  title: "Best City Spots: City Travel Guides with Live Weather & AI Insights",
  description:
    "City travel guides with live weather, neighborhood texture, and AI-assisted briefings — discover the best cities to visit and plan smarter, deliberate trips.",
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <main id="main-content">
      <HomeHero />
      <Container className="space-y-20 py-16 sm:space-y-24 sm:py-20">
        <Suspense fallback={<OpeningNowFallback />}>
          <OpeningNow />
        </Suspense>
        <StartWithAQuestion />
        <Suspense fallback={null}>
          <BrowseCountries />
        </Suspense>
        <HowItsBuilt />
      </Container>
    </main>
  );
}

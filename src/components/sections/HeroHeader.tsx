import type { CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import HeroSearchCTA from "@/components/sections/HeroSearchCTA";
import HeroBackground from "@/components/sections/HeroBackground";

// Server component: the entrance stagger is pure CSS (`.animate-fade-up` +
// --fade-up-delay), so no framer-motion ships in the first viewport.
const fadeDelay = (seconds: number): CSSProperties =>
  ({ "--fade-up-delay": `${seconds}s` }) as CSSProperties;

export default function HeroHeader() {
  return (
    <header className="organic-section relative isolate overflow-hidden rounded-3xl px-5 pt-10 pb-6 sm:px-8 sm:pt-14 md:px-10 md:pt-18 lg:pt-24">
      <HeroBackground />
      <div className="max-w-4xl">
        <p className="editorial-kicker animate-fade-up" style={fadeDelay(0.1)}>
          City Intelligence &middot; Organic Atlas
        </p>

        <h1
          className="page-title text-foreground animate-fade-up mt-5 max-w-4xl sm:mt-7"
          style={fadeDelay(0.18)}
        >
          Choose your next city by feeling, facts, and timing.
        </h1>

        <p className="lede animate-fade-up mt-5 max-w-2xl sm:mt-6" style={fadeDelay(0.26)}>
          Best City Spots turns live weather, local places, AI-assisted narrative, and practical
          planning cues into a calm atlas for deliberate travel.
        </p>

        <div
          className="animate-fade-up mt-7 flex flex-col gap-3 sm:mt-9 sm:flex-row sm:items-center"
          style={fadeDelay(0.34)}
        >
          <HeroSearchCTA />
          <Link href="/resources/top-cities" className="btn-secondary group">
            Browse The Global 50
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

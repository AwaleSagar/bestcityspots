import type { CSSProperties } from "react";
import { ArrowRight, Compass, Leaf, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import HeroSearchCTA from "@/components/sections/HeroSearchCTA";

// Server component: the entrance stagger is pure CSS (`.animate-fade-up` +
// --fade-up-delay), so no framer-motion ships in the first viewport.
const fadeDelay = (seconds: number): CSSProperties =>
  ({ "--fade-up-delay": `${seconds}s` }) as CSSProperties;

const signalItems = [
  { icon: Leaf, label: "Live city signals" },
  { icon: Sparkles, label: "AI-labeled briefings" },
  { icon: ShieldCheck, label: "Visible sources" },
] as const;

export default function HeroHeader() {
  return (
    <header className="organic-section pt-10 pb-6 sm:pt-14 md:pt-18 lg:pt-24">
      <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,1.12fr)_minmax(20rem,0.88fr)] lg:gap-12">
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

        <aside
          className="organic-panel organic-blob-inverse animate-fade-up p-[var(--space-fluid-panel)]"
          style={fadeDelay(0.3)}
          aria-label="Best City Spots intelligence model"
        >
          <div className="flex items-start gap-3">
            <div className="border-line flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border bg-[color:var(--color-leaf-soft)]">
              <Compass className="h-5 w-5 text-[color:var(--color-leaf)]" aria-hidden />
            </div>
            <div>
              <p className="text-muted text-xs font-semibold tracking-[0.18em] uppercase">
                Intent map
              </p>
              {/* US-04: list only shipped capabilities. Re-add "comparison" /
                  "planning" when US-07 / US-10 ship. */}
              <h2 className="text-foreground mt-2 text-2xl leading-none sm:text-3xl">
                Discovery, live signals, local context.
              </h2>
            </div>
          </div>

          <div className="mt-7 grid gap-3">
            {signalItems.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="border-line flex items-center justify-between gap-4 border-t pt-3"
              >
                <span className="text-muted-strong flex items-center gap-2 text-sm font-semibold">
                  <Icon className="text-accent h-4 w-4" aria-hidden />
                  {label}
                </span>
                <span className="source-chip">On</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </header>
  );
}

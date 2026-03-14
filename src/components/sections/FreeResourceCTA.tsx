"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, MapPinned, Users2, Wallet } from "lucide-react";
import ScrollReveal from "@/components/ui/ScrollReveal";

const guideHighlights = [
  { icon: MapPinned, text: "50 ranked cities", color: "text-accent" },
  { icon: Users2, text: "Population context", color: "text-[color:var(--color-cat-stays)]" },
  { icon: Wallet, text: "Fast planning cues", color: "text-[color:var(--color-brand-accent)]" },
];

export default function FreeResourceCTA() {
  return (
    <section className="mx-auto max-w-7xl" aria-labelledby="free-resource-heading">
      <ScrollReveal animation="fade-up">
        <div className="atlas-panel-strong rounded-[2.2rem] p-5 md:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] lg:items-end">
            <div>
              <span className="eyebrow">Free Reference Guide</span>
              <h2
                id="free-resource-heading"
                className="text-foreground mt-5 max-w-3xl text-[clamp(2.2rem,4vw,4.2rem)] leading-[0.92]"
              >
                Start broad with The Global 50, then dive into individual city desks when the
                shortlist tightens.
              </h2>
              <p className="text-muted mt-2 max-w-2xl text-xs leading-6">
                Our 50 most-searched cities, ranked and reviewed.
              </p>
              <p className="text-muted mt-4 max-w-2xl text-sm leading-7 md:text-base">
                The guide works like a quick editorial index. It gives you the major cities in one
                sweep, then routes you into the richer city pages with weather, metrics, and saved
                planning notes.
              </p>

              <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                <Link href="/resources/top-cities" className="btn-primary group">
                  <BookOpen className="h-4 w-4" />
                  Open The Global 50
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <span className="text-muted text-sm">No sign-up required</span>
              </div>
            </div>

            <div className="atlas-frame rounded-[1.8rem] p-5 md:p-6">
              <div className="labelled-rule">Inside The Edition</div>
              <div className="mt-5 grid gap-3">
                {guideHighlights.map(({ icon: Icon, text, color }) => (
                  <div key={text} className="flex items-center gap-3 py-2">
                    <Icon className={`h-4 w-4 shrink-0 ${color}`} aria-hidden />
                    <span className="text-muted-strong text-sm font-medium">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}

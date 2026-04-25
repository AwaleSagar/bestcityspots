"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, MapPinned, Users2, Wallet } from "lucide-react";
import ScrollReveal from "@/components/ui/ScrollReveal";

const guideHighlights = [
  { icon: MapPinned, text: "50 ranked cities" },
  { icon: Users2, text: "Population context" },
  { icon: Wallet, text: "Fast planning cues" },
];

export default function FreeResourceCTA() {
  return (
    <section className="mx-auto max-w-7xl" aria-labelledby="free-resource-heading">
      <ScrollReveal animation="fade-up">
        <div className="organic-panel rounded-[1.8rem] p-6 sm:rounded-[2.2rem] sm:p-8 md:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div>
              <p className="source-chip">Free reference guide</p>
              <h2
                id="free-resource-heading"
                className="text-foreground mt-3 max-w-xl text-[clamp(1.8rem,3.5vw,3rem)] leading-[1.05]"
              >
                Start broad with The Global 50, then dive into individual city guides.
              </h2>
              <p className="text-muted mt-3 max-w-lg text-sm leading-relaxed md:text-base">
                A quick editorial index of the most-searched cities, ranked and reviewed. Routes you
                into richer city pages with weather, metrics, and planning notes.
              </p>

              <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                <Link href="/resources/top-cities" className="btn-primary group">
                  <BookOpen className="h-4 w-4" />
                  Open The Global 50
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <span className="text-muted text-sm">No sign-up required</span>
              </div>
            </div>

            <div className="border-line bg-surface/78 rounded-[1.25rem] border p-5">
              <p className="text-muted text-xs font-medium tracking-wider uppercase">
                Inside The Edition
              </p>
              <div className="mt-3 space-y-2">
                {guideHighlights.map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-3 py-1.5">
                    <Icon className="text-muted h-4 w-4 shrink-0" aria-hidden />
                    <span className="text-foreground text-sm font-medium">{text}</span>
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

"use client";

import Link from "next/link";
import { BookOpen, ArrowRight, MapPin, Star, Wallet } from "lucide-react";
import { motion } from "framer-motion";
import ScrollReveal from "@/components/ui/ScrollReveal";

const guideHighlights = [
  { icon: MapPin, text: "50 curated cities" },
  { icon: Star, text: "Top attractions" },
  { icon: Wallet, text: "Budget-friendly picks" },
] as const;

export default function FreeResourceCTA() {
  return (
    <section
      className="mx-auto max-w-6xl"
      aria-labelledby="free-resource-heading"
    >
      <ScrollReveal animation="fade-up">
        <div className="noise-overlay relative overflow-hidden rounded-[2rem] border border-line bg-surface/70 p-6 shadow-3xl backdrop-blur-xl md:rounded-[2.75rem] md:p-10 lg:p-12">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -left-10 top-0 h-44 w-44 rounded-full bg-[color:var(--liquid-glow-1)] blur-[100px]" />
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.06, 0.12, 0.06] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute bottom-0 right-0 h-48 w-48 rounded-full bg-[color:var(--liquid-glow-2)] blur-[80px]"
            />
          </div>

          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.88fr)] lg:items-end lg:gap-12">
            <div>
              <span className="badge-featured mb-5 inline-flex rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em]">
                Free Guide
              </span>

              <h2
                id="free-resource-heading"
                className="max-w-xl text-[clamp(2rem,5vw,3.6rem)] leading-[0.96] text-foreground"
              >
                Start broad, then narrow the shortlist with a sharper city index.
              </h2>

              <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted md:text-base">
                The Top 50 guide works like an editorial front door into the atlas: major cities first, then the deeper city pages when you are ready to compare climate, momentum, and experiences.
              </p>

              <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                <Link href="/resources/top-cities" className="btn-primary group">
                  <BookOpen className="h-4 w-4" aria-hidden />
                  Explore the Guide
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
                </Link>
                <div className="rounded-full border border-line bg-background/40 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                  No sign-up required
                </div>
              </div>
            </div>

            <div className="rounded-[1.8rem] border border-line bg-background/40 p-5 shadow-sm backdrop-blur-md md:p-6">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted">Inside the guide</span>
                <span className="text-3xl font-semibold tracking-[-0.04em] text-foreground">50</span>
              </div>

              <div className="mb-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {guideHighlights.map(({ icon: Icon, text }) => (
                <div
                  key={text}
                  className="flex items-center gap-2 rounded-2xl border border-line bg-surface/70 px-4 py-3 text-xs font-semibold text-muted-strong"
                >
                  <Icon className="h-3.5 w-3.5 text-accent" aria-hidden />
                  {text}
                </div>
              ))}
              </div>

              <p className="text-sm leading-relaxed text-muted">
                Rankings, entry-point recommendations, and fast access to full guides for the cities that matter most when you are planning from a small screen.
              </p>
            </div>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}

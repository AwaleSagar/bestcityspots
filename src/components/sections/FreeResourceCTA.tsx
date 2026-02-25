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
      className="mx-auto max-w-5xl px-4 sm:px-6"
      aria-labelledby="free-resource-heading"
    >
      <ScrollReveal animation="fade-up">
        <div className="noise-overlay relative overflow-hidden rounded-[2rem] border border-purple-500/12 bg-gradient-to-br from-purple-500/[0.06] via-purple-500/[0.02] to-transparent p-10 text-center md:rounded-[2.5rem] md:p-16">
          {/* Ambient glows */}
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute top-0 right-1/4 h-56 w-56 rounded-full bg-purple-500/[0.08] blur-[100px]" />
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.05, 0.1, 0.05] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute bottom-0 left-1/4 h-48 w-48 rounded-full bg-amber-500/[0.06] blur-[80px]"
            />
          </div>

          <div className="relative">
            <span className="badge-featured mb-6 inline-flex rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em]">
              Free Guide
            </span>

            <h2
              id="free-resource-heading"
              className="mb-4 text-2xl font-bold tracking-[-0.02em] text-foreground/90 md:text-3xl"
            >
              Your next adventure starts here
            </h2>

            <p className="mx-auto mb-8 max-w-md text-sm leading-relaxed text-foreground/45 md:text-base">
              50 handpicked cities with insider tips, budget planning, and quick links to full guides. No sign-up required.
            </p>

            <div className="mb-10 flex flex-wrap items-center justify-center gap-3">
              {guideHighlights.map(({ icon: Icon, text }) => (
                <div
                  key={text}
                  className="flex items-center gap-2 rounded-full border border-purple-500/12 bg-purple-500/[0.04] px-4 py-2.5 text-xs font-medium text-purple-300/70"
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {text}
                </div>
              ))}
            </div>

            <Link
              href="/resources/top-cities"
              className="btn-primary group"
            >
              <BookOpen className="h-4 w-4" aria-hidden />
              Explore the Guide
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </Link>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}

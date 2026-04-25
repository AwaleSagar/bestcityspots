"use client";

import { Eye, Route, ShieldCheck, BookOpenText, Wallet, Sparkles } from "lucide-react";
import ScrollReveal from "@/components/ui/ScrollReveal";

const principles = [
  {
    icon: Eye,
    title: "Read first, compare second",
    text: "Get the tone of a place before the metric grid starts competing for attention.",
  },
  {
    icon: Route,
    title: "Planning cues stay close",
    text: "Attractions, restaurants, and hotels stay near the briefing instead of hiding behind extra routes.",
  },
  {
    icon: ShieldCheck,
    title: "The product explains itself",
    text: "Clear labels, honest copy, and visible source framing reduce anxiety.",
  },
];

const outcomes = [
  {
    icon: BookOpenText,
    title: "Editorial tone",
    text: "Reads like a field guide rather than a dashboard.",
  },
  {
    icon: Wallet,
    title: "Faster planning",
    text: "Search, briefings, and actions grouped around the same moment.",
  },
  {
    icon: Sparkles,
    title: "Distinctive brand",
    text: "Clean typography and calm layout give the site a recognizable signature.",
  },
];

export default function TestimonialsSection() {
  return (
    <section className="mx-auto max-w-7xl" aria-labelledby="highlights-heading">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <ScrollReveal animation="fade-up">
          <div className="lg:sticky lg:top-24">
            <p className="text-muted text-xs font-medium tracking-wider uppercase">Use The Atlas</p>
            <h2
              id="highlights-heading"
              className="text-foreground mt-3 max-w-md text-[clamp(1.8rem,3.5vw,3rem)] leading-[1.05]"
            >
              Designed for real trip decisions.
            </h2>
            <p className="text-muted mt-3 text-sm leading-relaxed md:text-base">
              Quieter defaults, stronger headlines, and better sequencing from search to context to
              action.
            </p>
          </div>
        </ScrollReveal>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {principles.map(({ icon: Icon, title, text }, index) => (
              <ScrollReveal
                key={title}
                animation="fade-up"
                staggerIndex={index}
                staggerDelay={0.08}
              >
                <article className="border-line rounded-xl border p-4 sm:p-5">
                  <Icon className="text-muted h-5 w-5" aria-hidden />
                  <h3 className="text-foreground mt-3 text-sm leading-snug font-medium">{title}</h3>
                  <p className="text-muted mt-1 text-sm leading-relaxed">{text}</p>
                </article>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal animation="fade-up" delay={0.15}>
            <div className="border-line rounded-xl border p-5 sm:p-6">
              <p className="text-muted text-xs font-medium tracking-wider uppercase">
                What Changes
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {outcomes.map(({ icon: Icon, title, text }) => (
                  <div key={title}>
                    <div className="text-muted flex items-center gap-2 text-sm font-medium">
                      <Icon className="h-4 w-4" aria-hidden />
                      {title}
                    </div>
                    <p className="text-muted mt-1 text-sm leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}

"use client";

import { BookOpenText, Eye, Route, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import ScrollReveal from "@/components/ui/ScrollReveal";

const principles = [
  {
    icon: Eye,
    title: "Read first, compare second",
    text: "Open a city and get the tone of the place before the metric grid starts competing for attention.",
    color: "text-[color:var(--color-brand-secondary)]" as const,
  },
  {
    icon: Route,
    title: "Planning cues stay close to the surface",
    text: "Attractions, restaurant saves, and hotel options stay near the briefing instead of hiding behind extra routes.",
    color: "text-[color:var(--color-cat-dining)]" as const,
  },
  {
    icon: ShieldCheck,
    title: "The product explains itself",
    text: "Clear labels, honest copy, and visible source framing reduce anxiety without adding tutorial clutter.",
    color: "text-accent" as const,
  },
];

const outcomes = [
  {
    icon: BookOpenText,
    title: "Editorial tone",
    text: "The interface now reads like a field guide rather than a glassy SaaS dashboard.",
    color: "text-accent" as const,
  },
  {
    icon: Wallet,
    title: "Faster trip planning",
    text: "Search, briefings, and shortlist actions are grouped around the same decision moment.",
    color: "text-[color:var(--color-brand-accent)]" as const,
  },
  {
    icon: Sparkles,
    title: "Distinctive brand memory",
    text: "Paper tones, serif headlines, and transit-inspired details give the site a recognizable signature.",
    color: "text-[color:var(--color-brand-secondary)]" as const,
  },
];

export default function TestimonialsSection() {
  return (
    <section className="mx-auto max-w-7xl" aria-labelledby="highlights-heading">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-8">
        <ScrollReveal animation="fade-up">
          <div className="atlas-frame rounded-[1.4rem] p-5 sm:rounded-[1.8rem] md:rounded-[2rem] md:p-7 lg:sticky lg:top-24">
            <span className="section-heading">Use The Atlas</span>
            <h2
              id="highlights-heading"
              className="text-foreground mt-5 max-w-lg text-[clamp(2.1rem,3.8vw,3.8rem)] leading-[0.92]"
            >
              The experience is designed to feel composed enough for real trip decisions.
            </h2>
            <p className="text-muted mt-4 text-sm leading-7 md:text-base">
              The redesign leans into rhythm and contrast: quieter defaults, stronger headlines, and
              better sequencing from search to context to action.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid gap-5">
          <div className="grid gap-4 md:grid-cols-3">
            {principles.map(({ icon: Icon, title, text, color }, index) => (
              <ScrollReveal
                key={title}
                animation="fade-up"
                staggerIndex={index}
                staggerDelay={0.12}
              >
                <article className="atlas-panel rounded-[1.1rem] p-4 sm:rounded-[1.3rem] sm:p-5 md:rounded-[1.4rem]">
                  <Icon className={`h-5 w-5 ${color}`} aria-hidden />
                  <h3 className="text-foreground mt-4 text-xl leading-tight">{title}</h3>
                  <p className="text-muted mt-2 text-sm leading-7">{text}</p>
                </article>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal animation="fade-up" delay={0.2}>
            <div className="atlas-frame rounded-[1.1rem] p-4 sm:rounded-[1.3rem] sm:p-5 md:rounded-[1.4rem] md:p-6">
              <div className="labelled-rule">What The Direction Changes</div>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {outcomes.map(({ icon: Icon, title, text, color }) => (
                  <div key={title} className="py-2">
                    <div className="text-muted flex items-center gap-2 text-sm font-medium">
                      <Icon className={`h-4 w-4 ${color}`} aria-hidden />
                      {title}
                    </div>
                    <p className="text-muted-strong mt-2 text-sm leading-7">{text}</p>
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

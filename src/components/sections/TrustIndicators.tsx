"use client";

import { Globe2, Radar, ShieldCheck, Waypoints } from "lucide-react";
import ScrollReveal from "@/components/ui/ScrollReveal";

const pillars = [
  {
    icon: Globe2,
    title: "Global coverage with local texture",
    detail:
      "Cities, metros, and recognizable travel hubs are searchable from the same entry point.",
    iconColor: "text-[color:var(--color-brand-secondary)]" as const,
  },
  {
    icon: Radar,
    title: "Live context, not static brochure copy",
    detail:
      "Weather and air quality change with the moment, so the guide reflects current conditions.",
    iconColor: "text-[color:var(--color-cat-dining)]" as const,
  },
  {
    icon: ShieldCheck,
    title: "Methodology shown in plain language",
    detail:
      "Sources stay visible and the AI layer is clearly framed as assisted synthesis, not hidden authority.",
    iconColor: "text-accent" as const,
  },
];

export default function TrustIndicators() {
  return (
    <section className="mx-auto max-w-7xl" aria-labelledby="trust-heading">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <ScrollReveal animation="fade-up">
          <div className="lg:sticky lg:top-24">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">Trust Signals</p>
            <h2
              id="trust-heading"
              className="text-foreground mt-3 max-w-md text-[clamp(1.8rem,3.5vw,3rem)] leading-[1.05]"
            >
              Credibility shows up in the reading experience.
            </h2>
            <p className="text-muted mt-3 max-w-md text-sm leading-relaxed md:text-base">
              The interface makes it obvious what is live, what is editorial, and what is
              machine-assisted.
            </p>
          </div>
        </ScrollReveal>

        <div className="space-y-4">
          {pillars.map(({ icon: Icon, title, detail, iconColor }, index) => (
            <ScrollReveal key={title} animation="fade-up" staggerIndex={index} staggerDelay={0.08}>
              <article className="rounded-xl border border-line p-5">
                <div className="flex items-start gap-3">
                  <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconColor}`} aria-hidden />
                  <div>
                    <h3 className="text-foreground text-base font-medium leading-snug">
                      {title}
                    </h3>
                    <p className="text-muted mt-1 text-sm leading-relaxed">{detail}</p>
                  </div>
                </div>
              </article>
            </ScrollReveal>
          ))}

          <ScrollReveal animation="fade-up" delay={0.2}>
            <div className="rounded-xl border border-line p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-muted">Verification</p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {[
                  "Google Places verified",
                  "Public weather sources",
                  "Explicit AI labeling",
                  "No paywall gates",
                ].map((item) => (
                  <li key={item} className="text-muted flex items-center gap-2 text-sm">
                    <Waypoints className="text-accent h-3.5 w-3.5 shrink-0" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}

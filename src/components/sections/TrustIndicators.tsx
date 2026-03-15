"use client";

import { Globe2, Radar, ShieldCheck, Waypoints } from "lucide-react";
import ScrollReveal from "@/components/ui/ScrollReveal";

const pillars = [
  {
    icon: Globe2,
    title: "Global coverage with local texture",
    stat: "10,000+",
    detail:
      "Cities, metros, and recognizable travel hubs are searchable from the same entry point.",
    iconColor: "text-[color:var(--color-brand-secondary)]" as const,
    iconBg: "bg-[color:var(--color-cat-stays-soft)]" as const,
    iconBorder:
      "border-[color:color-mix(in_oklab,var(--color-brand-secondary)_18%,transparent)]" as const,
  },
  {
    icon: Radar,
    title: "Live context, not static brochure copy",
    stat: "24/7",
    detail:
      "Weather and air quality change with the moment, so the guide reflects current conditions.",
    iconColor: "text-[color:var(--color-cat-dining)]" as const,
    iconBg: "bg-[color:var(--color-cat-dining-soft)]" as const,
    iconBorder:
      "border-[color:color-mix(in_oklab,var(--color-cat-dining)_18%,transparent)]" as const,
  },
  {
    icon: ShieldCheck,
    title: "Methodology shown in plain language",
    stat: "Open",
    detail:
      "Sources stay visible and the AI layer is clearly framed as assisted synthesis, not hidden authority.",
    iconColor: "text-accent" as const,
    iconBg: "bg-accent-soft" as const,
    iconBorder: "border-accent/18" as const,
  },
];

export default function TrustIndicators() {
  return (
    <section className="mx-auto max-w-7xl" aria-labelledby="trust-heading">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
        <ScrollReveal animation="fade-up">
          <div className="lg:sticky lg:top-24">
            <span className="section-heading">Trust Signals</span>
            <h2
              id="trust-heading"
              className="text-foreground mt-5 max-w-lg text-[clamp(2.2rem,4vw,3.8rem)] leading-[0.92]"
            >
              Credibility shows up in the reading experience before the user checks the sources
              page.
            </h2>
            <p className="text-muted mt-4 max-w-lg text-sm leading-7 md:text-base">
              Good travel products feel composed. The interface should make it obvious what is live,
              what is editorial, and what is machine-assisted. That clarity is part of the brand.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid gap-4">
          {pillars.map(({ icon: Icon, title, detail, iconColor, iconBg, iconBorder }, index) => (
            <ScrollReveal key={title} animation="fade-up" staggerIndex={index} staggerDelay={0.12}>
              <article className="atlas-panel rounded-[1.1rem] p-4 sm:rounded-[1.3rem] sm:p-5 md:rounded-[1.4rem] md:p-6 max-md:mobile-color-border">
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.9rem] border max-md:hidden ${iconBorder} ${iconBg}`}
                  >
                    <Icon className={`h-4.5 w-4.5 ${iconColor}`} aria-hidden />
                  </div>
                  <div>
                    <h3 className="text-foreground text-[clamp(1.3rem,2.2vw,1.8rem)] leading-tight">
                      <Icon className={`mr-2 inline h-4.5 w-4.5 md:hidden ${iconColor}`} aria-hidden />
                      {title}
                    </h3>
                    <p className="text-muted mt-2 max-w-xl text-sm leading-7">{detail}</p>
                  </div>
                </div>
              </article>
            </ScrollReveal>
          ))}

          <ScrollReveal animation="fade-up" delay={0.3}>
            <div className="atlas-frame rounded-[1.1rem] p-4 sm:rounded-[1.3rem] sm:p-5 md:rounded-[1.4rem] md:p-6">
              <div className="labelled-rule">Verification</div>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
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

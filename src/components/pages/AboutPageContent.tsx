"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Database, Globe2, Radar, Shield, Sparkles } from "lucide-react";
import ScrollProgress from "@/components/ui/ScrollProgress";
import ScrollReveal from "@/components/ui/ScrollReveal";

const principles = [
  {
    title: "No paywalls",
    text: "The core city research experience stays open so planning is not gated behind an account wall.",
  },
  {
    title: "No dark patterns",
    text: "We do not use fake scarcity, manipulative timers, or disguised calls to action.",
  },
  {
    title: "Transparent data",
    text: "Metrics are sourced from recognizable providers and described in plain language.",
  },
  {
    title: "Ethical AI use",
    text: "AI adds summary and synthesis. It does not replace source data or hide where facts come from.",
  },
];

const stack = [
  {
    icon: Globe2,
    title: "Global city graph",
    text: "A searchable index of major cities and urban centers with demographic context.",
  },
  {
    icon: Radar,
    title: "Live situational signals",
    text: "Weather and air quality are refreshed so shortlists do not feel frozen in time.",
  },
  {
    icon: Shield,
    title: "Responsible analytics",
    text: "Usage insights help improve the product without turning the interface into a surveillance funnel.",
  },
];

const sources = [
  "Google Places API for landmarks, restaurants, hotels, ratings, and reviews",
  "Open weather and air quality services for live conditions and seasonal context",
  "Public census and geographic datasets for scale, region, and population",
  "Google Gemini for clearly labeled AI briefings and city summaries",
];

export default function AboutPageContent() {
  return (
    <>
      <ScrollProgress />

      <main id="main-content" className="text-foreground min-h-screen bg-transparent">
        <div
          className="container-gutter mx-auto max-w-6xl px-4 py-12 sm:px-6"
          style={{ paddingTop: "max(3rem, calc(env(safe-area-inset-top, 0px) + 4rem))" }}
        >
          <ScrollReveal animation="fade-down" delay={0.1}>
            <nav className="mb-10" aria-label="Breadcrumb">
              <Link
                href="/"
                className="border-line bg-background/65 text-muted-strong hover:text-foreground inline-flex items-center gap-3 rounded-full border px-4 py-3 text-xs font-bold tracking-[0.18em] uppercase transition-colors duration-300"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Back to explorer
              </Link>
            </nav>
          </ScrollReveal>

          <header className="atlas-frame rounded-2xl p-5 sm:rounded-3xl md:rounded-4xl md:p-8 lg:p-10">
            <ScrollReveal animation="fade-up">
              <span className="eyebrow">
                <Sparkles className="text-accent h-3.5 w-3.5" aria-hidden />
                About the atlas
              </span>
            </ScrollReveal>

            <ScrollReveal animation="fade-up" delay={0.1}>
              <h1 className="page-title text-foreground mt-6 max-w-4xl">
                We design for trust, legibility, and calmer travel decisions.
              </h1>
            </ScrollReveal>

            <ScrollReveal animation="fade-up" delay={0.2}>
              <p className="lede mt-5 max-w-3xl">
                Best City Spots exists to make destination research feel edited instead of chaotic.
                We combine public data, live city conditions, and AI-assisted summaries so travelers
                can compare places without fighting a noisy interface.
              </p>
            </ScrollReveal>

            <ScrollReveal animation="fade-up" delay={0.3}>
              <Image
                src="/illustrations/about-transparent-atlas.webp"
                alt="Translucent map layers — weather, places, and AI synthesis — stacking into one calm atlas"
                width={1280}
                height={720}
                sizes="(min-width: 1024px) 56rem, 100vw"
                className="mt-8 h-auto w-full rounded-2xl"
              />
            </ScrollReveal>
          </header>

          <section className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <ScrollReveal animation="fade-up">
              <div className="lg:sticky lg:top-24">
                <span className="section-heading">Principles</span>
                <h2 className="text-foreground mt-5 text-[clamp(2.1rem,3.8vw,3.6rem)] leading-[0.92]">
                  The product should feel honest before it feels clever.
                </h2>
              </div>
            </ScrollReveal>

            <div className="grid gap-4 md:grid-cols-2">
              {principles.map((item, index) => (
                <ScrollReveal
                  key={item.title}
                  animation="fade-up"
                  staggerIndex={index}
                  staggerDelay={0.1}
                >
                  <article className="atlas-panel interactive-card rounded-xl p-4 sm:rounded-2xl sm:p-5 md:rounded-3xl md:p-6">
                    <p className="text-muted font-mono text-xs tracking-[0.24em] uppercase">
                      Principle 0{index + 1}
                    </p>
                    <h3 className="text-foreground mt-3 text-[2rem] leading-none">{item.title}</h3>
                    <p className="text-muted mt-3 text-sm leading-7">{item.text}</p>
                  </article>
                </ScrollReveal>
              ))}
            </div>
          </section>

          <section className="mt-16 grid gap-6 lg:grid-cols-3">
            {stack.map(({ icon: Icon, title, text }, index) => (
              <ScrollReveal key={title} animation="fade-up" staggerIndex={index} staggerDelay={0.1}>
                <article className="atlas-frame rounded-xl p-4 sm:rounded-2xl sm:p-5 md:rounded-3xl md:p-6">
                  <div className="border-line bg-background/60 flex h-12 w-12 items-center justify-center rounded-lg border">
                    <Icon className="text-accent h-5 w-5" aria-hidden />
                  </div>
                  <h3 className="text-foreground mt-5 text-[2rem] leading-none">{title}</h3>
                  <p className="text-muted mt-3 text-sm leading-7">{text}</p>
                </article>
              </ScrollReveal>
            ))}
          </section>

          <section className="mt-16 grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <ScrollReveal animation="fade-up">
              <div
                id="source-stack"
                className="atlas-panel-strong rounded-2xl p-5 sm:rounded-3xl md:rounded-3xl md:p-7"
              >
                <div className="labelled-rule">Source Stack</div>
                <ul className="text-muted-strong mt-5 space-y-4 text-sm leading-7">
                  {sources.map((item) => (
                    <li
                      key={item}
                      className="border-line bg-background/45 rounded-lg border px-4 py-3"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>

            <ScrollReveal animation="fade-up" delay={0.1}>
              <div className="atlas-frame rounded-2xl p-5 sm:rounded-3xl md:rounded-3xl md:p-7">
                <div className="labelled-rule">How to read the product</div>
                <div className="text-muted mt-5 space-y-4 text-sm leading-7">
                  <p>
                    Search is the front door. City pages combine population context, weather, and AI
                    briefings with places you can save locally while planning.
                  </p>
                  <p>
                    We treat AI as an assistant for synthesis and copy structure. We do not present
                    it as a hidden oracle, and we keep the product explicit about where factual data
                    comes from.
                  </p>
                  <p>
                    That design choice matters. Travelers should know what is live, what is
                    estimated, and what is curated.
                  </p>
                </div>
              </div>
            </ScrollReveal>
          </section>

          <ScrollReveal animation="fade-up">
            <section className="atlas-panel-strong mt-16 rounded-2xl p-5 sm:rounded-3xl md:rounded-3xl md:p-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                <div>
                  <div className="labelled-rule">Next step</div>
                  <p className="text-muted-strong mt-5 max-w-2xl text-base leading-8 md:text-lg">
                    Explore the ranked city index or jump straight into the search desk to start
                    building a shortlist.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link href="/resources/top-cities" className="btn-secondary">
                    <Database className="h-4 w-4" />
                    View the Global 50
                  </Link>
                  <Link href="/" className="btn-primary">
                    Start exploring
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </section>
          </ScrollReveal>
        </div>
      </main>
    </>
  );
}

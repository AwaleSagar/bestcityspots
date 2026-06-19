"use client";

import FreshnessStamp from "@/components/ui/FreshnessStamp";
import Image from "next/image";
import { useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Sparkles, MapPin, CalendarRange, ThermometerSun, Compass, Eye } from "lucide-react";
import type { CityInsight } from "@/lib/intelligence";

interface AIBriefingClientProps {
  insight: CityInsight;
  /** US-11: ISO timestamp of when this insight was generated/cached. */
  generatedAt?: string | null;
}

type Tab = "overview" | "attractions" | "seasons";

const TABS = [
  { id: "overview" as Tab, label: "Overview", icon: Eye },
  { id: "attractions" as Tab, label: "Top Spots", icon: Compass },
  { id: "seasons" as Tab, label: "When to Visit", icon: CalendarRange },
];

function getSeasonColor(name: string) {
  const n = name.toLowerCase();
  if (n.includes("spring"))
    return {
      icon: "text-[color:var(--color-season-spring)]",
      bg: "bg-[color:color-mix(in_oklab,var(--color-season-spring)_10%,transparent)]",
      border: "border-l-[color:var(--color-season-spring)]",
      pill: "text-[color:var(--color-season-spring)]",
    };
  if (n.includes("summer"))
    return {
      icon: "text-[color:var(--color-season-summer)]",
      bg: "bg-[color:color-mix(in_oklab,var(--color-season-summer)_10%,transparent)]",
      border: "border-l-[color:var(--color-season-summer)]",
      pill: "text-[color:var(--color-season-summer)]",
    };
  if (n.includes("autumn") || n.includes("fall"))
    return {
      icon: "text-[color:var(--color-season-autumn)]",
      bg: "bg-[color:color-mix(in_oklab,var(--color-season-autumn)_10%,transparent)]",
      border: "border-l-[color:var(--color-season-autumn)]",
      pill: "text-[color:var(--color-season-autumn)]",
    };
  if (n.includes("winter"))
    return {
      icon: "text-[color:var(--color-season-winter)]",
      bg: "bg-[color:color-mix(in_oklab,var(--color-season-winter)_10%,transparent)]",
      border: "border-l-[color:var(--color-season-winter)]",
      pill: "text-[color:var(--color-season-winter)]",
    };
  return {
    icon: "text-accent",
    bg: "bg-accent-soft",
    border: "border-l-accent",
    pill: "text-accent",
  };
}

export default function AIBriefingClient({ insight, generatedAt }: AIBriefingClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const shouldReduceMotion = useReducedMotion();

  const mergedSeasons = useMemo(
    () =>
      insight.seasons.map((season) => {
        const weatherMatch = insight.weather.find(
          (w) => w.season.toLowerCase() === season.name.toLowerCase()
        );
        return {
          ...season,
          tempC: weatherMatch?.tempC || "N/A",
          weatherNotes: weatherMatch?.notes || "",
        };
      }),
    [insight]
  );

  const tabCounts: Record<Tab, number> = {
    overview: 1,
    attractions: insight.attractions.length,
    seasons: mergedSeasons.length,
  };

  return (
    <section className="space-y-8">
      {/* Section Heading — matches "Structural Profile" / "Top Experiences" style */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="space-y-3">
          <h2 className="labelled-rule">
            <Sparkles className="text-accent h-4 w-4" />
            AI City Briefing
          </h2>
          <p className="text-muted max-w-xl text-sm font-semibold tracking-wide">
            A labeled synthesis of attractions, seasons, and practical weather context. Use it as a
            planning companion, not a hidden authority.
          </p>
          {generatedAt ? (
            <p className="text-muted text-xs font-semibold tracking-[0.15em] uppercase">
              {/* US-11: generation date alongside the existing AI labeling. */}
              <FreshnessStamp iso={generatedAt} prefix="Generated" />
            </p>
          ) : null}
        </div>

        {/* AI-assisted seal: decorative accent kept out of the text flow to avoid overlap */}
        <div className="hidden pt-1 lg:block">
          <Image
            src="/illustrations/ai-briefing-seal.webp"
            alt="AI-assisted briefing seal"
            width={512}
            height={512}
            className="pointer-events-none h-16 w-16 opacity-90 xl:h-20 xl:w-20"
          />
        </div>
      </div>

      {/* Tab Switcher — matches ExperiencesSection tab style */}
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
        <div className="border-line bg-background/55 flex w-max items-center gap-1.5 rounded-2xl border p-1.5 sm:w-fit md:rounded-2xl">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const count = tabCounts[tab.id];
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-black tracking-[0.08em] uppercase transition-all duration-200 sm:gap-2 sm:px-4 sm:text-xs sm:tracking-[0.1em] md:gap-2.5 md:rounded-2xl md:px-5 md:py-3 ${
                  isActive ? "text-foreground" : "text-foreground/30 hover:text-foreground/50"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="ai-briefing-tab"
                    className="border-accent/20 bg-accent-soft absolute inset-0 rounded-xl border md:rounded-2xl"
                    transition={{
                      duration: shouldReduceMotion ? 0 : 0.28,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  />
                )}
                <Icon
                  className={`relative z-10 h-3.5 w-3.5 transition-colors duration-200 md:h-4 md:w-4 ${
                    isActive ? "text-accent" : "text-foreground/20"
                  }`}
                />
                <span className="relative z-10">{tab.label}</span>
                {tab.id !== "overview" && (
                  <span
                    className={`relative z-10 rounded-full px-1.5 py-0.5 text-xs font-black tabular-nums transition-colors duration-200 sm:text-xs ${
                      isActive ? "bg-accent/15 text-accent" : "bg-foreground/5 text-foreground/25"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {/* ── Overview ── */}
        {activeTab === "overview" && (
          <motion.div
            key="overview"
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.35 }}
          >
            <div className="organic-panel rounded-2xl p-6 sm:rounded-3xl md:rounded-4xl md:p-10">
              <p className="text-muted-strong text-base leading-loose font-medium md:text-lg">
                {insight.intro}
              </p>
              <div className="border-line mt-6 flex flex-wrap items-center gap-2 border-t pt-5">
                <div className="bg-accent h-1.5 w-1.5 animate-pulse rounded-full" />
                <span className="source-chip">AI synthesis</span>
                <span className="text-muted text-xs font-semibold tracking-[0.16em] uppercase">
                  Google Gemini / checked against public city context
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Attractions ── */}
        {activeTab === "attractions" && (
          <motion.div
            key="attractions"
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.35 }}
            className="flow-grid"
          >
            {insight.attractions.map((a, idx) => (
              <motion.div
                key={idx}
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
                animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                transition={{
                  delay: shouldReduceMotion ? 0 : idx * 0.06,
                  duration: shouldReduceMotion ? 0 : 0.36,
                }}
                className="intent-card group/card flex flex-col overflow-hidden rounded-2xl md:rounded-3xl"
              >
                <div className="flex flex-col gap-4 p-5 md:p-6">
                  <div className="flex items-start gap-4">
                    <div className="border-line bg-accent-soft flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border transition-colors duration-100">
                      <MapPin className="text-accent h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-foreground/90 text-base leading-tight font-black tracking-tight">
                        {a.name}
                      </h3>
                      <span className="badge-featured mt-1 inline-block rounded-md px-2 py-0.5 text-xs">
                        Must Visit
                      </span>
                    </div>
                  </div>

                  <div className="border-line bg-background/50 rounded-xl border p-3.5">
                    <div className="text-accent mb-2 flex items-center gap-1.5 text-xs font-black tracking-[0.2em] uppercase">
                      <Compass className="h-3 w-3" />
                      Why visit
                    </div>
                    <p className="text-muted-strong text-xs leading-relaxed">{a.why}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* ── Seasons & Weather ── */}
        {activeTab === "seasons" && (
          <motion.div
            key="seasons"
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.35 }}
            className="flow-grid"
          >
            {mergedSeasons.map((s, idx) => {
              const sc = getSeasonColor(s.name);
              return (
                <motion.div
                  key={idx}
                  initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
                  animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                  transition={{
                    delay: shouldReduceMotion ? 0 : idx * 0.06,
                    duration: shouldReduceMotion ? 0 : 0.36,
                  }}
                  className={`intent-card group/card overflow-hidden rounded-2xl border-l-[3px] ${sc.border} md:rounded-3xl`}
                >
                  <div className="flex flex-col gap-4 p-5 md:p-6">
                    {/* Season Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`border-line flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border ${sc.bg} transition-colors duration-100`}
                        >
                          <CalendarRange className={`h-5 w-5 ${sc.icon}`} />
                        </div>
                        <div>
                          <h3 className="text-foreground/90 text-base leading-tight font-black tracking-tight">
                            {s.name}
                          </h3>
                          <span className="text-foreground/35 text-xs font-bold tracking-widest uppercase">
                            {s.months}
                          </span>
                        </div>
                      </div>
                      <div className="border-line bg-background/65 flex items-center gap-1.5 rounded-full border px-3 py-1.5">
                        <ThermometerSun className={`h-3.5 w-3.5 ${sc.pill}`} />
                        <span className={`text-xs font-black tracking-wider ${sc.pill}`}>
                          {s.tempC}
                        </span>
                      </div>
                    </div>

                    {/* Summary */}
                    <p className="text-muted-strong text-sm leading-relaxed">{s.summary}</p>

                    {/* Weather Notes */}
                    {s.weatherNotes && (
                      <div className="border-line bg-background/45 rounded-xl border p-3.5">
                        <div className="text-muted mb-1.5 flex items-center gap-1.5 text-xs font-black tracking-[0.2em] uppercase">
                          <ThermometerSun className="h-3 w-3" />
                          Weather Note
                        </div>
                        <p className="text-muted text-xs leading-relaxed">{s.weatherNotes}</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

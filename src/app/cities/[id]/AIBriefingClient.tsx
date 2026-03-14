"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  MapPin,
  CalendarRange,
  ThermometerSun,
  Compass,
  Eye,
} from "lucide-react";
import type { CityInsight } from "@/lib/intelligence";

interface AIBriefingClientProps {
  insight: CityInsight;
}

type Tab = "overview" | "attractions" | "seasons";

export default function AIBriefingClient({ insight }: AIBriefingClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const getSeasonColor = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("spring")) return { icon: "text-[color:var(--color-season-spring)]", bg: "bg-[color:color-mix(in_oklab,var(--color-season-spring)_10%,transparent)]", border: "border-l-[color:var(--color-season-spring)]", pill: "text-[color:var(--color-season-spring)]" };
    if (n.includes("summer")) return { icon: "text-[color:var(--color-season-summer)]", bg: "bg-[color:color-mix(in_oklab,var(--color-season-summer)_10%,transparent)]", border: "border-l-[color:var(--color-season-summer)]", pill: "text-[color:var(--color-season-summer)]" };
    if (n.includes("autumn") || n.includes("fall")) return { icon: "text-[color:var(--color-season-autumn)]", bg: "bg-[color:color-mix(in_oklab,var(--color-season-autumn)_10%,transparent)]", border: "border-l-[color:var(--color-season-autumn)]", pill: "text-[color:var(--color-season-autumn)]" };
    if (n.includes("winter")) return { icon: "text-[color:var(--color-season-winter)]", bg: "bg-[color:color-mix(in_oklab,var(--color-season-winter)_10%,transparent)]", border: "border-l-[color:var(--color-season-winter)]", pill: "text-[color:var(--color-season-winter)]" };
    return { icon: "text-accent", bg: "bg-accent-soft", border: "border-l-accent", pill: "text-accent" };
  };

  // Merge seasons and weather data
  const mergedSeasons = insight.seasons.map((season) => {
    const weatherMatch = insight.weather.find(
      (w) => w.season.toLowerCase() === season.name.toLowerCase()
    );
    return {
      ...season,
      tempC: weatherMatch?.tempC || "N/A",
      weatherNotes: weatherMatch?.notes || "",
    };
  });

  const tabs = [
    { id: "overview" as Tab, label: "Overview", icon: Eye },
    { id: "attractions" as Tab, label: "Top Spots", icon: Compass },
    { id: "seasons" as Tab, label: "When to Visit", icon: CalendarRange },
  ];

  const tabCounts: Record<Tab, number> = {
    overview: 1,
    attractions: insight.attractions.length,
    seasons: mergedSeasons.length,
  };

  return (
    <section className="space-y-8">
      {/* Section Heading — matches "Structural Profile" / "Top Experiences" style */}
      <div className="space-y-3">
        <h2 className="labelled-rule">
          <Sparkles className="h-4 w-4 text-accent" />
          AI City Briefing
        </h2>
        <p className="max-w-lg text-sm font-bold tracking-wide text-muted">
          AI-powered travel intelligence covering attractions, seasons, and weather at a glance.
        </p>
      </div>

      {/* Tab Switcher — matches ExperiencesSection tab style */}
      <div className="flex w-fit flex-wrap items-center gap-1.5 rounded-2xl border border-line bg-background/55 p-1.5 md:rounded-[1.5rem]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const count = tabCounts[tab.id];
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 md:gap-2.5 px-4 md:px-5 py-2.5 md:py-3 rounded-xl md:rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-[0.1em] transition-all duration-200 ${
                isActive
                  ? "text-foreground"
                  : "text-foreground/30 hover:text-foreground/50"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="ai-briefing-tab"
                  className="absolute inset-0 rounded-xl border border-accent/20 bg-accent-soft md:rounded-2xl"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                />
              )}
              <Icon
                className={`relative z-10 w-3.5 h-3.5 md:w-4 md:h-4 transition-colors duration-200 ${
                  isActive ? "text-accent" : "text-foreground/20"
                }`}
              />
              <span className="relative z-10">{tab.label}</span>
              {tab.id !== "overview" && (
                <span
                  className={`relative z-10 rounded-full px-1.5 py-0.5 text-[8px] md:text-[9px] font-black tabular-nums transition-colors duration-200 ${
                    isActive
                      ? "bg-accent/15 text-accent"
                      : "bg-foreground/5 text-foreground/25"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {/* ── Overview ── */}
        {activeTab === "overview" && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
          >
            <div className="atlas-panel rounded-[2.5rem] p-8 shadow-2xl md:rounded-[3rem] md:p-10">
              <p className="text-base font-medium leading-loose text-muted-strong md:text-lg">
                {insight.intro}
              </p>
              <div className="mt-6 flex items-center gap-2 border-t border-line pt-5">
                <div className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted">
                  AI-generated via Google Gemini / verified against public data
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Attractions ── */}
        {activeTab === "attractions" && (
          <motion.div
            key="attractions"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            {insight.attractions.map((a, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08, duration: 0.4 }}
                className="atlas-panel group/card flex flex-col overflow-hidden rounded-2xl transition-all duration-300 md:rounded-[2rem]"
              >
                <div className="flex flex-col gap-4 p-5 md:p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-line bg-accent-soft transition-colors duration-100">
                      <MapPin className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <h3 className="text-base font-black tracking-tight text-foreground/90 leading-tight">
                        {a.name}
                      </h3>
                      <span className="badge-featured mt-1 inline-block rounded-md px-2 py-0.5 text-[9px]">
                        Must Visit
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-line bg-background/50 p-3.5">
                    <div className="mb-2 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-accent">
                      <Compass className="h-3 w-3" />
                      Why visit
                    </div>
                    <p className="text-[11px] leading-relaxed text-muted-strong">
                      {a.why}
                    </p>
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
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            {mergedSeasons.map((s, idx) => {
              const sc = getSeasonColor(s.name);
              return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08, duration: 0.4 }}
                className={`atlas-panel group/card overflow-hidden rounded-2xl border-l-[3px] ${sc.border} transition-all duration-300 md:rounded-[2rem]`}
              >
                <div className="flex flex-col gap-4 p-5 md:p-6">
                  {/* Season Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-line ${sc.bg} transition-colors duration-100`}>
                        <CalendarRange className={`h-5 w-5 ${sc.icon}`} />
                      </div>
                      <div>
                        <h3 className="text-base font-black tracking-tight text-foreground/90 leading-tight">
                          {s.name}
                        </h3>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/35">
                          {s.months}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full border border-line bg-background/65 px-3 py-1.5">
                      <ThermometerSun className={`h-3.5 w-3.5 ${sc.pill}`} />
                      <span className={`text-[10px] font-black tracking-wider ${sc.pill}`}>
                        {s.tempC}
                      </span>
                    </div>
                  </div>

                  {/* Summary */}
                  <p className="text-sm leading-relaxed text-muted-strong">
                    {s.summary}
                  </p>

                  {/* Weather Notes */}
                  {s.weatherNotes && (
                    <div className="rounded-xl border border-line bg-background/45 p-3.5">
                      <div className="mb-1.5 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-muted">
                        <ThermometerSun className="h-3 w-3" />
                        Weather Note
                      </div>
                      <p className="text-[11px] leading-relaxed text-muted">
                        {s.weatherNotes}
                      </p>
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

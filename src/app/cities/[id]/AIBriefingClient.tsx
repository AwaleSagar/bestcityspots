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
        <h2 className="flex items-center gap-4 text-sm font-black tracking-[0.4em] text-foreground/40 uppercase">
          <Sparkles className="h-4 w-4 text-purple-400" />
          AI City Briefing
          <span className="h-px flex-1 bg-foreground/5" />
        </h2>
        <p className="text-sm font-bold text-foreground/40 tracking-wide max-w-lg">
          AI-powered travel intelligence — attractions, seasons, and weather at a glance.
        </p>
      </div>

      {/* Tab Switcher — matches ExperiencesSection tab style */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl md:rounded-[1.5rem] bg-foreground/[0.02] border border-foreground/5 w-fit">
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
                  className="absolute inset-0 bg-purple-500/10 border border-purple-500/20 rounded-xl md:rounded-2xl shadow-[0_0_20px_rgba(124,58,237,0.06)]"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                />
              )}
              <Icon
                className={`relative z-10 w-3.5 h-3.5 md:w-4 md:h-4 transition-colors duration-200 ${
                  isActive ? "text-purple-400" : "text-foreground/20"
                }`}
              />
              <span className="relative z-10">{tab.label}</span>
              {tab.id !== "overview" && (
                <span
                  className={`relative z-10 rounded-full px-1.5 py-0.5 text-[8px] md:text-[9px] font-black tabular-nums transition-colors duration-200 ${
                    isActive
                      ? "bg-purple-500/20 text-purple-300"
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
            <div className="liquid-glass rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-10 shadow-2xl">
              <p className="text-base md:text-lg leading-loose text-foreground/70 font-medium">
                {insight.intro}
              </p>
              <div className="mt-6 flex items-center gap-2 border-t border-foreground/5 pt-5">
                <div className="h-1.5 w-1.5 rounded-full bg-purple-400/50 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-foreground/25">
                  AI-generated via Google Gemini · Verified against public data
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
                className="liquid-glass group/card flex flex-col overflow-hidden rounded-2xl md:rounded-[2rem] transition-all duration-300 hover:shadow-[0_8px_30px_rgba(124,58,237,0.08)]"
              >
                <div className="flex flex-col gap-4 p-5 md:p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10 transition-colors duration-100 group-hover/card:bg-purple-500/20">
                      <MapPin className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-black tracking-tight text-foreground/90 leading-tight">
                        {a.name}
                      </h3>
                      <span className="mt-1 inline-block rounded-md bg-purple-500/10 px-2 py-0.5 text-[9px] font-black tracking-[0.1em] text-purple-400/80 uppercase border border-purple-500/20">
                        Must Visit
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-purple-500/10 bg-purple-500/[0.04] p-3.5">
                    <div className="mb-2 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-purple-300/70">
                      <Compass className="h-3 w-3" />
                      Why visit
                    </div>
                    <p className="text-[11px] leading-relaxed text-foreground/60">
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
            {mergedSeasons.map((s, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08, duration: 0.4 }}
                className="liquid-glass group/card overflow-hidden rounded-2xl md:rounded-[2rem] transition-all duration-300 hover:shadow-[0_8px_30px_rgba(124,58,237,0.08)]"
              >
                <div className="flex flex-col gap-4 p-5 md:p-6">
                  {/* Season Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10 transition-colors duration-100 group-hover/card:bg-purple-500/20">
                        <CalendarRange className="h-5 w-5 text-purple-400" />
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
                    <div className="flex items-center gap-1.5 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1.5">
                      <ThermometerSun className="h-3.5 w-3.5 text-purple-400" />
                      <span className="text-[10px] font-black tracking-wider text-purple-300">
                        {s.tempC}
                      </span>
                    </div>
                  </div>

                  {/* Summary */}
                  <p className="text-sm leading-relaxed text-foreground/60">
                    {s.summary}
                  </p>

                  {/* Weather Notes */}
                  {s.weatherNotes && (
                    <div className="rounded-xl border border-foreground/5 bg-foreground/[0.02] p-3.5">
                      <div className="mb-1.5 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-foreground/30">
                        <ThermometerSun className="h-3 w-3" />
                        Weather Note
                      </div>
                      <p className="text-[11px] leading-relaxed text-foreground/50">
                        {s.weatherNotes}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

"use client";

import { motion } from "framer-motion";
import { Ticket, Utensils, Hotel, Compass, Star } from "lucide-react";

// Shimmer animation component
function Shimmer() {
  return (
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-foreground/5 to-transparent" />
  );
}

// Skeleton for a single experience card
function ExperienceCardSkeleton({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="liquid-glass overflow-hidden rounded-2xl md:rounded-[2.5rem]"
    >
      {/* Image skeleton */}
      <div className="relative h-40 md:h-52 w-full bg-foreground/[0.03] overflow-hidden">
        <Shimmer />
        {/* Gradient overlay like real cards */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
      </div>

      {/* Content skeleton */}
      <div className="flex flex-col gap-6 px-6 pb-6 md:px-8 md:pb-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Left side - icon and title */}
          <div className="flex items-start gap-4 md:items-center md:gap-6">
            {/* Icon placeholder */}
            <div className="flex h-10 w-10 md:h-12 md:w-12 flex-shrink-0 items-center justify-center rounded-xl md:rounded-2xl border border-foreground/5 bg-foreground/[0.02]">
              <Compass className="h-5 w-5 text-foreground/10" />
            </div>

            <div className="space-y-3">
              {/* Title skeleton */}
              <div className="relative h-6 w-48 overflow-hidden rounded-lg bg-foreground/[0.05]">
                <Shimmer />
              </div>

              {/* Tags skeleton */}
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                <div className="relative h-5 w-20 overflow-hidden rounded-md bg-purple-500/10">
                  <Shimmer />
                </div>
                <div className="hidden md:block h-px w-4 bg-foreground/10" />
                <div className="relative h-4 w-24 overflow-hidden rounded bg-foreground/[0.03]">
                  <Shimmer />
                </div>
                <div className="relative h-5 w-28 overflow-hidden rounded-full bg-foreground/[0.03]">
                  <Shimmer />
                </div>
              </div>
            </div>
          </div>

          {/* Right side - rating and actions */}
          <div className="flex flex-col items-start gap-3 lg:items-end">
            {/* Rating skeleton */}
            <div className="flex items-center gap-3">
              <div className="relative h-4 w-10 overflow-hidden rounded bg-foreground/[0.03]">
                <Shimmer />
              </div>
              <div className="flex items-center gap-1.5 text-foreground/10">
                <Star className="h-4 w-4" />
                <div className="relative h-6 w-8 overflow-hidden rounded bg-foreground/[0.03]">
                  <Shimmer />
                </div>
              </div>
            </div>

            {/* Reviews skeleton */}
            <div className="relative h-3 w-20 overflow-hidden rounded bg-foreground/[0.03]">
              <Shimmer />
            </div>

            {/* Insider tips skeleton */}
            <div className="w-full rounded-2xl border border-purple-500/10 bg-purple-500/[0.02] p-3">
              <div className="relative mb-2 h-2 w-16 overflow-hidden rounded bg-purple-500/10">
                <Shimmer />
              </div>
              <div className="space-y-1">
                <div className="relative h-3 w-full overflow-hidden rounded bg-foreground/[0.02]">
                  <Shimmer />
                </div>
                <div className="relative h-3 w-3/4 overflow-hidden rounded bg-foreground/[0.02]">
                  <Shimmer />
                </div>
              </div>
            </div>

            {/* Action buttons skeleton */}
            <div className="flex flex-wrap gap-2">
              <div className="relative h-9 w-32 overflow-hidden rounded-xl bg-blue-500/10">
                <Shimmer />
              </div>
              <div className="relative h-9 w-24 overflow-hidden rounded-xl bg-foreground/[0.03]">
                <Shimmer />
              </div>
              <div className="relative h-9 w-28 overflow-hidden rounded-xl bg-foreground/[0.03]">
                <Shimmer />
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function ExperiencesSkeleton() {
  const tabs = [
    { id: "landmarks", label: "Landmarks", icon: Ticket },
    { id: "restaurants", label: "Dining", icon: Utensils },
    { id: "hotels", label: "Stays", icon: Hotel },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="relative h-4 w-40 overflow-hidden rounded bg-foreground/[0.05]">
          <Shimmer />
        </div>
        <div className="h-px flex-1 bg-foreground/5" />
      </div>

      {/* Tabs skeleton */}
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          {/* Tab switcher */}
          <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl md:rounded-[1.5rem] bg-foreground/[0.02] border border-foreground/5 w-fit">
            {tabs.map((tab, index) => {
              const Icon = tab.icon;
              const isFirst = index === 0;
              return (
                <div
                  key={tab.id}
                  className={`relative flex items-center gap-2 md:gap-2.5 px-4 md:px-6 py-2 md:py-2.5 rounded-xl md:rounded-2xl ${
                    isFirst
                      ? "bg-purple-500/10 border border-purple-500/20"
                      : ""
                  }`}
                >
                  <Icon
                    className={`w-3 h-3 md:w-3.5 md:h-3.5 ${
                      isFirst ? "text-purple-400" : "text-foreground/20"
                    }`}
                  />
                  <span
                    className={`text-[10px] md:text-[11px] font-black uppercase tracking-[0.1em] ${
                      isFirst ? "text-foreground" : "text-foreground/30"
                    }`}
                  >
                    {tab.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Saved places skeleton */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-2xl border border-foreground/5 bg-foreground/[0.02] px-4 py-2">
              <div className="relative h-4 w-4 overflow-hidden rounded bg-purple-400/20">
                <Shimmer />
              </div>
              <div className="relative h-3 w-24 overflow-hidden rounded bg-foreground/[0.05]">
                <Shimmer />
              </div>
            </div>
          </div>
        </div>

        {/* Loading indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center gap-3 py-4"
        >
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="h-2 w-2 rounded-full bg-purple-400"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 1, 0.3],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">
            Discovering experiences...
          </span>
        </motion.div>

        {/* Experience cards skeleton */}
        <div className="grid grid-cols-1 gap-4">
          {[0, 1, 2].map((index) => (
            <ExperienceCardSkeleton key={index} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
}

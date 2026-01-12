"use client";

import { useState } from "react";
import { Landmark } from "@/lib/places";
import { formatPopulation } from "@/lib/format";
import { Compass, Star, Ticket, Utensils, Hotel } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ExperiencesSectionProps {
  landmarks: Landmark[];
  restaurants: Landmark[];
  hotels: Landmark[];
}

export default function ExperiencesSection({
  landmarks,
  restaurants,
  hotels,
}: ExperiencesSectionProps) {
  const [activeTab, setActiveTab] = useState<"landmarks" | "restaurants" | "hotels">(
    "landmarks"
  );
  const [selectedPrice, setSelectedPrice] = useState<string | null>(null);

  const tabs = [
    { id: "landmarks", label: "Landmarks", icon: Ticket },
    { id: "restaurants", label: "Dining", icon: Utensils },
    { id: "hotels", label: "Stays", icon: Hotel },
  ] as const;

  const priceLevels = [
    { id: "PRICE_LEVEL_INEXPENSIVE", label: "$" },
    { id: "PRICE_LEVEL_MODERATE", label: "$$" },
    { id: "PRICE_LEVEL_EXPENSIVE", label: "$$$" },
    { id: "PRICE_LEVEL_VERY_EXPENSIVE", label: "$$$$" },
  ];

  // Logic to filter and slice data
  const rawData =
    activeTab === "landmarks" ? landmarks : activeTab === "restaurants" ? restaurants : hotels;

  const filteredData = selectedPrice
    ? rawData.filter((item) => item.priceLevel === selectedPrice)
    : rawData;

  // Always take top 5 based on reviews
  const displayData = filteredData
    .sort((a, b) => (b.userRatingCount || 0) - (a.userRatingCount || 0))
    .slice(0, 5);

  const formatType = (types?: string[]) => {
    if (!types || types.length === 0) return "Point of Interest";
    const primary = types[0].replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    return primary;
  };

  const getPriceLevel = (level?: string) => {
    if (!level) return null;
    const map: Record<string, string> = {
      PRICE_LEVEL_FREE: "Free",
      PRICE_LEVEL_INEXPENSIVE: "$",
      PRICE_LEVEL_MODERATE: "$$",
      PRICE_LEVEL_EXPENSIVE: "$$$",
      PRICE_LEVEL_VERY_EXPENSIVE: "$$$$",
    };
    return map[level] || null;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        {/* Dynamic Tab Switcher */}
        <div className="flex items-center gap-2 p-1.5 rounded-[1.5rem] bg-white/[0.02] border border-white/5 w-fit">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSelectedPrice(null); // Reset price when tab changes
                }}
                className={`relative flex items-center gap-2.5 px-6 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-[0.1em] transition-all duration-500 ${
                  isActive ? "text-white" : "text-white/30 hover:text-white/50"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-tab"
                    className="absolute inset-0 bg-blue-500/10 border border-blue-500/20 rounded-2xl"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <Icon
                  className={`w-3.5 h-3.5 transition-colors ${
                    isActive ? "text-blue-400" : "text-white/20"
                  }`}
                />
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Sub-Category Price Filter (Only for Dining and Stays) */}
        <AnimatePresence>
          {activeTab !== "landmarks" && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/[0.01] border border-white/5 w-fit"
            >
              <button
                onClick={() => setSelectedPrice(null)}
                className={`px-4 py-1.5 rounded-xl text-[10px] font-black transition-all ${
                  selectedPrice === null
                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                    : "text-white/20 hover:text-white/40 border border-transparent"
                }`}
              >
                ALL
              </button>
              {priceLevels.map((level) => (
                <button
                  key={level.id}
                  onClick={() => setSelectedPrice(level.id)}
                  className={`px-4 py-1.5 rounded-xl text-[10px] font-black transition-all ${
                    selectedPrice === level.id
                      ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      : "text-white/20 hover:text-white/40 border border-transparent"
                  }`}
                >
                  {level.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${activeTab}-${selectedPrice}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-1 gap-4"
        >
          {displayData.map((item) => (
            <div
              key={item.id}
              className="liquid-glass group/landmark flex items-center justify-between rounded-[2.5rem] p-8 transition-all duration-500 hover:bg-white/[0.05]"
            >
              <div className="flex items-center gap-6">
                <a
                  href={item.googleMapsUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02] transition-all group-hover/landmark:border-blue-500/30 group-hover/landmark:bg-blue-500/10 active:scale-95"
                  title="View on Google Maps"
                >
                  <Compass className="h-5 w-5 text-gray-500 transition-colors group-hover/landmark:text-blue-400" />
                </a>
                <div>
                  <div className="text-xl font-black tracking-tight text-white/90">
                    {item.displayName.text}
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="rounded-md bg-blue-500/10 px-2.5 py-1 text-[10px] font-black tracking-[0.1em] text-blue-400/80 uppercase border border-blue-500/20">
                      {formatType(item.types)}
                    </div>
                    <div className="h-px w-4 bg-white/20" />
                    <div className="text-[11px] font-bold text-white/50 uppercase tracking-widest">
                      {item.formattedAddress.split(",")[0]}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-3">
                  {item.priceLevel && (
                    <div className="text-[11px] font-black tracking-widest text-white/40 uppercase">
                      {getPriceLevel(item.priceLevel)}
                    </div>
                  )}
                  {item.rating && (
                    <div className="flex items-center gap-1.5 text-blue-400">
                      <Star className="h-4 w-4 fill-current" />
                      <span className="text-xl font-black tracking-tighter">
                        {item.rating}
                      </span>
                    </div>
                  )}
                </div>
                {item.userRatingCount && (
                  <div className="text-[11px] font-black text-white/40 uppercase tracking-widest mt-1">
                    {formatPopulation(item.userRatingCount)} Reviews
                  </div>
                )}
              </div>
            </div>
          ))}
          {displayData.length === 0 && (
            <div className="py-20 text-center text-white/20 text-xs font-black uppercase tracking-[0.2em]">
              No {getPriceLevel(selectedPrice!) || activeTab} spots discovered in this area
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

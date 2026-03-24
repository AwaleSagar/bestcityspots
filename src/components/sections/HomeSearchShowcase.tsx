"use client";

import type { City } from "@/lib/cities";
import CitySearch from "@/components/features/city/CitySearch";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";

interface HomeSearchShowcaseProps {
  topCities: City[];
}

const ease = [0.16, 1, 0.3, 1] as const;

export default function HomeSearchShowcase({ topCities }: HomeSearchShowcaseProps) {
  const shouldReduceMotion = useReducedMotion();
  const cityPreview = topCities.slice(0, 6);

  return (
    <motion.section
      initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
      whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, ease }}
      className="mt-8 grid gap-8 pb-16 sm:mt-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:gap-12 lg:pb-24"
    >
      <div className="lg:sticky lg:top-24">
        <h2 className="text-foreground text-[clamp(1.8rem,3.5vw,3rem)] leading-[1.05]">
          Find a city by name, region, or vibe
        </h2>
        <p className="text-muted mt-2 max-w-lg text-sm leading-relaxed md:text-base">
          Search by city name, jump from your current location, or start with trending destinations.
        </p>

        <div className="mt-6">
          <CitySearch topCities={topCities} />
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-xl border border-line p-5 sm:p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Trending Guides</p>
          <div className="mt-4 space-y-0">
            {cityPreview.map((city, index) => (
              <Link
                key={city.id}
                href={`/cities/${city.id}?lat=${city.lat}&lng=${city.lng}`}
                className="group flex items-center justify-between gap-4 border-b border-line py-3 last:border-b-0"
              >
                <div className="flex items-baseline gap-3">
                  <span className="text-xs tabular-nums text-muted">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="text-foreground text-lg leading-tight">{city.city}</h3>
                    <p className="text-muted text-sm">{city.country}</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-muted transition-colors group-hover:text-foreground">
                  &rarr;
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-line p-5 sm:p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">What makes this different</p>
          <div className="mt-4 space-y-3">
            {[
              {
                title: "Signal-first data",
                text: "Climate, scale, and sourcing stay visible as you compare.",
              },
              {
                title: "Editorial clarity",
                text: "Clean defaults and strong hierarchy in every screen.",
              },
              {
                title: "Mobile-native",
                text: "Search and navigation adapt to your device.",
              },
            ].map(({ title, text }) => (
              <div key={title} className="border-l-2 border-line py-1 pl-4">
                <h3 className="text-foreground text-sm font-medium">{title}</h3>
                <p className="text-muted mt-0.5 text-sm leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}

"use client";

import type { City } from "@/lib/cities";
import CitySearch from "@/components/features/city/CitySearch";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";

interface HomeSearchShowcaseProps {
  topCities: City[];
}

const sectionEase = [0.22, 1, 0.36, 1] as const;

export default function HomeSearchShowcase({ topCities }: HomeSearchShowcaseProps) {
  const shouldReduceMotion = useReducedMotion();
  const cityPreview = topCities.slice(0, 6);

  return (
    <motion.section
      initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
      whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.8, ease: sectionEase, delay: 0.12 }}
      className="search-stage mt-8 grid gap-6 pb-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start lg:gap-8 lg:pb-24"
    >
      <motion.div
        className="lg:sticky lg:top-24"
        initial={shouldReduceMotion ? false : { opacity: 0, x: -18 }}
        whileInView={shouldReduceMotion ? undefined : { opacity: 1, x: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.8, ease: sectionEase }}
      >
        <div>
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
            whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.7, ease: sectionEase, delay: 0.08 }}
          >
            <h2 className="text-foreground max-w-xl text-[clamp(2.2rem,4vw,3.8rem)] leading-[0.92]">
              Find a city by name, region, or vibe
            </h2>
            <p className="text-muted mt-3 max-w-2xl text-sm leading-7 md:text-base">
              Search by city name, jump from your current location, or start with cities already
              drawing attention.
            </p>
          </motion.div>
        </div>

        <div className="mt-8">
          <CitySearch topCities={topCities} />
        </div>
      </motion.div>

      <motion.aside
        className="grid gap-5"
        initial={shouldReduceMotion ? false : { opacity: 0, x: 18 }}
        whileInView={shouldReduceMotion ? undefined : { opacity: 1, x: 0 }}
        viewport={{ once: true, amount: 0.22 }}
        transition={{ duration: 0.82, ease: sectionEase, delay: 0.1 }}
      >
        <motion.div
          whileHover={shouldReduceMotion ? undefined : { y: -4 }}
          transition={{ duration: 0.35, ease: sectionEase }}
          className="atlas-frame atlas-spotlight rounded-[1.4rem] p-5 sm:rounded-[1.8rem] md:rounded-[2rem] md:p-6"
        >
          <div className="labelled-rule">Trending City Guides</div>
          <div className="mt-5 space-y-4">
            {cityPreview.map((city, index) => (
              <motion.div
                key={city.id}
                initial={shouldReduceMotion ? false : { opacity: 0, x: 12 }}
                whileInView={shouldReduceMotion ? undefined : { opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.8 }}
                transition={{
                  duration: 0.56,
                  ease: sectionEase,
                  delay: shouldReduceMotion ? 0 : 0.08 + index * 0.06,
                }}
              >
                <Link
                  href={`/cities/${city.id}?lat=${city.lat}&lng=${city.lng}`}
                  className="group border-line/70 flex items-start justify-between gap-4 border-b pb-4 last:border-b-0 last:pb-0"
                >
                  <div>
                    <p className="text-muted text-xs tabular-nums">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <h3 className="text-foreground mt-1 text-2xl leading-none">{city.city}</h3>
                    <p className="text-muted-strong mt-1 text-sm">{city.country}</p>
                  </div>
                  <span className="text-muted text-xs font-semibold transition-transform duration-300 group-hover:translate-x-1">
                    Open guide &rarr;
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          whileHover={shouldReduceMotion ? undefined : { y: -3 }}
          transition={{ duration: 0.32, ease: sectionEase }}
          className="atlas-panel atlas-spotlight rounded-[1.4rem] p-5 sm:rounded-[1.6rem] md:rounded-[1.8rem] md:p-6"
        >
          <h3 className="text-muted text-sm font-medium">What makes this different</h3>
          <div className="mt-4 grid gap-3">
            {[
              {
                title: "Editorial rhythm",
                text: "Clarity over decoration in every screen.",
                color: "border-l-[color:var(--color-accent)]",
              },
              {
                title: "Signal-first data",
                text: "Climate, scale, and sourcing stay visible as you compare.",
                color: "border-l-[color:var(--color-cat-dining)]",
              },
              {
                title: "Mobile-native",
                text: "Search and navigation adapt to your device.",
                color: "border-l-[color:var(--color-brand-secondary)]",
              },
            ].map(({ title, text, color }, index) => (
              <motion.div
                key={title}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
                whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.9 }}
                transition={{
                  duration: 0.5,
                  ease: sectionEase,
                  delay: shouldReduceMotion ? 0 : 0.14 + index * 0.08,
                }}
                className={`border-l-2 ${color} py-2 pl-4`}
              >
                <h3 className="text-foreground text-base leading-tight">{title}</h3>
                <p className="text-muted mt-1 text-sm leading-6">{text}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.aside>
    </motion.section>
  );
}

"use client";

import type { City } from "@/lib/cities";
import CitySearch from "@/components/features/city/CitySearch";
import { motion, useReducedMotion } from "framer-motion";
import { CloudSun, Compass, MapPinned, Moon, Utensils } from "lucide-react";
import Link from "next/link";

interface HomeSearchShowcaseProps {
  topCities: City[];
}

const ease = [0.16, 1, 0.3, 1] as const;

const intentModes = [
  {
    icon: Compass,
    label: "Find a city",
    detail: "Start with a name, region, or travel mood.",
  },
  {
    icon: CloudSun,
    label: "Compare climates",
    detail: "Use weather and comfort signals before you commit.",
  },
  {
    icon: Moon,
    label: "Plan the timing",
    detail: "Read seasonal notes and live conditions together.",
  },
  {
    icon: Utensils,
    label: "Follow local texture",
    detail: "Move from landmarks into dining, stays, and saved notes.",
  },
];

const trendingSignals = [
  "Strong first shortlist",
  "Culture-rich baseline",
  "Easy planning entry",
  "Live guide ready",
  "Urban scale signal",
  "Good comparison anchor",
];

export default function HomeSearchShowcase({ topCities }: HomeSearchShowcaseProps) {
  const shouldReduceMotion = useReducedMotion();
  const cityPreview = topCities.slice(0, 6);

  return (
    <motion.section
      id="discovery"
      initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
      whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, ease }}
      className="grid gap-10 pb-16 sm:pb-20 lg:grid-cols-[minmax(0,1.08fr)_minmax(20rem,0.92fr)] lg:items-start lg:gap-12 lg:pb-24"
      aria-labelledby="discovery-heading"
    >
      <div className="lg:sticky lg:top-24">
        <p className="section-heading">Intent-first discovery</p>
        <h2
          id="discovery-heading"
          className="text-foreground mt-4 max-w-xl text-[clamp(1.9rem,3.6vw,3.35rem)] leading-[1.02]"
        >
          Tell the atlas what kind of trip you are trying to shape.
        </h2>
        <p className="text-muted mt-4 max-w-lg text-sm leading-relaxed md:text-base">
          Search stays simple up front. The richer signals appear as you move from choosing a
          destination to comparing, saving, and planning.
        </p>

        <div className="mt-7">
          <CitySearch topCities={topCities} />
        </div>
      </div>

      <div className="space-y-5">
        <div className="flow-grid">
          {intentModes.map(({ icon: Icon, label, detail }, index) => (
            <motion.article
              key={label}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
              whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.42, delay: shouldReduceMotion ? 0 : index * 0.05, ease }}
              className="intent-card rounded-[1.25rem] p-4 sm:p-5"
            >
              <Icon className="text-accent h-4 w-4" aria-hidden />
              <h3 className="text-foreground mt-4 text-base leading-tight">{label}</h3>
              <p className="text-muted mt-2 text-sm leading-relaxed">{detail}</p>
            </motion.article>
          ))}
        </div>

        <div className="organic-panel destination-story-card rounded-[1.6rem] p-5 sm:p-6">
          <div>
            <p className="source-chip">
              <MapPinned className="h-3.5 w-3.5" aria-hidden />
              Trending guides
            </p>
            <h3 className="text-foreground mt-4 max-w-md text-3xl leading-none">
              Start with a city that already has context.
            </h3>
          </div>
          <div className="mt-6 space-y-0 lg:mt-0">
            {cityPreview.map((city, index) => (
              <Link
                key={city.id}
                href={`/cities/${city.id}?lat=${city.lat}&lng=${city.lng}`}
                className="group border-line flex items-center justify-between gap-4 border-b py-3.5 last:border-b-0"
              >
                <div className="flex items-baseline gap-3">
                  <span className="text-muted text-xs tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="text-foreground text-lg leading-tight">{city.city}</h3>
                    <p className="text-muted text-sm">
                      {city.country} / {trendingSignals.at(index) ?? "Guide ready"}
                    </p>
                  </div>
                </div>
                <span className="text-muted group-hover:text-foreground text-xs font-medium transition-colors">
                  &rarr;
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="border-line terrain-lines rounded-[1.4rem] border p-5 sm:p-6">
          <p className="text-muted text-xs font-medium tracking-wider uppercase">
            What makes this different
          </p>
          <div className="mt-4 grid gap-3">
            {[
              {
                title: "Signals stay visible",
                text: "Climate, scale, places, and sourcing remain close to the decision.",
              },
              {
                title: "AI is labeled",
                text: "Machine synthesis is framed as assistance, never hidden authority.",
              },
              {
                title: "Planning remains personal",
                text: "Saved places and notes live on your device without an account gate.",
              },
            ].map(({ title, text }) => (
              <div key={title} className="border-line bg-surface/72 rounded-[1rem] border p-4">
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

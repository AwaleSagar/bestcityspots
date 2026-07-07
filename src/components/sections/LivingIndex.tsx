import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { CSSProperties } from "react";
import CityFingerprint from "@/components/ui/CityFingerprint";
import { getCityAtmosphere } from "@/lib/atmosphere";
import { getCityWeather, type WeatherData } from "@/lib/weather";
import { cache } from "react";
import type { City } from "@/lib/cities";

const getCachedWeather = cache(getCityWeather);

/**
 * Living Index — the homepage's data-driven featured-cities band (redesign
 * 2026 H2, B1). Replaces icon-card monotony with six cities rendered through
 * their own live atmosphere: the City Fingerprint glyph sits on a sky-phase +
 * temperature-tinted field, so the band reads differently at dawn, dusk, and
 * midnight, and warmer/colder cities carry their own color.
 *
 * Server component. Weather is fetched via the cached `getCityWeather` (these
 * are the most-viewed cities, so cache hits dominate). Privacy: no per-visitor
 * data — city selection comes from the aggregate audience-demand feed.
 */
interface LivingIndexProps {
  cities: City[];
}

/**
 * Phase-based fallback tint for cards where weather is unavailable. Cooler
 * than the temperature tint — keeps every card atmospheric without a weather
 * dependency (CWV-safe: no extra fetch required).
 */
function phaseFallbackTint(phase: string): string {
  switch (phase) {
    case "dawn":
      return "oklch(0.72 0.08 35 / 0.10)";
    case "dusk":
      return "oklch(0.62 0.10 300 / 0.10)";
    case "night":
      return "oklch(0.5 0.08 250 / 0.14)";
    default:
      return "oklch(0.7 0.06 90 / 0.08)"; // day — warm paper
  }
}

function cityHref(city: City): string {
  return city.slug ? `/cities/${city.slug}` : `/cities/${city.id}`;
}

function formatTemp(tempC: number | null | undefined): string {
  if (tempC == null || !Number.isFinite(tempC)) return "";
  return `${Math.round(tempC)}°`;
}

export default async function LivingIndex({ cities }: LivingIndexProps) {
  if (cities.length === 0) return null;

  // Parallel cached weather fetch — these cities are warmed, so cache hits
  // dominate and the Promise resolves fast. Promise.allSettled so one
  // failure never blanks the whole band.
  const weatherResults = await Promise.allSettled(cities.map((c) => getCachedWeather(c)));

  return (
    <section className="section-stack" aria-labelledby="living-index-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl">
          <p className="source-chip">Living index</p>
          <h2 id="living-index-heading" className="text-foreground section-title mt-3">
            Cities on the atlas right now.
          </h2>
          <p className="text-muted mt-2 max-w-md text-sm leading-relaxed md:text-base">
            Featured by reader demand, each rendered through its own live sky and temperature.
          </p>
        </div>
        <Link
          href="/resources/top-cities"
          className="text-muted hover:text-accent-strong group inline-flex shrink-0 items-center gap-1 text-sm font-medium transition-colors"
        >
          See the Global 50
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>

      <ul className="card-grid" role="list">
        {cities.map((city, index) => {
          // index is the bounded map index into weatherResults (a settled-result
          // array parallel to cities), not dynamic input.
          // eslint-disable-next-line security/detect-object-injection
          const result = weatherResults[index];
          const weather: WeatherData | null = result.status === "fulfilled" ? result.value : null;
          const atmosphere = getCityAtmosphere({
            lat: city.lat,
            lng: city.lng,
            tempC: weather?.temp,
          });
          const tint =
            atmosphere.tint !== "transparent"
              ? atmosphere.tint
              : phaseFallbackTint(atmosphere.phase);
          const cardStyle = {
            "--living-tint": tint,
          } as CSSProperties;
          const tempLabel = formatTemp(weather?.temp);

          return (
            <li key={city.id}>
              <Link
                href={cityHref(city)}
                className="interactive-card intent-card group flex h-full flex-col justify-between overflow-hidden p-5"
                style={cardStyle}
              >
                {/* Live-tinted atmosphere field — a soft radial wash driven by
                    the city's current sky phase + temperature. CSS-only, no
                    image load, so six of these stay cheap for INP/LCP. */}
                <div
                  className="pointer-events-none absolute inset-0 -z-10 opacity-80"
                  style={{
                    background:
                      "radial-gradient(120% 90% at 80% 0%, var(--living-tint), transparent 70%)",
                  }}
                  aria-hidden
                />

                <div className="flex items-start justify-between gap-3">
                  <CityFingerprint
                    city={{
                      id: city.id,
                      lat: city.lat,
                      lng: city.lng,
                      population: city.population,
                    }}
                    className="h-12 w-12 shrink-0 transition-transform duration-500 group-hover:scale-105"
                  />
                  {tempLabel && (
                    <span className="text-muted text-sm font-medium tabular-nums">{tempLabel}</span>
                  )}
                </div>

                <div className="mt-6">
                  <h3 className="text-foreground text-base leading-snug font-semibold">
                    {city.city_ascii}
                  </h3>
                  <p className="text-muted mt-0.5 text-sm">{city.country}</p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

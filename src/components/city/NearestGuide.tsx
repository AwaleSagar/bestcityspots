import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cityHref, getTopCities, type City } from "@/lib/cities";
import { haversineKm } from "@/lib/geo";

/**
 * US-01: point visitors of lightweight profiles at the nearest city with a
 * full guide — computed against the warmed top-250 set; one memoized DB read,
 * no providers.
 */
export async function NearestGuide({ city }: { city: City }) {
  const top = await getTopCities(250);
  let best: { candidate: City; km: number } | null = null;
  for (const candidate of top) {
    if (candidate.id === city.id) continue;
    if (typeof candidate.lat !== "number" || typeof candidate.lng !== "number") continue;
    const km = haversineKm(city.lat, city.lng, candidate.lat, candidate.lng);
    if (!best || km < best.km) best = { candidate, km };
  }
  if (!best) return null;

  return (
    <Link
      href={cityHref(best.candidate)}
      className="group border-rule bg-surface ease-standard hover:border-accent flex items-center justify-between gap-6 rounded-md border p-5 transition-colors duration-150 sm:p-6"
    >
      <span>
        <span className="text-ink-muted block text-sm">Nearest full guide</span>
        <span className="font-display group-hover:text-accent mt-1 block text-2xl">
          {best.candidate.city}, {best.candidate.country}
        </span>
        <span className="text-ink-muted mt-1 block text-sm">
          About {Math.round(best.km).toLocaleString("en-US")} km away — with an overview, places and
          seasons.
        </span>
      </span>
      <ArrowRight aria-hidden className="text-ink-subtle group-hover:text-accent size-5 shrink-0" />
    </Link>
  );
}

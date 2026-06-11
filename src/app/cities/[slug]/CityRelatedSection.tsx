import { Suspense } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { City } from "@/lib/cities";
import { cityHref } from "@/lib/cities";
import { getRelatedCities, slugifyCountry } from "@/lib/countries";
import { formatPopulation } from "@/lib/format";

interface CityRelatedSectionProps {
  city: City;
}

async function RelatedContent({ city }: { city: City }) {
  const related = await getRelatedCities(city.id, city.country, 6);
  if (related.length === 0) return null;

  return (
    <section className="space-y-6" aria-labelledby="related-cities-heading">
      <h2 id="related-cities-heading" className="labelled-rule">
        More cities in {city.country}
      </h2>
      <p className="text-muted-strong text-sm">
        Explore other guides nearby — same-country recommendations linked through to live
        weather, AQI, and AI-assisted briefings.
      </p>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {related.map((c) => (
          <li key={c.id}>
            <Link
              href={cityHref(c)}
              className="border-line bg-surface/65 hover:bg-surface text-foreground group flex items-center justify-between gap-4 rounded-lg border px-4 py-3 transition-colors"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{c.city}</span>
                <span className="text-muted block truncate text-xs">
                  {c.admin_name ? `${c.admin_name}, ${c.country}` : c.country}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="text-muted text-xs font-semibold tracking-[0.18em] uppercase">
                  {formatPopulation(c.population)}
                </span>
                <ArrowUpRight
                  className="text-muted group-hover:text-accent h-4 w-4 transition-colors"
                  aria-hidden
                />
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-muted text-xs">
        <Link
          href={`/countries/${slugifyCountry(city.country)}`}
          className="text-accent hover:underline"
        >
          See all cities in {city.country} →
        </Link>
      </p>
    </section>
  );
}

export default function CityRelatedSection({ city }: CityRelatedSectionProps) {
  return (
    <Suspense fallback={null}>
      <RelatedContent city={city} />
    </Suspense>
  );
}

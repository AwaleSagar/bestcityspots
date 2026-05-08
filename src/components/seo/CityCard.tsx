import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { cityHref, type City } from "@/lib/cities";
import { formatPopulation } from "@/lib/format";

interface CityCardProps {
  city: Pick<City, "id" | "slug" | "city" | "country" | "admin_name" | "population">;
  /** Optional contextual line shown under the country line (e.g. AQI band). */
  context?: string | null;
}

/**
 * Compact card used by the SEO Phase 2.3 hub pages (countries, topical
 * hubs, `/cities` index). Lives in `src/components/seo/` so it is clear
 * the visual is shared *only* by SEO-driven hub surfaces and not by any
 * editorial component on the home page.
 */
export default function CityCard({ city, context }: CityCardProps) {
  return (
    <Link
      href={cityHref(city)}
      className="border-line bg-surface/65 hover:bg-surface text-foreground group flex items-center justify-between gap-4 rounded-[1.1rem] border px-4 py-3 transition-colors duration-200"
    >
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-base font-semibold tracking-tight">{city.city}</h3>
        <p className="text-muted truncate text-xs">
          <MapPin className="mr-1 inline h-3 w-3" aria-hidden />
          {city.admin_name ? `${city.admin_name}, ${city.country}` : city.country}
        </p>
        {context ? (
          <p className="text-muted-strong mt-1 truncate text-[11px] tracking-wide uppercase">
            {context}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-muted text-[11px] font-semibold tracking-[0.18em] uppercase">
          {formatPopulation(city.population)}
        </span>
        <ArrowUpRight
          className="text-muted group-hover:text-accent h-4 w-4 transition-colors"
          aria-hidden
        />
      </div>
    </Link>
  );
}

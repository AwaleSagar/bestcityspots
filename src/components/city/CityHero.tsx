import Link from "next/link";
import type { ReactNode } from "react";
import { Scale } from "lucide-react";
import type { City } from "@/lib/cities";
import { capitalLabel, formatCoordinates } from "@/lib/city-display";
import { slugifyCountry } from "@/lib/countries";
import { formatPopulation } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { buttonClasses } from "@/components/ui/Button";
import { ShareButton } from "./ShareButton";

interface CityHeroProps {
  city: City;
  canonical: string;
  lightweight?: boolean;
  /** Live conditions strip (streams in). */
  glance: ReactNode;
}

export function CityHero({ city, canonical, lightweight = false, glance }: CityHeroProps) {
  const capital = capitalLabel(city.capital);
  const facts = [
    city.population ? `${formatPopulation(city.population)} people` : null,
    capital,
    formatCoordinates(city.lat, city.lng),
  ].filter(Boolean);

  return (
    <header className="border-rule grid gap-8 border-b pt-6 pb-10 sm:pt-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-end lg:gap-12">
      <div>
        <Breadcrumbs
          items={[{ label: "Cities", href: "/resources/top-cities" }, { label: city.city }]}
        />
        <p className="text-ink-muted mt-8 text-sm">
          {city.admin_name ? `${city.admin_name}, ` : null}
          <Link
            href={`/countries/${slugifyCountry(city.country)}`}
            className="hover:text-ink underline-offset-4 hover:underline"
          >
            {city.country}
          </Link>
        </p>
        <h1 className="text-display mt-2 break-words">{city.city}</h1>
        <p className="text-ink-muted mt-4 flex flex-wrap gap-x-2 text-sm">
          {facts.map((fact, index) => (
            <span key={fact} className="inline-flex gap-2">
              {index > 0 ? <span aria-hidden>·</span> : null}
              <span className="tabular-nums">{fact}</span>
            </span>
          ))}
        </p>
        {lightweight ? (
          <p className="text-ink-muted mt-4 flex max-w-xl flex-wrap items-center gap-2 text-sm">
            <Badge tone="outline">Lightweight profile</Badge>
            Verified facts and live conditions only — full guides cover the most-visited cities.
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href={city.slug ? `/compare?cities=${city.slug}` : "/compare"}
            className={buttonClasses()}
          >
            <Scale aria-hidden />
            Compare
          </Link>
          <ShareButton url={canonical} title={`${city.city} travel guide — Best City Spots`} />
        </div>
      </div>
      <div>{glance}</div>
    </header>
  );
}

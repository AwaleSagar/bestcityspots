import Link from "next/link";
import type { City } from "@/lib/cities";
import { getRelatedCities, slugifyCountry } from "@/lib/countries";
import { buttonClasses } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";
import { CityCard } from "./CityCard";

/** SEO Phase 2.3: related cities keep the guide from being a crawl dead end. */
export async function RelatedCities({ city }: { city: City }) {
  const related = await getRelatedCities(city.id, city.country, 6).catch(() => []);
  const countryHref = `/countries/${slugifyCountry(city.country)}`;
  if (related.length === 0) {
    return (
      <p className="text-sm">
        <Link href={countryHref} className={buttonClasses({ variant: "link" })}>
          More about travel in {city.country}
        </Link>
      </p>
    );
  }
  return (
    <Section
      id="related"
      title={`More in ${city.country}`}
      actions={
        <Link href={countryHref} className={buttonClasses({ variant: "link" })}>
          All cities in {city.country}
        </Link>
      }
    >
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {related.map((other) => (
          <li key={other.id}>
            <CityCard city={other} />
          </li>
        ))}
      </ul>
    </Section>
  );
}

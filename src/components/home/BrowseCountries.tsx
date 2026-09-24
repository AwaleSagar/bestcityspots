import Link from "next/link";
import { getCountrySummaries } from "@/lib/countries";
import { buttonClasses } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";

export async function BrowseCountries() {
  const countries = await getCountrySummaries().catch(() => []);
  if (countries.length === 0) return null;
  return (
    <Section
      id="countries"
      title="Browse by country"
      actions={
        <Link href="/countries" className={buttonClasses({ variant: "link" })}>
          All {countries.length} countries
        </Link>
      }
    >
      <ul className="grid grid-cols-2 gap-x-8 sm:grid-cols-3 lg:grid-cols-4">
        {countries.slice(0, 12).map((country) => (
          <li key={country.slug}>
            <Link
              href={`/countries/${country.slug}`}
              className="border-rule hover:text-accent flex min-h-11 items-baseline justify-between gap-3 border-b py-2.5"
            >
              <span className="truncate">{country.country}</span>
              <span className="text-ink-muted shrink-0 text-xs tabular-nums">
                {country.cityCount} {country.cityCount === 1 ? "city" : "cities"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}

import Link from "next/link";
import type { CountrySummary } from "@/lib/countries";

export function CountryChips({ countries }: { countries: readonly CountrySummary[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {countries.map((country) => (
        <li key={country.slug}>
          <Link
            href={`/countries/${country.slug}`}
            className="border-rule bg-surface ease-standard hover:border-rule-strong hover:text-accent inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm transition-colors duration-150 pointer-coarse:h-11"
          >
            {country.country}
            <span className="text-ink-muted text-xs tabular-nums">{country.cityCount}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

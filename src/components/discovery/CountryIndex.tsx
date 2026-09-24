import Link from "next/link";
import type { CountrySummary } from "@/lib/countries";

function letterOf(name: string) {
  const letter = name.normalize("NFD").replace(/[̀-ͯ]/g, "").charAt(0).toUpperCase();
  return /[A-Z]/.test(letter) ? letter : "#";
}

/** A–Z index of countries with a jump bar. */
export function CountryIndex({ countries }: { countries: readonly CountrySummary[] }) {
  const groups = new Map<string, CountrySummary[]>();
  for (const country of [...countries].sort((a, b) => a.country.localeCompare(b.country))) {
    const letter = letterOf(country.country);
    groups.set(letter, [...(groups.get(letter) ?? []), country]);
  }
  const letters = [...groups.keys()];

  return (
    <div>
      <nav
        aria-label="Jump to letter"
        className="border-rule bg-paper sticky top-16 z-20 -mx-4 border-b px-4 py-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
      >
        <ul className="scroll-x flex gap-1">
          {letters.map((letter) => (
            <li key={letter}>
              <a
                href={`#letter-${letter}`}
                className="text-ink-muted hover:bg-sunken hover:text-ink inline-flex size-9 items-center justify-center rounded-md text-sm font-medium pointer-coarse:size-11"
              >
                {letter}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-8 space-y-10">
        {[...groups.entries()].map(([letter, list]) => (
          <section
            key={letter}
            id={`letter-${letter}`}
            aria-labelledby={`letter-${letter}-title`}
            className="scroll-mt-32"
          >
            <h2 id={`letter-${letter}-title`} className="text-h2 text-ink-subtle">
              {letter}
            </h2>
            <ul className="border-rule mt-3 grid gap-x-8 border-t sm:grid-cols-2 lg:grid-cols-3">
              {list.map((country) => (
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
          </section>
        ))}
      </div>
    </div>
  );
}

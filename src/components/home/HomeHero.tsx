import { Suspense } from "react";
import Link from "next/link";
import { fetchTrendingDestinations } from "@/app/actions";
import { cityHref } from "@/lib/city-href";
import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";
import { SearchField } from "@/components/search/SearchField";
import { Graticule } from "./Graticule";

async function TrendingChips() {
  const cities = await fetchTrendingDestinations().catch(() => []);
  if (cities.length === 0) return null;
  return (
    <div className="mt-5 flex flex-wrap items-center gap-2">
      <span className="text-ink-muted mr-1 text-sm">Trending</span>
      {cities.slice(0, 5).map((city) => (
        <Link
          key={city.id}
          href={cityHref(city)}
          className="border-rule bg-surface ease-standard hover:border-rule-strong hover:text-accent inline-flex h-9 items-center rounded-full border px-3.5 text-sm transition-colors duration-150 pointer-coarse:h-11"
        >
          {city.city}
        </Link>
      ))}
    </div>
  );
}

function TrendingChipsFallback() {
  return (
    <div aria-hidden className="mt-5 flex gap-2">
      {["w-22", "w-18", "w-24", "w-20"].map((width) => (
        <Skeleton key={width} className={`h-9 rounded-full ${width}`} />
      ))}
    </div>
  );
}

export function HomeHero() {
  return (
    <section aria-labelledby="home-title" className="border-rule relative overflow-hidden border-b">
      <Graticule className="graticule pointer-events-none absolute top-1/2 -right-40 hidden w-[44rem] -translate-y-1/2 md:block lg:-right-16 lg:w-[48rem]" />
      <Container className="relative py-14 sm:py-20 lg:py-28">
        <p className="text-accent text-sm font-medium">City guides for deliberate travelers</p>
        <h1 id="home-title" className="text-display mt-4 max-w-3xl">
          Choose your next city with the facts in view.
        </h1>
        <p className="text-lede text-ink-muted mt-5 max-w-xl">
          Live weather and air quality, a clearly labelled AI briefing, and places ranked by what
          travelers actually rate — every source named.
        </p>
        <div className="mt-8 max-w-2xl">
          <SearchField
            size="lg"
            showLocate
            label="Search for a city"
            placeholder="Where to? Try Lisbon, Kyoto or Oaxaca"
          />
        </div>
        <Suspense fallback={<TrendingChipsFallback />}>
          <TrendingChips />
        </Suspense>
      </Container>
    </section>
  );
}

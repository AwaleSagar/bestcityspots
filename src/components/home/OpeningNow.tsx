import { cache } from "react";
import { fetchLivingIndexCities } from "@/app/actions";
import { formatTemperature } from "@/lib/city-display";
import { getCityWeather } from "@/lib/weather";
import { Section } from "@/components/ui/Section";
import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";
import { AqiBadge } from "@/components/city/AqiBadge";
import { CityRow } from "@/components/city/CityRow";

const getCachedWeather = cache(getCityWeather);

const LIST_CLASS = "grid border-t border-rule lg:grid-flow-col lg:grid-rows-3 lg:gap-x-12";

/**
 * The cities this site's own visitors opened most in the last 30 days
 * (aggregate counts only), each with current conditions. Falls back to the
 * trending feed inside fetchLivingIndexCities; hidden when both are empty.
 */
export async function OpeningNow() {
  const cities = await fetchLivingIndexCities().catch(() => []);
  if (cities.length === 0) return null;
  const weather = await Promise.allSettled(cities.map((city) => getCachedWeather(city)));

  return (
    <Section
      id="opening-now"
      title="Travelers are opening now"
      description="The most-viewed guides on Best City Spots over the last 30 days, with live conditions."
    >
      <ol className={LIST_CLASS}>
        {cities.map((city, index) => {
          const result = weather.at(index);
          const current = result?.status === "fulfilled" ? result.value : null;
          const temp = formatTemperature(current?.temp);
          return (
            <CityRow
              key={city.id}
              city={city}
              rank={index + 1}
              meta={
                current ? (
                  <span className="text-ink-muted flex items-center gap-3">
                    {temp ? (
                      <span className="text-ink font-medium tabular-nums">{temp}</span>
                    ) : null}
                    <AqiBadge
                      aqi={current.aqi}
                      label={current.aqi_label}
                      className="hidden sm:inline-flex"
                    />
                  </span>
                ) : null
              }
            />
          );
        })}
      </ol>
    </Section>
  );
}

export function OpeningNowFallback() {
  return (
    <LoadingRegion label="Loading the most-viewed cities">
      <Skeleton className="h-8 w-80 max-w-full" />
      <div className="border-rule mt-6 grid border-t lg:grid-flow-col lg:grid-rows-3 lg:gap-x-12">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="border-rule flex min-h-16 items-center gap-4 border-b py-3">
            <Skeleton className="h-6 w-8" />
            <div className="flex-1 space-y-2">
              <Skeleton className="w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

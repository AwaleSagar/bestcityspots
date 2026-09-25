import { getPlaceSaveTotals } from "@/lib/place-saves";
import { getTopPlaces } from "@/lib/places";
import { publicEnv } from "@/lib/env";
import { serializeJsonLd } from "@/lib/json-ld";
import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";
import { buildPlacesJsonLd } from "@/app/cities/[slug]/city-data";
import { PlacesExplorer } from "./PlacesExplorer";

interface PlacesSectionProps {
  cityId: number;
  cityName: string;
  lat: number;
  lng: number;
}

/**
 * Loads the three place lists + anonymous save counts, emits Place JSON-LD
 * for what is shown, and hands off to the client explorer.
 *
 * Cost: `allowProviderFetch` only opts in — the call is still gated by
 * isPaidProviderEnabled() (kill switch + daily budget), so production with
 * live fetch off stays cache-only.
 */
export async function PlacesSection({ cityId, cityName, lat, lng }: PlacesSectionProps) {
  const options = { lat, lng, allowProviderFetch: true } as const;
  const city = { id: cityId, name: cityName };
  const [landmarks, restaurants, hotels] = await Promise.all([
    getTopPlaces(city, "landmarks", options),
    getTopPlaces(city, "restaurants", options),
    getTopPlaces(city, "hotels", options),
  ]);
  console.info(
    `[city-page] PlacesSection(${cityName}): landmarks=${landmarks.length} restaurants=${restaurants.length} hotels=${hotels.length}`
  );
  const all = [...landmarks, ...restaurants, ...hotels];
  const saveCounts = await getPlaceSaveTotals(all.map((place) => place.id));
  const jsonLd = buildPlacesJsonLd(all);

  return (
    <>
      {jsonLd["@graph"].length > 0 ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
        />
      ) : null}
      <PlacesExplorer
        cityName={cityName}
        centerLat={lat}
        centerLng={lng}
        places={{ landmarks, restaurants, hotels }}
        saveCounts={saveCounts}
        bookingAffiliateId={publicEnv().NEXT_PUBLIC_BOOKING_AFFILIATE_ID}
      />
    </>
  );
}

export function PlacesSkeleton() {
  return (
    <LoadingRegion label="Loading places">
      <div className="border-rule flex gap-2 border-b pb-2">
        {[0, 1, 2].map((key) => (
          <Skeleton key={key} className="h-8 w-20" />
        ))}
      </div>
      <div className="mt-6 space-y-3">
        {[0, 1, 2].map((key) => (
          <div key={key} className="border-rule flex gap-4 rounded-md border p-4">
            <Skeleton className="size-24 shrink-0 rounded-md sm:h-27 sm:w-36" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

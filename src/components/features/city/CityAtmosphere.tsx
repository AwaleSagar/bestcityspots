import Image from "next/image";
import type { CSSProperties } from "react";
import { getCityAtmosphere } from "@/lib/atmosphere";
import type { WeatherData } from "@/lib/weather";

interface CityAtmosphereProps {
  lat: number;
  lng: number;
  /**
   * The page's request-cached weather promise (share the same `cache()`
   * wrapper the vitals use so this adds zero extra fetches). Rejections and
   * nulls degrade to a tint-free sky.
   */
  weatherPromise: Promise<WeatherData | null>;
}

/**
 * Living Atlas (UI innovation proposal, Idea 1): a decorative, weather- and
 * daylight-reactive backdrop behind the city-page hero. Server component —
 * ships zero JS. Render inside <Suspense fallback={null}> so the page never
 * waits on it; it fades in when the (cached) weather resolves.
 *
 * Visiting a city at its local dusk shows the dusk plate regardless of the
 * visitor's own clock — the page feels like the city right now.
 */
export default async function CityAtmosphere({ lat, lng, weatherPromise }: CityAtmosphereProps) {
  const weather = await weatherPromise.catch(() => null);
  const atmosphere = getCityAtmosphere({
    lat,
    lng,
    tempC: weather?.temp ?? null,
    windSpeed: weather?.wind_speed ?? null,
  });

  return (
    <div
      className="atlas-atmosphere"
      aria-hidden="true"
      data-phase={atmosphere.phase}
      style={
        {
          "--atlas-tint": atmosphere.tint,
          "--atlas-drift-duration": `${atmosphere.driftSeconds}s`,
        } as CSSProperties
      }
    >
      <Image
        src={atmosphere.plateSrc}
        alt=""
        fill
        sizes="100vw"
        quality={70}
        loading="lazy"
        className="atlas-atmosphere-img"
      />
      <div className="atlas-atmosphere-veil" />
    </div>
  );
}

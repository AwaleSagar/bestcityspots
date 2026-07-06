"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookMarked, MapPin, StickyNote } from "lucide-react";
import { cityHref, type City } from "@/lib/cities";
import { getJsonStorageItem } from "@/lib/storage";
import CityFingerprint from "@/components/ui/CityFingerprint";
import {
  SAVED_PLACES_STORAGE_KEY,
  type SavedPlace,
} from "@/app/cities/[slug]/experience-helpers";

const RECENT_KEY = "atlas_recent_searches";

/**
 * Atlas Passport (innovation proposal Idea 8): a local-only record of the
 * cities you've explored — fingerprint glyphs as stamps, saved places as
 * expedition marks. Calm gamification: no streaks, no leaderboards, nothing
 * leaves the device. Reads the same localStorage the search and experiences
 * surfaces already maintain.
 */
export default function PassportContent() {
  const [cities, setCities] = useState<City[]>([]);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const recents = getJsonStorageItem<City[]>(RECENT_KEY, []);
    const places = getJsonStorageItem<SavedPlace[]>(SAVED_PLACES_STORAGE_KEY, []);
    queueMicrotask(() => {
      setCities(recents);
      setSavedPlaces(places);
      setLoaded(true);
    });
  }, []);

  const savesByCity = useMemo(() => {
    const map = new Map<string, number>();
    for (const place of savedPlaces) {
      map.set(place.city, (map.get(place.city) ?? 0) + 1);
    }
    return map;
  }, [savedPlaces]);

  const hasStamps = cities.length > 0 || savedPlaces.length > 0;

  return (
    <div
      className="container-gutter mx-auto max-w-5xl px-4 py-12 sm:px-6"
      style={{ paddingTop: "max(4rem, calc(env(safe-area-inset-top, 0px) + 5rem))" }}
    >
      <header className="atlas-frame overflow-hidden rounded-2xl sm:rounded-3xl">
        <div className="relative">
          <Image
            src="/illustrations/passport-cover.webp"
            alt=""
            width={1600}
            height={1000}
            priority={false}
            className="h-44 w-full object-cover opacity-90 sm:h-56"
          />
          <div className="from-background/95 absolute inset-0 bg-gradient-to-t to-transparent" />
        </div>
        <div className="p-5 pt-0 sm:p-8 sm:pt-0">
          <span className="eyebrow">
            <BookMarked className="text-accent h-3.5 w-3.5" aria-hidden />
            Atlas Passport
          </span>
          <h1 className="page-title text-foreground mt-4">Your quiet record of exploration.</h1>
          <p className="lede mt-4 max-w-2xl">
            Every city you research stamps itself here, and every place you save adds an
            expedition mark. This passport lives only in this browser — no account, no cloud, no
            streaks to keep.
          </p>
        </div>
      </header>

      {!loaded ? null : hasStamps ? (
        <>
          <section className="mt-12" aria-labelledby="passport-stamps-heading">
            <h2 id="passport-stamps-heading" className="labelled-rule">
              City stamps
            </h2>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {cities.map((city) => {
                const saves = savesByCity.get(city.city) ?? 0;
                return (
                  <Link
                    key={city.id}
                    href={cityHref(city, { lat: city.lat, lng: city.lng })}
                    className="passport-stamp group"
                  >
                    <CityFingerprint
                      city={{
                        id: city.id,
                        lat: city.lat,
                        lng: city.lng,
                        population: city.population,
                      }}
                      className="h-16 w-16"
                    />
                    <span className="mt-3 block truncate text-sm font-bold tracking-tight">
                      {city.city}
                    </span>
                    <span className="text-muted block truncate text-xs">{city.country}</span>
                    {saves > 0 && (
                      <span className="text-accent-strong mt-2 inline-flex items-center gap-1 text-xs font-semibold">
                        <MapPin className="h-3 w-3" aria-hidden />
                        {saves} saved {saves === 1 ? "place" : "places"}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>

          {savedPlaces.length > 0 && (
            <section className="mt-12" aria-labelledby="passport-marks-heading">
              <h2 id="passport-marks-heading" className="labelled-rule">
                Expedition marks
              </h2>
              <p className="text-muted mt-4 text-sm">
                {savedPlaces.length} saved {savedPlaces.length === 1 ? "place" : "places"} across{" "}
                {savesByCity.size} {savesByCity.size === 1 ? "city" : "cities"}. Open a city stamp
                to revisit its shortlist.
              </p>
            </section>
          )}

          <p className="text-muted mt-12 flex items-center gap-2 text-xs">
            <StickyNote className="h-3.5 w-3.5" aria-hidden />
            Stored on this device only. Clearing browser data clears the passport.
          </p>
        </>
      ) : (
        <section className="mt-12 flex flex-col items-center gap-6 text-center">
          <Image
            src="/illustrations/passport-stamps.svg"
            alt=""
            width={280}
            height={280}
            className="mixer-empty-art h-52 w-52"
          />
          <div>
            <h2 className="text-xl font-bold tracking-tight">No stamps yet.</h2>
            <p className="text-muted mx-auto mt-2 max-w-md text-sm leading-relaxed">
              Search a city and open its guide — it will stamp itself here automatically. Save a
              few places and they become expedition marks.
            </p>
          </div>
          <Link href="/" className="btn-secondary group">
            Start exploring
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </section>
      )}
    </div>
  );
}

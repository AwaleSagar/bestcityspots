import "server-only";

import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { getCityById, getCityBySlug, type City } from "@/lib/cities";
import type { FAQItem } from "@/lib/city-faq";
import { readCachedCityInsight } from "@/lib/intelligence";
import type { Landmark } from "@/lib/places";
import { getCityMetrics } from "@/lib/metrics";
import { getSiteUrl } from "@/lib/site";
import { cityIdSchema, citySlugSchema, numericIdParam } from "@/lib/validation";
import { getCityWeather } from "@/lib/weather";
import { readPlacesCache } from "@/platform/data-access/places-cache-repository";

/**
 * Data + SEO logic for /cities/[slug], kept apart from the view so the
 * rendering can change without touching crawl/cost behavior. Every rule here
 * was carried over unchanged from the previous page implementation.
 */

// Request-scoped caches so generateMetadata + page body share one DB query.
export const getCachedCityBySlug = cache(getCityBySlug);
export const getCachedCityById = cache(getCityById);
export const getCachedCityWeather = cache(getCityWeather);
export const getCachedCityMetrics = cache(getCityMetrics);
export const getCachedInsightRead = cache(readCachedCityInsight);

/**
 * US-01 (audit AF-3): a city is "warm" when at least one substantive cached
 * layer exists (AI insight or places). Cache-only reads — this check can
 * never trigger a paid provider call. Request-scoped so generateMetadata and
 * the page body share one lookup.
 */
export const isCityWarm = cache(async (city: City): Promise<boolean> => {
  const [insight, places] = await Promise.all([
    getCachedInsightRead(city.id)
      .then((read) => read.insight)
      .catch(() => null),
    readPlacesCache(city.city, "landmarks").catch(() => null),
  ]);
  const warm = Boolean(insight || places);
  console.info(
    `[city-page] isCityWarm(${city.city}#${city.id}): insight=${Boolean(insight)} placesCache=${Boolean(places)} -> warm=${warm}`
  );
  return warm;
});

/**
 * Resolve the unified `[slug]` route param.
 *
 * SEO Phase 1 (T1, T3): the route accepts both legacy numeric ids
 * (`/cities/123`) and canonical slugs (`/cities/lisbon-portugal`). A numeric
 * id redirects to the canonical slug URL so external links and previously
 * published sitemap entries consolidate into a single canonical URL.
 */
export async function resolveCityFromSegment(
  segment: string,
  searchSuffix: string
): Promise<City | null> {
  if (numericIdParam.test(segment)) {
    const idResult = cityIdSchema.safeParse(segment);
    if (!idResult.success) notFound();
    const legacyCity = await getCachedCityById(idResult.data);
    if (!legacyCity) notFound();
    if (legacyCity.slug && legacyCity.slug.length > 0) {
      redirect(`/cities/${legacyCity.slug}${searchSuffix}`);
    }
    // No slug yet on this row (pre-migration) — render at the legacy URL.
    return legacyCity;
  }

  const slugResult = citySlugSchema.safeParse(segment);
  if (!slugResult.success) notFound();
  return getCachedCityBySlug(slugResult.data);
}

export function buildCanonicalUrl(city: { slug?: string; id: number }) {
  const segment = city.slug && city.slug.length > 0 ? city.slug : String(city.id);
  return `${getSiteUrl()}/cities/${segment}`;
}

// Meta description sizing: Google generally truncates around 160 chars on
// desktop. We leave a small buffer and prefer cutting at word boundaries.
const META_DESC_MIN_LENGTH = 60;
const META_DESC_MAX_LENGTH = 158;
const META_DESC_TRUNCATE_AT = 155;
// Lower bound for the word-boundary backtrack — below this we'd produce a
// suspiciously short description, so just hard-cut at the character limit.
const META_DESC_WORD_BOUNDARY_FLOOR = 100;

/**
 * Trim and clamp the AI-generated intro to a meta-description-friendly
 * length. Falls back to a templated string when the cached insight is
 * missing or too short to be useful.
 */
export function deriveCityDescription(
  insight: { intro?: string } | null,
  cityName: string,
  countryName: string
) {
  const raw = insight?.intro?.trim();
  if (raw && raw.length >= META_DESC_MIN_LENGTH) {
    if (raw.length <= META_DESC_MAX_LENGTH) return raw;
    const cut = raw.slice(0, META_DESC_TRUNCATE_AT);
    const lastSpace = cut.lastIndexOf(" ");
    const trimmed = lastSpace > META_DESC_WORD_BOUNDARY_FLOOR ? cut.slice(0, lastSpace) : cut;
    return `${trimmed.replace(/[.,;:\s]+$/, "")}…`;
  }
  return `${cityName} travel guide with live weather, neighborhoods, AI-assisted briefings, and curated places in ${countryName}.`;
}

export function buildTouristJsonLd(city: City, canonical: string) {
  return {
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    name: city.city,
    url: canonical,
    description: `Detailed travel metrics and insights for ${city.city}, ${city.country}.`,
    geo: {
      "@type": "GeoCoordinates",
      latitude: city.lat,
      longitude: city.lng,
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: city.city,
      addressCountry: city.country,
    },
    containedInPlace: {
      "@type": "Country",
      name: city.country,
    },
  };
}

// SEO Phase 1 (5.5): mirror the visual breadcrumbs as JSON-LD so search
// engines can render rich breadcrumb chips on the SERP.
export function buildBreadcrumbJsonLd(city: City, canonical: string) {
  const siteUrl = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: "Cities",
        item: `${siteUrl}/resources/top-cities`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: `${city.city}, ${city.country}`,
        item: canonical,
      },
    ],
  };
}

/**
 * SEO Phase 2.2 (audit 5.5): `Place` + `AggregateRating` for the places
 * actually displayed, sourced from the same Google Places data as the
 * visible cards (a Google requirement for rich results).
 */
export function buildPlacesJsonLd(places: readonly Landmark[]) {
  return {
    "@context": "https://schema.org",
    "@graph": places
      .filter(
        (place) =>
          typeof place.userRatingCount === "number" &&
          place.userRatingCount > 0 &&
          typeof place.rating === "number"
      )
      .slice(0, 15)
      .map((place) => ({
        "@type": "Place",
        name: place.displayName?.text,
        address: place.formattedAddress,
        ...(place.googleMapsUri ? { url: place.googleMapsUri } : {}),
        ...(place.location?.latitude && place.location?.longitude
          ? {
              geo: {
                "@type": "GeoCoordinates",
                latitude: place.location.latitude,
                longitude: place.location.longitude,
              },
            }
          : {}),
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: place.rating,
          reviewCount: place.userRatingCount,
          bestRating: 5,
          worstRating: 1,
        },
      })),
  };
}

export function buildFaqJsonLd(faqs: readonly FAQItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

// SEO Phase 2.2: SpeakableSpecification surfaces the FAQ block to voice
// assistants. Tied to a stable DOM id so the structured-data target matches
// the rendered surface.
export const SPEAKABLE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  speakable: {
    "@type": "SpeakableSpecification",
    cssSelector: ["#city-faq-summary"],
  },
};

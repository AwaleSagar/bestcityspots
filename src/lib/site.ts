import { publicEnv } from "./env";

/**
 * Site identity + absolute URL helpers shared by metadata, JSON-LD and the
 * UI. Client-safe (reads only public env).
 */

export const SITE_NAME = "Best City Spots";

export const SITE_TAGLINE = "City guides with the sources in view";

/** Canonical origin without a trailing slash. */
export function getSiteUrl(): string {
  return (publicEnv().NEXT_PUBLIC_SITE_URL ?? "https://bestcityspots.com").replace(/\/$/, "");
}

export function absoluteUrl(path: string): string {
  return `${getSiteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

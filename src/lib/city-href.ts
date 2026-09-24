import type { City } from "./cities";

/**
 * Dependency-free (type-only import) so client components can link to city
 * guides without bundling the Supabase client and zod.
 *
 * Build the canonical, slug-based path to a city page. Falls back to the
 * numeric id when slug is missing — the city route then 308-redirects to the
 * canonical URL so search engines and shared links converge regardless.
 */
export function cityHref(city: Pick<City, "id" | "slug">, query?: { lat?: number; lng?: number }) {
  const segment = city.slug && city.slug.length > 0 ? city.slug : String(city.id);
  const search =
    query && typeof query.lat === "number" && typeof query.lng === "number"
      ? `?lat=${query.lat}&lng=${query.lng}`
      : "";
  return `/cities/${segment}${search}`;
}

import { z } from "zod";

/**
 * Common Zod schemas for input validation.
 * Use these schemas in Server Actions and API routes to ensure data integrity and security.
 */

// Basic safe string (trims and ensures min length)
export const safeString = z.string().trim().min(1, "Required");

// Email validation
export const emailSchema = z.string().email("Invalid email address").trim().toLowerCase();

// Strong password policy (min 8 chars, mixed case, numbers/symbols optional but recommended)
// Adjust complexity based on requirements.
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password is too long");

// UUID validation for database lookups
export const uuidSchema = z.string().uuid("Invalid ID format");

// City ID validation (Integer)
export const cityIdSchema = z.coerce.number().int().positive("City ID must be a positive integer");

// City slug validation: lowercase, dashes, alphanumerics. Bounded length to
// keep route params well-behaved on every CDN.
export const citySlugSchema = z
  .string()
  .trim()
  .min(1, "Slug is required")
  .max(120, "Slug is too long")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug must contain only lowercase letters, numbers, and single dashes between segments"
  );

// Discriminator for the unified `[slug]` route param: a purely-numeric
// segment is treated as a legacy city id (and 308-redirected to the
// canonical slug URL), anything else is a slug.
export const numericIdParam = /^\d+$/;

// Coordinate validation
export const coordinatesSchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});

// Pagination params
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Search query sanitizer (removes likely malicious characters if needed, usage depends on context)
export const searchQuerySchema = z.string().trim().max(100);

export const placeTypeSchema = z.enum(["landmarks", "restaurants", "hotels"]);

export const placePriceTierSchema = z.enum([
  "free",
  "inexpensive",
  "moderate",
  "expensive",
  "very_expensive",
]);

export const placeSortSchema = z.enum(["relevance", "rating", "reviews", "distance"]);

export const placeSearchSchema = z.object({
  cityName: safeString.max(120, "City name is too long"),
  type: placeTypeSchema.optional(),
  query: searchQuerySchema.optional(),
  minRating: z.coerce.number().min(0).max(5).default(0),
  maxPriceTier: placePriceTierSchema.optional(),
  sortBy: placeSortSchema.default("relevance"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(1).max(50).default(25),
});

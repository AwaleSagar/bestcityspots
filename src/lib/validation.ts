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

// Coordinate validation
export const coordinatesSchema = z.object({
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
});


// Pagination params
export const paginationSchema = z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
});

// Search query sanitizer (removes likely malicious characters if needed, usage depends on context)
export const searchQuerySchema = z.string().trim().max(100);

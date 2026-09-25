/* eslint-disable */
/**
 * Verification for src/lib/validation.ts.
 * Run: tsx scripts/test-validation.ts
 */
import {
  safeString,
  emailSchema,
  passwordSchema,
  uuidSchema,
  cityIdSchema,
  citySlugSchema,
  coordinatesSchema,
  paginationSchema,
  searchQuerySchema,
  placeTypeSchema,
  placePriceTierSchema,
  placeSortSchema,
  placeSearchSchema,
  numericIdParam,
} from "../src/lib/validation";

let failures = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    console.log(`  ✓ ${name}`);
  } else {
    failures += 1;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

console.log("safeString verification");
{
  check("valid safe string passes", safeString.safeParse("San Francisco").success === true);
  check("trimming leading/trailing spaces", safeString.safeParse("  Tokyo  ").data === "Tokyo");
  check("empty strings fail", safeString.safeParse("").success === false);
  check("spaces only fail", safeString.safeParse("   ").success === false);
}

console.log("emailSchema verification");
{
  check("valid email passes", emailSchema.safeParse("user@example.com").success === true);
  check(
    "whitespace trimming & lowercase formatting on emails",
    emailSchema.safeParse("  User@Example.Com  ").data === "user@example.com"
  );
  check("invalid email format fails", emailSchema.safeParse("invalid-email").success === false);
}

console.log("passwordSchema verification");
{
  check("valid 8+ char password passes", passwordSchema.safeParse("password123").success === true);
  check("7 char password fails", passwordSchema.safeParse("secret1").success === false);
  check(
    "extremely long password (>100 chars) fails",
    passwordSchema.safeParse("a".repeat(101)).success === false
  );
}

console.log("uuidSchema verification");
{
  check(
    "valid UUID passes",
    uuidSchema.safeParse("123e4567-e89b-12d3-a456-426614174000").success === true
  );
  check("invalid UUID style fails", uuidSchema.safeParse("invalid-uuid-format").success === false);
}

console.log("cityIdSchema verification");
{
  check("valid city ID positive integer passes", cityIdSchema.safeParse(42).success === true);
  check(
    "string representation of number is coerced",
    cityIdSchema.safeParse("42").success === true && cityIdSchema.safeParse("42").data === 42
  );
  check("negative integer city ID fails", cityIdSchema.safeParse(-5).success === false);
  check("floating point city ID fails", cityIdSchema.safeParse(4.2).success === false);
}

console.log("citySlugSchema verification");
{
  check("valid city slug passes", citySlugSchema.safeParse("san-francisco").success === true);
  check(
    "valid numeric-suffix slug passes",
    citySlugSchema.safeParse("tokyo-2026").success === true
  );
  check(
    "untrimmed slug is trimmed and parsed",
    citySlugSchema.safeParse("   london-uk   ").data === "london-uk"
  );
  check(
    "slug with multiple continuous dashes fails",
    citySlugSchema.safeParse("new--york").success === false
  );
  check(
    "slug with uppercase letters fails",
    citySlugSchema.safeParse("New-York").success === false
  );
  check(
    "slug with symbols/spaces fails",
    citySlugSchema.safeParse("tokyo_japan").success === false
  );
  check(
    "extremely long slug (>120 chars) fails",
    citySlugSchema.safeParse("a".repeat(121)).success === false
  );
}

console.log("numericIdParam discriminator");
{
  check("pure numeric param matches numericIdParam", numericIdParam.test("12345") === true);
  check(
    "alphanumeric slug does not match numericIdParam",
    numericIdParam.test("london-12345") === false
  );
}

console.log("coordinatesSchema verification");
{
  check(
    "valid coordinates pass",
    coordinatesSchema.safeParse({ lat: 37.7749, lng: -122.4194 }).success === true
  );
  check(
    "valid coordinates as strings are coerced",
    coordinatesSchema.safeParse({ lat: "37.7749", lng: "-122.4194" }).success === true
  );
  check(
    "latitude boundary max (90) passes",
    coordinatesSchema.safeParse({ lat: 90, lng: 0 }).success === true
  );
  check(
    "latitude over 90 fails",
    coordinatesSchema.safeParse({ lat: 90.1, lng: 0 }).success === false
  );
  check(
    "longitude boundary min (-180) passes",
    coordinatesSchema.safeParse({ lat: 0, lng: -180 }).success === true
  );
  check(
    "longitude under -180 fails",
    coordinatesSchema.safeParse({ lat: 0, lng: -180.1 }).success === false
  );
}

console.log("paginationSchema verification");
{
  check(
    "default values apply",
    paginationSchema.safeParse({}).data?.page === 1 &&
      paginationSchema.safeParse({}).data?.limit === 20
  );
  check(
    "custom pagination values parsed",
    paginationSchema.safeParse({ page: "5", limit: "50" }).data?.page === 5 &&
      paginationSchema.safeParse({ page: "5", limit: "50" }).data?.limit === 50
  );
  check("limiting max limit to 100", paginationSchema.safeParse({ limit: 101 }).success === false);
}

console.log("searchQuerySchema verification");
{
  check(
    "valid max-length query passes",
    searchQuerySchema.safeParse("famous landmarks").success === true
  );
  check(
    "extremely long query (>100 chars) fails",
    searchQuerySchema.safeParse("q".repeat(101)).success === false
  );
}

console.log("placeSearchSchema verification");
{
  const validSearch = {
    cityId: "2988507",
    type: "landmarks",
    query: "Eiffel",
    minRating: 4.5,
    maxPriceTier: "moderate",
    sortBy: "rating",
    page: 2,
    limit: 15,
    lat: 48.8566,
    lng: 2.3522,
    radiusKm: 10,
  };
  check(
    "complex search specification is valid",
    placeSearchSchema.safeParse(validSearch).success === true
  );
  check(
    "unsupported type fails",
    placeSearchSchema.safeParse({ ...validSearch, type: "spas" }).success === false
  );
  check(
    "invalid rating (> 5) fails",
    placeSearchSchema.safeParse({ ...validSearch, minRating: 5.5 }).success === false
  );
  check(
    "invalid sorting criteria fails",
    placeSearchSchema.safeParse({ ...validSearch, sortBy: "popularity" }).success === false
  );
  check(
    "missing cityId fails (the cache is keyed by city id)",
    placeSearchSchema.safeParse({ ...validSearch, cityId: undefined }).success === false
  );
  check(
    "non-numeric cityId fails",
    placeSearchSchema.safeParse({ ...validSearch, cityId: "paris" }).success === false
  );
}

if (failures > 0) {
  console.error(`\nValidation verification failed with ${failures} failure(s)`);
  process.exit(1);
} else {
  console.log("\nAll validation schema tests passed successfully!");
  process.exit(0);
}

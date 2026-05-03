import { NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "node:crypto";
import { getTopCities } from "@/lib/cities";
import {
  getMixedCitiesFromCategories,
  getCitiesFromCategory,
  SPHERE_CATEGORIES,
} from "@/lib/sphere-categories";

const SphereQuerySchema = z.object({
  limit: z.coerce.number().int().min(10).max(200).default(120),
  mode: z.enum(["categories", "population", "category"]).default("categories"),
  category: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = SphereQuerySchema.safeParse({
      limit: searchParams.get("limit") ?? undefined,
      mode: searchParams.get("mode") ?? undefined,
      category: searchParams.get("category") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const { limit, mode, category } = parsed.data;

    // `category` mode requires the category param — reject explicitly rather
    // than silently returning an empty payload that masks the misuse.
    if (mode === "category" && !category) {
      return NextResponse.json(
        { error: "`category` query param is required when mode=category" },
        { status: 400 }
      );
    }

    let labels: string[] = [];

    switch (mode) {
      case "category":
        // Single category mode
        if (category) {
          labels = getCitiesFromCategory(category).slice(0, limit);
        }
        break;

      case "population": {
        // Legacy mode: top cities by population
        const cities = await getTopCities(limit);
        labels = cities
          .map((c) => c.city)
          .filter((s) => typeof s === "string" && s.trim().length > 0);
        break;
      }

      case "categories":
      default:
        // Default: diverse mix from all categories
        labels = getMixedCitiesFromCategories(limit);
        break;
    }

    const body = {
      labels,
      limit: labels.length,
      mode,
      categories: SPHERE_CATEGORIES.map((c) => ({ id: c.id, label: c.label, emoji: c.emoji })),
    };

    // ETag = SHA-1 hash of the payload. SHA-1 is used here only as a fast
    // non-cryptographic fingerprint for cache validation — not for security.
    const etag = `"${createHash("sha1").update(JSON.stringify(body)).digest("hex").slice(0, 16)}"`;
    const ifNoneMatch = req.headers.get("if-none-match");
    const cacheControl =
      mode === "population"
        ? "public, s-maxage=3600, stale-while-revalidate=86400"
        : "public, s-maxage=86400, stale-while-revalidate=604800";
    if (ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": cacheControl,
        },
      });
    }

    return NextResponse.json(body, {
      headers: {
        "Cache-Control": cacheControl,
        ETag: etag,
      },
    });
  } catch (error) {
    console.error("[cities/sphere] Route failed:", error);
    return NextResponse.json(
      {
        error: "sphere_route_failed",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

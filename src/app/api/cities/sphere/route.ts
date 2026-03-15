import { NextResponse } from "next/server";
import { z } from "zod";
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
  const { searchParams } = new URL(req.url);
  const parsed = SphereQuerySchema.safeParse({
    limit: searchParams.get("limit") ?? undefined,
    mode: searchParams.get("mode") ?? undefined,
    category: searchParams.get("category") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid parameters" },
      { status: 400 }
    );
  }

  const { limit, mode, category } = parsed.data;

  let labels: string[] = [];

  switch (mode) {
    case "category":
      // Single category mode
      if (category) {
        labels = getCitiesFromCategory(category).slice(0, limit);
      }
      break;

    case "population":
      // Legacy mode: top cities by population
      const cities = await getTopCities(limit);
      labels = cities
        .map((c) => c.city)
        .filter((s) => typeof s === "string" && s.trim().length > 0);
      break;

    case "categories":
    default:
      // Default: diverse mix from all categories
      labels = getMixedCitiesFromCategories(limit);
      break;
  }

  return NextResponse.json(
    {
      labels,
      limit: labels.length,
      mode,
      categories: SPHERE_CATEGORIES.map((c) => ({ id: c.id, label: c.label, emoji: c.emoji })),
    },
    {
      headers: {
        // Cache at the edge for a day; city list doesn't change frequently.
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    }
  );
}


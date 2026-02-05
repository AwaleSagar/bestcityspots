import { NextResponse } from "next/server";
import { getTopCities } from "@/lib/cities";
import {
  getMixedCitiesFromCategories,
  getCitiesFromCategory,
  SPHERE_CATEGORIES,
} from "@/lib/sphere-categories";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limitRaw = searchParams.get("limit");
  const mode = searchParams.get("mode") || "categories"; // "categories" | "population" | "category"
  const category = searchParams.get("category"); // specific category ID

  const limit = (() => {
    const n = Number(limitRaw);
    if (!Number.isFinite(n)) return 120;
    return Math.max(10, Math.min(200, Math.floor(n)));
  })();

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


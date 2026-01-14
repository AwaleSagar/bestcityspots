import { NextResponse } from "next/server";
import { getTopCities } from "@/lib/cities";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limitRaw = searchParams.get("limit");
  const includeCountry = searchParams.get("includeCountry") === "1";

  const limit = (() => {
    const n = Number(limitRaw);
    if (!Number.isFinite(n)) return 120;
    return Math.max(10, Math.min(200, Math.floor(n)));
  })();

  const cities = await getTopCities(limit);
  const labels = cities
    .map((c) => (includeCountry ? `${c.city}, ${c.country}` : c.city))
    .filter((s) => typeof s === "string" && s.trim().length > 0);

  return NextResponse.json(
    { labels, limit: labels.length },
    {
      headers: {
        // Cache at the edge for a day; city list doesn't change frequently.
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    }
  );
}


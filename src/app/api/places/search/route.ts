import { NextRequest, NextResponse } from "next/server";
import { placeSearchSchema } from "@/lib/validation";
import { searchPlaces } from "@/lib/places";

const REQUEST_TIMEOUT_MS = 25_000;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const parsed = placeSearchSchema.safeParse({
      cityName: searchParams.get("cityName") ?? undefined,
      type: searchParams.get("type") ?? undefined,
      query: searchParams.get("query") ?? undefined,
      minRating: searchParams.get("minRating") ?? undefined,
      maxPriceTier: searchParams.get("maxPriceTier") ?? undefined,
      sortBy: searchParams.get("sortBy") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      lat: searchParams.get("lat") ?? undefined,
      lng: searchParams.get("lng") ?? undefined,
      radiusKm: searchParams.get("radiusKm") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid search parameters", details: parsed.error.issues },
        { status: 400 }
      );
    }

    // Bound the cold path so we surface 504 before serverless kills us with a generic error.
    const data = await Promise.race([
      searchPlaces(parsed.data),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), REQUEST_TIMEOUT_MS)
      ),
    ]);

    return NextResponse.json(
      {
        ...data,
        hasMore: data.page * data.limit < data.total,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1800",
        },
      }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "timeout") {
      console.warn("[places/search] Request timed out");
      return NextResponse.json({ error: "Request timed out" }, { status: 504 });
    }
    console.error("[places/search] Request failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

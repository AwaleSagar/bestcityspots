import { NextRequest, NextResponse } from "next/server";
import { placeSearchSchema } from "@/lib/validation";
import { searchPlaces } from "@/lib/places";

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

    const data = await searchPlaces(parsed.data);

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
    console.error("[places/search] Request failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { placeSearchSchema } from "@/lib/validation";
import { searchPlaces } from "@/lib/places";

const REQUEST_TIMEOUT_MS = 25_000;

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export async function GET(request: NextRequest) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

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
      // No `details`: echoing Zod issues hands an unauthenticated caller the
      // internal schema shape for free.
      return NextResponse.json({ error: "Invalid search parameters" }, { status: 400 });
    }

    const data = await searchPlaces({ ...parsed.data, signal: controller.signal });
    const hasCoordinates =
      typeof parsed.data.lat === "number" && typeof parsed.data.lng === "number";

    return NextResponse.json(
      {
        ...data,
        hasMore: data.page * data.limit < data.total,
      },
      {
        headers: {
          "Cache-Control": hasCoordinates
            ? "private, max-age=60"
            : "public, s-maxage=300, stale-while-revalidate=1800",
        },
      }
    );
  } catch (error) {
    if (isAbortError(error)) {
      console.warn("[places/search] Request timed out");
      return NextResponse.json({ error: "Request timed out" }, { status: 504 });
    }
    console.error("[places/search] Request failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    clearTimeout(timeout);
  }
}

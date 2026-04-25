import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { AnalyticsPayloadSchema, processAnalyticsBatch } from "@/lib/analytics";

// =============================================================================
// Route Handler — thin: validate, delegate, respond
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    if (!supabaseServer) {
      return NextResponse.json({ error: "Analytics service unavailable" }, { status: 503 });
    }

    // Reject oversized payloads early to protect the service.
    const contentLengthHeader = request.headers.get("content-length");
    if (contentLengthHeader) {
      const contentLength = Number(contentLengthHeader);
      if (Number.isFinite(contentLength) && contentLength > 64 * 1024) {
        return NextResponse.json({ error: "Payload too large" }, { status: 413 });
      }
    }

    const body = await request.json();
    const result = AnalyticsPayloadSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: result.error.issues },
        { status: 400 }
      );
    }

    // Fire-and-forget: all DB writes happen in the background
    processAnalyticsBatch(result.data.events, {
      userAgent: request.headers.get("user-agent") || "",
      referrer: request.headers.get("referer") || result.data.events[0]?.referrer || null,
      countryCode: request.headers.get("x-vercel-ip-country") || null,
      countryName:
        request.headers.get("x-vercel-ip-country-region") ||
        request.headers.get("x-vercel-ip-country") ||
        null,
      city: request.headers.get("x-vercel-ip-city") || null,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[analytics] Request processing failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Disable caching for analytics endpoint
export const dynamic = "force-dynamic";

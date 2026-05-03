import { after, NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { AnalyticsPayloadSchema, processAnalyticsBatch } from "@/lib/analytics";

const MAX_PAYLOAD_BYTES = 64 * 1024;

async function readJsonBodyWithLimit(request: NextRequest) {
  const reader = request.body?.getReader();
  if (!reader) return null;

  const chunks: Uint8Array[] = [];
  let size = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_PAYLOAD_BYTES) {
      return { tooLarge: true as const };
    }
    chunks.push(value);
  }

  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return { value: JSON.parse(new TextDecoder().decode(body)) as unknown };
}

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
      if (Number.isFinite(contentLength) && contentLength > MAX_PAYLOAD_BYTES) {
        return NextResponse.json({ error: "Payload too large" }, { status: 413 });
      }
    }

    const body = await readJsonBodyWithLimit(request);
    if (body?.tooLarge) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    const result = AnalyticsPayloadSchema.safeParse(body?.value);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: result.error.issues },
        { status: 400 }
      );
    }

    const countryCode = request.headers.get("x-vercel-ip-country") || null;
    const metadata = {
      userAgent: request.headers.get("user-agent") || "",
      referrer: request.headers.get("referer") || result.data.events[0]?.referrer || null,
      countryCode,
      countryName: countryCode,
      city: request.headers.get("x-vercel-ip-city") || null,
    };

    after(() => {
      processAnalyticsBatch(result.data.events, metadata).catch((error) => {
        console.error("[analytics] Background processing failed:", error);
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[analytics] Request processing failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Disable caching for analytics endpoint
export const dynamic = "force-dynamic";

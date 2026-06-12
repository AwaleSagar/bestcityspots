import { NextResponse } from "next/server";
import { z } from "zod";
import { recordPlaceSave } from "@/lib/place-saves";

// US-12 (audit AF-6): fire-and-forget save counter. Anonymous by design —
// the payload is a place id and nothing else; no cookies are read, no
// session or IP is persisted. Rate limiting is handled at the nginx /api/
// zone (deploy/nginx/bestcityspots.conf).

const BodySchema = z.object({
  placeId: z.string().regex(/^[A-Za-z0-9_-]{4,128}$/),
});

const MAX_BODY_BYTES = 512;

export async function POST(request: Request): Promise<NextResponse> {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const body = BodySchema.safeParse(parsed);
  if (!body.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Best-effort: a failed increment must never surface to the user flow.
  await recordPlaceSave(body.data.placeId);
  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}

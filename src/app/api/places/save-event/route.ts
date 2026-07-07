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

// Reads the request body as text but aborts the instant it exceeds the cap,
// so an oversized body is rejected without first being buffered entirely
// into memory (the previous `await request.text()` read the whole payload
// before the size check could fire).
async function readBodyWithLimit(
  request: Request
): Promise<{ tooLarge: true } | { value: string }> {
  const reader = request.body?.getReader();
  if (!reader) return { value: "" };

  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      return { tooLarge: true };
    }
    chunks.push(value);
  }

  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { value: new TextDecoder().decode(body) };
}

export async function POST(request: Request): Promise<NextResponse> {
  // Reject oversized payloads early via the declared content length.
  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader) {
    const contentLength = Number(contentLengthHeader);
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }
  }

  const body = await readBodyWithLimit(request);
  if ("tooLarge" in body) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body.value);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = BodySchema.safeParse(parsed);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Best-effort: a failed increment must never surface to the user flow.
  await recordPlaceSave(result.data.placeId);
  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}

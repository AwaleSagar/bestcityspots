import { NextRequest } from "next/server";
import { z } from "zod";
import { getCityById } from "@/lib/cities";
import {
  CityInsightSchema,
  buildCityInsightPrompt,
  readCachedCityInsight,
  upsertCityInsight,
  generateTextStream,
  sanitizeJsonResponse,
  isAIEnabled,
  type CityInsight,
} from "@/lib/intelligence";
import { cityIdSchema } from "@/lib/validation";
import { createLogger } from "@/lib/logger";

const log = createLogger({ component: "api/cities/insight" });

// Server-Sent Events: needs Node runtime so Gemini SDK + Supabase service
// client work as expected. Static export not applicable.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  cityId: cityIdSchema,
});

type SsePayload =
  | { type: "stale"; insight: CityInsight }
  | { type: "chunk"; text: string }
  | { type: "complete"; insight: CityInsight }
  | { type: "error"; reason: string };

function sse(payload: SsePayload): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export async function GET(req: NextRequest) {
  let cityId: number;
  try {
    const parsed = querySchema.parse({
      cityId: req.nextUrl.searchParams.get("cityId"),
    });
    cityId = parsed.cityId;
  } catch {
    return new Response("Invalid cityId", { status: 400 });
  }

  const city = await getCityById(cityId);
  if (!city) {
    return new Response("City not found", { status: 404 });
  }

  const cacheRead = await readCachedCityInsight(cityId);

  // Fast path: cache fresh — emit a single complete event and close.
  if (cacheRead.fresh && cacheRead.insight) {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(sse({ type: "complete", insight: cacheRead.insight! })));
        controller.close();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  // Either engine being enabled is enough — the facade handles fallback.
  if (!isAIEnabled()) {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        if (cacheRead.insight) {
          controller.enqueue(encoder.encode(sse({ type: "complete", insight: cacheRead.insight })));
        } else {
          controller.enqueue(encoder.encode(sse({ type: "error", reason: "ai_disabled" })));
        }
        controller.close();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  // Cold/stale path: stream Gemini.
  const aiStart = await generateTextStream(buildCityInsightPrompt(city));
  if (!aiStart.ok) {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        // If we have a stale cache row, hand it back so the UI can render
        // something instead of blanking out.
        if (cacheRead.insight) {
          controller.enqueue(encoder.encode(sse({ type: "complete", insight: cacheRead.insight })));
        } else {
          controller.enqueue(encoder.encode(sse({ type: "error", reason: aiStart.reason })));
        }
        controller.close();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  const correlationId = aiStart.correlationId;

  // Flipped by the stream's cancel() when the client navigates away. The
  // streaming loop checks it so we stop pulling (and paying for) Gemini
  // tokens that nobody will receive, instead of draining the whole response.
  let clientDisconnected = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      let accumulated = "";

      // Surface any stale row immediately so the client has a non-empty
      // baseline while fresh tokens arrive.
      if (cacheRead.insight && !cacheRead.fresh) {
        controller.enqueue(encoder.encode(sse({ type: "stale", insight: cacheRead.insight })));
      }

      try {
        for await (const piece of aiStart.stream) {
          if (clientDisconnected) return;
          accumulated += piece;
          controller.enqueue(encoder.encode(sse({ type: "chunk", text: piece })));
        }
      } catch (err) {
        log.warn("stream_aborted", {
          correlationId,
          cityId,
          error: err instanceof Error ? err.message : String(err),
        });
        if (cacheRead.insight) {
          controller.enqueue(encoder.encode(sse({ type: "complete", insight: cacheRead.insight })));
        } else {
          controller.enqueue(encoder.encode(sse({ type: "error", reason: "stream_aborted" })));
        }
        controller.close();
        return;
      }

      // Client left before the response completed — discard the partial
      // payload and skip the cache write; there is no one left to serve it.
      if (clientDisconnected) {
        controller.close();
        return;
      }

      // Validate full payload, persist on success.
      try {
        const rawJson = sanitizeJsonResponse(accumulated);
        const parsed = CityInsightSchema.parse(JSON.parse(rawJson));
        upsertCityInsight(city, parsed);
        controller.enqueue(encoder.encode(sse({ type: "complete", insight: parsed })));
      } catch (e) {
        log.warn("ai_parse_failed", {
          correlationId,
          cityId,
          error: e instanceof Error ? e.message : String(e),
        });
        if (cacheRead.insight) {
          controller.enqueue(encoder.encode(sse({ type: "complete", insight: cacheRead.insight })));
        } else {
          controller.enqueue(encoder.encode(sse({ type: "error", reason: "parse_failed" })));
        }
      }
      controller.close();
    },
    cancel() {
      // Fired by the platform when the downstream Response is cancelled
      // (client closed the connection). start() bails at its next checkpoint
      // instead of continuing to consume the provider stream.
      clientDisconnected = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

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
import { tryClaimOnDemandAiUse } from "@/lib/cost-guard";
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

const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
} as const;

/** Emit a single SSE event and close — used by every non-streaming outcome. */
function sseOnce(payload: SsePayload): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(sse(payload)));
      controller.close();
    },
  });
  return new Response(stream, { headers: SSE_HEADERS });
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
    return sseOnce({ type: "complete", insight: cacheRead.insight });
  }

  // Either engine being enabled is enough — the facade handles fallback.
  if (!isAIEnabled()) {
    return sseOnce(
      cacheRead.insight
        ? { type: "complete", insight: cacheRead.insight }
        : { type: "error", reason: "ai_disabled" }
    );
  }

  // SECURITY (audit M-2): this endpoint is unauthenticated and generates for
  // any city whose cached insight is cold or stale, so it is the one request
  // path where a visitor can spend provider budget. Claim from the separate,
  // smaller on-demand envelope first — the engine's own budget is still
  // claimed inside the provider module, so an attacker walking a list of
  // uncached cities can burn at most AI_ON_DEMAND_DAILY_CALL_LIMIT calls and
  // never starve the nightly warmer. Denial degrades exactly like a provider
  // outage: stale cache if we have one, otherwise an SSE error event.
  if (!(await tryClaimOnDemandAiUse(`city_insight:${cityId}`))) {
    log.info("on_demand_budget_exhausted", { cityId, hasStale: Boolean(cacheRead.insight) });
    return sseOnce(
      cacheRead.insight
        ? { type: "complete", insight: cacheRead.insight }
        : { type: "error", reason: "rate_limit" }
    );
  }

  // Cold/stale path: stream Gemini.
  const aiStart = await generateTextStream(buildCityInsightPrompt(city));
  if (!aiStart.ok) {
    // If we have a stale cache row, hand it back so the UI can render
    // something instead of blanking out.
    return sseOnce(
      cacheRead.insight
        ? { type: "complete", insight: cacheRead.insight }
        : { type: "error", reason: aiStart.reason }
    );
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

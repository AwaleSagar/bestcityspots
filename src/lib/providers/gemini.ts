/**
 * Google Gemini provider.
 *
 * Owns the AI SDK, the model name, and the current prompt version. Every
 * prompt string is paired with a `promptVersion` integer. Bumping the number
 * is the signal to cache readers that stored responses are stale and should
 * be refreshed.
 */
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createLogger, newCorrelationId } from "../logger";
import { serverEnv } from "../env";
import { tryClaimPaidProviderUse } from "../cost-guard";

const log = createLogger({ component: "provider/gemini" });
const PROVIDER = "gemini";

/** Increment when a prompt or expected response shape changes. */
export const PROMPT_VERSIONS = {
  CITY_INSIGHT: 2,
  TRENDING_CITIES: 3,
} as const;

const MODEL = "gemini-3-flash-preview";
const GENERATE_TIMEOUT_MS = 15_000;

let cached: GoogleGenerativeAI | null | undefined;

function getClient(): GoogleGenerativeAI | null {
  if (cached !== undefined) return cached;
  const key = serverEnv().GOOGLE_GEMINI_API_KEY;
  cached = key ? new GoogleGenerativeAI(key) : null;
  return cached;
}

export type GeminiResult =
  | { ok: true; text: string; correlationId: string }
  | { ok: false; reason: "auth" | "rate_limit" | "error"; correlationId: string };

export async function generateText(prompt: string): Promise<GeminiResult> {
  const correlationId = newCorrelationId();
  const client = getClient();
  if (!client) {
    return { ok: false, reason: "auth", correlationId };
  }
  if (!tryClaimPaidProviderUse(PROVIDER, "generateText")) {
    return { ok: false, reason: "rate_limit", correlationId };
  }
  try {
    const model = client.getGenerativeModel({ model: MODEL });
    // Bound the call so a hung model response can't block the caller forever.
    const result = await model.generateContent(prompt, {
      signal: AbortSignal.timeout(GENERATE_TIMEOUT_MS),
    } as { signal: AbortSignal });
    // SDK's response.text() is synchronous; await is harmless but redundant.
    const text = result.response.text();
    log.debug("ok", { correlationId, length: text.length });
    return { ok: true, text, correlationId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.warn("exception", { correlationId, provider: PROVIDER, error: message });
    // Distinguish quota / rate-limit errors so the cache layer can decide to
    // serve stale data instead of treating it as a generic upstream failure.
    const lower = message.toLowerCase();
    if (lower.includes("429") || lower.includes("quota") || lower.includes("rate limit")) {
      return { ok: false, reason: "rate_limit", correlationId };
    }
    return { ok: false, reason: "error", correlationId };
  }
}

export type GeminiStreamStart =
  | { ok: true; correlationId: string; stream: AsyncIterable<string> }
  | { ok: false; reason: "auth" | "rate_limit" | "error"; correlationId: string };

/**
 * Streaming variant of `generateText`. Yields incremental text chunks as
 * Gemini emits them. Caller is responsible for accumulating the full text
 * and validating it once the stream completes.
 */
export async function generateTextStream(prompt: string): Promise<GeminiStreamStart> {
  const correlationId = newCorrelationId();
  const client = getClient();
  if (!client) {
    return { ok: false, reason: "auth", correlationId };
  }
  if (!tryClaimPaidProviderUse(PROVIDER, "generateTextStream")) {
    return { ok: false, reason: "rate_limit", correlationId };
  }
  try {
    const model = client.getGenerativeModel({ model: MODEL });
    const result = await model.generateContentStream(prompt, {
      signal: AbortSignal.timeout(GENERATE_TIMEOUT_MS),
    } as { signal: AbortSignal });

    async function* iterate(): AsyncIterable<string> {
      let totalLen = 0;
      try {
        for await (const chunk of result.stream) {
          const piece = chunk.text();
          if (piece) {
            totalLen += piece.length;
            yield piece;
          }
        }
        log.debug("stream.ok", { correlationId, length: totalLen });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log.warn("stream.exception", { correlationId, provider: PROVIDER, error: message });
        throw err;
      }
    }

    return { ok: true, correlationId, stream: iterate() };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.warn("exception", { correlationId, provider: PROVIDER, error: message });
    const lower = message.toLowerCase();
    if (lower.includes("429") || lower.includes("quota") || lower.includes("rate limit")) {
      return { ok: false, reason: "rate_limit", correlationId };
    }
    return { ok: false, reason: "error", correlationId };
  }
}

/**
 * Extract the first balanced JSON value (object or array) from a raw AI
 * response, stripping any markdown fencing or surrounding commentary.
 */
function extractBalancedJson(raw: string, openCh: "{" | "[", closeCh: "}" | "]"): string {
  const fenced = raw.replace(/```json|```/gi, "").trim();
  const start = fenced.indexOf(openCh);
  if (start === -1) return fenced;
  let depth = 0;
  for (let i = start; i < fenced.length; i += 1) {
    const ch = fenced.charAt(i);
    if (ch === openCh) depth += 1;
    else if (ch === closeCh) {
      depth -= 1;
      if (depth === 0) return fenced.slice(start, i + 1);
    }
  }
  return fenced;
}

export function sanitizeJsonResponse(raw: string): string {
  return extractBalancedJson(raw, "{", "}");
}

export function sanitizeJsonArrayResponse(raw: string): string {
  return extractBalancedJson(raw, "[", "]");
}

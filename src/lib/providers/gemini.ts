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

const log = createLogger({ component: "provider/gemini" });
const PROVIDER = "gemini";

/** Increment when a prompt or expected response shape changes. */
export const PROMPT_VERSIONS = {
  CITY_INSIGHT: 2,
  TRENDING_CITIES: 2,
} as const;

const MODEL = "gemini-3-flash-preview";

let cached: GoogleGenerativeAI | null | undefined;

function getClient(): GoogleGenerativeAI | null {
  if (cached !== undefined) return cached;
  const key = serverEnv().GOOGLE_GEMINI_API_KEY;
  cached = key ? new GoogleGenerativeAI(key) : null;
  return cached;
}

export type GeminiResult =
  | { ok: true; text: string; correlationId: string }
  | { ok: false; reason: "auth" | "error"; correlationId: string };

export async function generateText(prompt: string): Promise<GeminiResult> {
  const correlationId = newCorrelationId();
  const client = getClient();
  if (!client) {
    return { ok: false, reason: "auth", correlationId };
  }
  try {
    const model = client.getGenerativeModel({ model: MODEL });
    const result = await model.generateContent(prompt);
    const text = await result.response.text();
    log.debug("ok", { correlationId, length: text.length });
    return { ok: true, text, correlationId };
  } catch (err) {
    log.warn("exception", {
      correlationId,
      provider: PROVIDER,
      error: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, reason: "error", correlationId };
  }
}

/**
 * Extract the first balanced JSON object from a raw AI response, stripping
 * any surrounding markdown fencing or commentary.
 */
export function sanitizeJsonResponse(raw: string): string {
  const fenced = raw.replace(/```json|```/gi, "").trim();
  const start = fenced.indexOf("{");
  if (start === -1) return fenced;
  let depth = 0;
  for (let i = start; i < fenced.length; i += 1) {
    const ch = fenced.charAt(i);
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) return fenced.slice(start, i + 1);
    }
  }
  return fenced;
}

/** Extract a top-level JSON array from a raw AI response. */
export function sanitizeJsonArrayResponse(raw: string): string {
  const fenced = raw.replace(/```json|```/gi, "").trim();
  const start = fenced.indexOf("[");
  if (start === -1) return fenced;
  let depth = 0;
  for (let i = start; i < fenced.length; i += 1) {
    const ch = fenced.charAt(i);
    if (ch === "[") depth += 1;
    if (ch === "]") {
      depth -= 1;
      if (depth === 0) return fenced.slice(start, i + 1);
    }
  }
  return fenced;
}

/**
 * AI provider facade: Gemini ⇄ OpenAI with automatic fallback.
 *
 * - `AI_PROVIDER` env (gemini | openai, default gemini) picks the preferred
 *   provider; the other acts as fallback.
 * - Fallback engages when the preferred provider fails for ANY reason —
 *   missing key (auth), kill switch / daily budget exhausted (rate_limit),
 *   or upstream error. Each provider claims from its OWN durable cost-guard
 *   budget, so flipping providers never bypasses spend control.
 * - Callers import from here, never from providers/gemini|openai directly,
 *   keeping the swap a one-line env change.
 *
 * Prompt versioning and JSON sanitation stay owned by the Gemini module
 * (the historical source of truth for cached-response shapes) and are
 * re-exported unchanged.
 */
import "server-only";

import { serverEnv } from "../env";
import { isPaidProviderEnabled } from "../cost-guard";
import { createLogger } from "../logger";
import * as gemini from "./gemini";
import * as openai from "./openai";

export {
  PROMPT_VERSIONS,
  sanitizeJsonResponse,
  sanitizeJsonArrayResponse,
  type GeminiResult as AIResult,
  type GeminiStreamStart as AIStreamStart,
} from "./gemini";

const log = createLogger({ component: "provider/ai" });

type Engine = {
  name: "gemini" | "openai";
  generateText: typeof gemini.generateText;
  generateTextStream: typeof gemini.generateTextStream;
};

const ENGINES: Record<"gemini" | "openai", Engine> = {
  gemini: {
    name: "gemini",
    generateText: gemini.generateText,
    generateTextStream: gemini.generateTextStream,
  },
  openai: {
    name: "openai",
    generateText: openai.generateText,
    generateTextStream: openai.generateTextStream,
  },
};

function providerOrder(): [Engine, Engine] {
  return serverEnv().AI_PROVIDER === "openai"
    ? [ENGINES.openai, ENGINES.gemini]
    : [ENGINES.gemini, ENGINES.openai];
}

/** True when at least one AI provider is enabled (kill switches considered). */
export function isAIEnabled(): boolean {
  return isPaidProviderEnabled("gemini") || isPaidProviderEnabled("openai");
}

export async function generateText(prompt: string): Promise<gemini.GeminiResult> {
  const [primary, fallback] = providerOrder();

  const first = await primary.generateText(prompt);
  if (first.ok) return first;

  log.warn("primary_failed_falling_back", {
    primary: primary.name,
    fallback: fallback.name,
    reason: first.reason,
    correlationId: first.correlationId,
  });

  const second = await fallback.generateText(prompt);
  // If both fail, surface the PRIMARY provider's reason — it is the
  // configured intent and the more actionable signal for operators.
  return second.ok ? second : first;
}

export async function generateTextStream(prompt: string): Promise<gemini.GeminiStreamStart> {
  const [primary, fallback] = providerOrder();

  // Fallback only engages when the primary fails BEFORE streaming begins
  // (auth/budget/HTTP error). A stream that dies midway is surfaced to the
  // caller, which already handles partial output via stale-cache recovery.
  const first = await primary.generateTextStream(prompt);
  if (first.ok) return first;

  log.warn("primary_stream_failed_falling_back", {
    primary: primary.name,
    fallback: fallback.name,
    reason: first.reason,
    correlationId: first.correlationId,
  });

  const second = await fallback.generateTextStream(prompt);
  return second.ok ? second : first;
}

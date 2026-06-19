/**
 * OpenAI provider — fallback/alternative to Gemini (see providers/ai.ts).
 *
 * Mirrors the Gemini provider's contract exactly (same result unions, same
 * cost-guard claim, same reason taxonomy) so the AI facade can swap between
 * them freely. Outbound HTTP goes through httpFetch (circuit breaker,
 * timeout, retries) per project convention — no SDK dependency.
 */
import "server-only";

import { createLogger, newCorrelationId } from "../logger";
import { serverEnv } from "../env";
import { tryClaimPaidProviderUse } from "../cost-guard";
import { httpFetch } from "../http";

const log = createLogger({ component: "provider/openai" });
const PROVIDER = "openai";

// Cost-efficient default tier, deliberately analogous to Gemini Flash.
// Change alongside a PROMPT_VERSIONS bump if output shape expectations move.
const MODEL = "gpt-4o-mini";
const API_URL = "https://api.openai.com/v1/chat/completions";
const GENERATE_TIMEOUT_MS = 15_000;

export type OpenAIResult =
  | { ok: true; text: string; correlationId: string }
  | { ok: false; reason: "auth" | "rate_limit" | "error"; correlationId: string };

export type OpenAIStreamStart =
  | { ok: true; correlationId: string; stream: AsyncIterable<string> }
  | { ok: false; reason: "auth" | "rate_limit" | "error"; correlationId: string };

function getApiKey(): string | null {
  return serverEnv().OPENAI_API_KEY ?? null;
}

function reasonFromStatus(status: number): "auth" | "rate_limit" | "error" {
  if (status === 401 || status === 403) return "auth";
  if (status === 429) return "rate_limit";
  return "error";
}

async function requestCompletion(
  prompt: string,
  stream: boolean,
  correlationId: string
): Promise<Response> {
  return httpFetch(API_URL, {
    provider: PROVIDER,
    method: "POST",
    timeoutMs: GENERATE_TIMEOUT_MS,
    correlationId,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      stream,
    }),
  });
}

export async function generateText(prompt: string): Promise<OpenAIResult> {
  const correlationId = newCorrelationId();
  if (!getApiKey()) {
    return { ok: false, reason: "auth", correlationId };
  }
  if (!(await tryClaimPaidProviderUse(PROVIDER, "generateText"))) {
    return { ok: false, reason: "rate_limit", correlationId };
  }

  try {
    const response = await requestCompletion(prompt, false, correlationId);
    if (!response.ok) {
      log.warn("http_error", { correlationId, status: response.status });
      return { ok: false, reason: reasonFromStatus(response.status), correlationId };
    }
    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = payload.choices?.[0]?.message?.content ?? "";
    if (!text) {
      log.warn("empty_completion", { correlationId });
      return { ok: false, reason: "error", correlationId };
    }
    log.debug("ok", { correlationId, length: text.length });
    return { ok: true, text, correlationId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.warn("exception", { correlationId, provider: PROVIDER, error: message });
    return { ok: false, reason: "error", correlationId };
  }
}

/**
 * Streaming variant: parses the chat-completions SSE protocol
 * (`data: {...}` lines, terminated by `data: [DONE]`) and yields the
 * incremental `delta.content` pieces, matching Gemini's stream contract.
 */
export async function generateTextStream(prompt: string): Promise<OpenAIStreamStart> {
  const correlationId = newCorrelationId();
  if (!getApiKey()) {
    return { ok: false, reason: "auth", correlationId };
  }
  if (!(await tryClaimPaidProviderUse(PROVIDER, "generateTextStream"))) {
    return { ok: false, reason: "rate_limit", correlationId };
  }

  try {
    const response = await requestCompletion(prompt, true, correlationId);
    if (!response.ok || !response.body) {
      log.warn("http_error", { correlationId, status: response.status });
      return { ok: false, reason: reasonFromStatus(response.status), correlationId };
    }

    const body = response.body;

    async function* iterate(): AsyncIterable<string> {
      const reader = body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let totalLen = 0;
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let newlineIndex = buffer.indexOf("\n");
          while (newlineIndex !== -1) {
            const line = buffer.slice(0, newlineIndex).trim();
            buffer = buffer.slice(newlineIndex + 1);
            newlineIndex = buffer.indexOf("\n");

            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") {
              log.debug("stream.ok", { correlationId, length: totalLen });
              return;
            }
            try {
              const parsed = JSON.parse(data) as {
                choices?: { delta?: { content?: string } }[];
              };
              const piece = parsed.choices?.[0]?.delta?.content ?? "";
              if (piece) {
                totalLen += piece.length;
                yield piece;
              }
            } catch {
              // Malformed keep-alive/partial frame — skip.
            }
          }
        }
        log.debug("stream.ok", { correlationId, length: totalLen });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log.warn("stream.exception", { correlationId, provider: PROVIDER, error: message });
        throw err;
      } finally {
        reader.releaseLock();
      }
    }

    return { ok: true, correlationId, stream: iterate() };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.warn("exception", { correlationId, provider: PROVIDER, error: message });
    return { ok: false, reason: "error", correlationId };
  }
}

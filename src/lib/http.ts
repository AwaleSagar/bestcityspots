/**
 * Unified HTTP client.
 *
 * Wraps `fetch` with:
 *  - Per-call timeout (AbortSignal.timeout).
 *  - Retries (bounded) with exponential backoff + full jitter on retryable
 *    statuses (408, 425, 429, 5xx) and network errors. Non-idempotent methods
 *    are NOT retried unless the caller explicitly opts in.
 *  - Per-provider circuit breaker (closed → open → half-open) with in-memory
 *    state. Cross-instance persistence is out of scope at this layer.
 *  - Structured logging of each attempt via `logger`.
 *
 * Providers should import `httpFetch` instead of `fetch` directly, keyed by
 * a `provider` name so the breaker/metrics can attribute failures.
 */
import { createLogger, newCorrelationId } from "./logger";

const log = createLogger({ component: "http" });

export interface HttpOptions extends RequestInit {
  /** Identifier used for the circuit breaker, rate limiting and logging. */
  provider: string;
  /** Hard per-attempt timeout, ms. Default: 8000. */
  timeoutMs?: number;
  /** Max number of *extra* retries. Default: 2 (for GET/HEAD). */
  retries?: number;
  /** Retry even for non-idempotent methods. Default: false. */
  retryOnNonIdempotent?: boolean;
  /** Correlation ID used to link logs; generated if omitted. */
  correlationId?: string;
}

interface BreakerState {
  consecutiveFailures: number;
  openedAt: number | null;
}

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
const BREAKER_THRESHOLD = 5;
const BREAKER_COOLDOWN_MS = 30_000;
const breakers = new Map<string, BreakerState>();

function getBreaker(provider: string): BreakerState {
  let state = breakers.get(provider);
  if (!state) {
    state = { consecutiveFailures: 0, openedAt: null };
    breakers.set(provider, state);
  }
  return state;
}

export function isCircuitOpen(provider: string): boolean {
  const s = getBreaker(provider);
  if (s.openedAt === null) return false;
  if (Date.now() - s.openedAt >= BREAKER_COOLDOWN_MS) {
    // Half-open: allow one trial request.
    return false;
  }
  return true;
}

export class CircuitOpenError extends Error {
  constructor(provider: string) {
    super(`Circuit open for provider "${provider}"`);
    this.name = "CircuitOpenError";
  }
}

export class HttpError extends Error {
  readonly status: number;
  readonly provider: string;
  constructor(provider: string, status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.provider = provider;
  }
}

function recordSuccess(provider: string) {
  const s = getBreaker(provider);
  s.consecutiveFailures = 0;
  s.openedAt = null;
}

function recordFailure(provider: string) {
  const s = getBreaker(provider);
  s.consecutiveFailures += 1;
  if (s.consecutiveFailures >= BREAKER_THRESHOLD && s.openedAt === null) {
    s.openedAt = Date.now();
    log.warn("breaker.open", { provider, cooldownMs: BREAKER_COOLDOWN_MS });
  }
}

function isIdempotent(method: string | undefined): boolean {
  const m = (method || "GET").toUpperCase();
  return m === "GET" || m === "HEAD" || m === "OPTIONS";
}

function backoffMs(attempt: number): number {
  // Exponential (250ms, 500, 1000, ...) with full jitter.
  const base = Math.min(250 * 2 ** attempt, 4_000);
  return Math.floor(Math.random() * base);
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Perform an HTTP request through the shared wrapper.
 *
 * Does NOT parse the body; callers decide whether to call `.json()` / `.text()`.
 */
export async function httpFetch(url: string, options: HttpOptions): Promise<Response> {
  const {
    provider,
    timeoutMs = 8_000,
    retries: rawRetries,
    retryOnNonIdempotent = false,
    correlationId = newCorrelationId(),
    headers,
    ...init
  } = options;

  if (isCircuitOpen(provider)) {
    log.warn("breaker.short_circuit", { provider, correlationId });
    throw new CircuitOpenError(provider);
  }

  const method = (init.method || "GET").toUpperCase();
  const maxRetries = rawRetries ?? (isIdempotent(method) || retryOnNonIdempotent ? 2 : 0);

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const started = Date.now();
    try {
      const response = await fetch(url, {
        ...init,
        headers: {
          "x-correlation-id": correlationId,
          "user-agent": "bestcityspots-backend/1.0",
          ...(headers as Record<string, string> | undefined),
        },
        signal: init.signal ?? AbortSignal.timeout(timeoutMs),
      });

      const latencyMs = Date.now() - started;

      if (response.ok) {
        recordSuccess(provider);
        log.debug("http.ok", { provider, correlationId, status: response.status, latencyMs, attempt });
        return response;
      }

      if (RETRYABLE_STATUS.has(response.status) && attempt < maxRetries) {
        log.warn("http.retryable", {
          provider,
          correlationId,
          status: response.status,
          latencyMs,
          attempt,
        });
        await sleep(backoffMs(attempt));
        continue;
      }

      // Non-retryable HTTP failure — count as breaker failure only for 5xx.
      if (response.status >= 500) recordFailure(provider);
      log.warn("http.error", { provider, correlationId, status: response.status, latencyMs, attempt });
      return response; // Let caller inspect the body/status.
    } catch (err) {
      lastError = err;
      const latencyMs = Date.now() - started;
      log.warn("http.exception", {
        provider,
        correlationId,
        latencyMs,
        attempt,
        error: err instanceof Error ? err.message : String(err),
      });
      recordFailure(provider);
      if (attempt < maxRetries) {
        await sleep(backoffMs(attempt));
        continue;
      }
      throw err instanceof Error ? err : new Error(String(err));
    }
  }

  // Should not reach here, but the loop exit implies exhaustion.
  throw lastError instanceof Error ? lastError : new Error("httpFetch: retries exhausted");
}

/** Convenience wrapper returning parsed JSON or throwing `HttpError`. */
export async function httpJson<T = unknown>(url: string, options: HttpOptions): Promise<T> {
  const response = await httpFetch(url, options);
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new HttpError(options.provider, response.status, text || response.statusText);
  }
  return (await response.json()) as T;
}

/** Test-only reset. Not exported from any index file. */
export function __resetHttpState(): void {
  breakers.clear();
}

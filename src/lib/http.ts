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
  /** True when a half-open trial is in flight. Prevents thundering herd. */
  halfOpenInFlight: boolean;
}

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
const BREAKER_THRESHOLD = 5;
const BREAKER_COOLDOWN_MS = 30_000;

// Bounded set of allowed provider keys. Keeps `breakers` from growing
// unboundedly when callers pass dynamic strings (memory leak in long-running
// processes / serverless reuse). Unknown providers are still tracked but
// share a single "_other" bucket.
const KNOWN_PROVIDERS = new Set<string>([
  "gemini",
  "openweather",
  "open-meteo",
  "google-places",
]);
const breakers = new Map<string, BreakerState>();

function breakerKey(provider: string): string {
  return KNOWN_PROVIDERS.has(provider) ? provider : "_other";
}

function getBreaker(provider: string): BreakerState {
  const key = breakerKey(provider);
  let state = breakers.get(key);
  if (!state) {
    state = { consecutiveFailures: 0, openedAt: null, halfOpenInFlight: false };
    breakers.set(key, state);
  }
  return state;
}

/**
 * Atomically attempts to enter the half-open state. Returns true if the caller
 * is the elected trial requester (and therefore allowed to proceed). Returns
 * false if the breaker is still firmly open or another trial is already in
 * flight — caller must short-circuit.
 */
function tryAcquireHalfOpen(provider: string): boolean {
  const s = getBreaker(provider);
  if (s.openedAt === null) return true; // closed
  if (Date.now() - s.openedAt < BREAKER_COOLDOWN_MS) return false; // still open
  if (s.halfOpenInFlight) return false; // another trial running
  s.halfOpenInFlight = true;
  return true;
}

function releaseHalfOpen(provider: string): void {
  const s = getBreaker(provider);
  s.halfOpenInFlight = false;
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
  s.halfOpenInFlight = false;
}

function recordFailure(provider: string) {
  const s = getBreaker(provider);
  s.consecutiveFailures += 1;
  s.halfOpenInFlight = false;
  if (s.consecutiveFailures >= BREAKER_THRESHOLD && s.openedAt === null) {
    s.openedAt = Date.now();
    log.warn("breaker.open", { provider, cooldownMs: BREAKER_COOLDOWN_MS });
  } else if (s.openedAt !== null) {
    // Half-open trial failed — reset the cooldown clock.
    s.openedAt = Date.now();
  }
}

function isIdempotent(method: string): boolean {
  // Caller already normalises to uppercase; avoid the redundant call per
  // attempt inside the retry loop.
  return method === "GET" || method === "HEAD" || method === "OPTIONS";
}

function backoffMs(attempt: number): number {
  // Exponential (250ms, 500, 1000, ...) with full jitter.
  const base = Math.min(250 * 2 ** attempt, 4_000);
  return Math.floor(Math.random() * base);
}

/** Maximum honoured Retry-After value to avoid pathological waits. */
const MAX_RETRY_AFTER_MS = 30_000;

/**
 * Parse a `Retry-After` header per RFC 7231 — either delta-seconds or HTTP-date.
 * Returns ms to wait, capped at MAX_RETRY_AFTER_MS, or null if unparseable.
 */
function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const trimmed = header.trim();
  if (!trimmed) return null;
  const seconds = Number(trimmed);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds * 1000, MAX_RETRY_AFTER_MS);
  }
  const dateMs = Date.parse(trimmed);
  if (Number.isNaN(dateMs)) return null;
  const delta = dateMs - Date.now();
  if (delta <= 0) return 0;
  return Math.min(delta, MAX_RETRY_AFTER_MS);
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

async function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    throw signal.reason instanceof Error ? signal.reason : new DOMException("Aborted", "AbortError");
  }

  return new Promise((resolve, reject) => {
    // Detach the abort listener on normal wake-up so repeated sleeps against
    // a shared long-lived signal don't accumulate listeners.
    const timeout = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timeout);
      reject(signal?.reason instanceof Error ? signal.reason : new DOMException("Aborted", "AbortError"));
    };

    signal?.addEventListener("abort", onAbort, { once: true });
  });
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

  if (!tryAcquireHalfOpen(provider)) {
    log.warn("breaker.short_circuit", { provider, correlationId });
    throw new CircuitOpenError(provider);
  }

  const method = (init.method || "GET").toUpperCase();
  const maxRetries = rawRetries ?? (isIdempotent(method) || retryOnNonIdempotent ? 2 : 0);

  // Build the headers object once — it does not change between retry attempts
  // and it can be expensive when callers pass dozens of entries.
  const mergedHeaders = new Headers(headers);
  if (!mergedHeaders.has("x-correlation-id")) {
    mergedHeaders.set("x-correlation-id", correlationId);
  }
  if (!mergedHeaders.has("user-agent")) {
    mergedHeaders.set("user-agent", "bestcityspots-backend/1.0");
  }

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const started = Date.now();
    const attemptSignal = init.signal
      ? AbortSignal.any([init.signal, AbortSignal.timeout(timeoutMs)])
      : AbortSignal.timeout(timeoutMs);
    try {
      const response = await fetch(url, {
        ...init,
        headers: mergedHeaders,
        signal: attemptSignal,
      });

      const latencyMs = Date.now() - started;

      if (response.ok) {
        recordSuccess(provider);
        log.debug("http.ok", {
          provider,
          correlationId,
          status: response.status,
          latencyMs,
          attempt,
        });
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
        const retryAfter =
          response.status === 429 || response.status === 503
            ? parseRetryAfter(response.headers.get("retry-after"))
            : null;
        await sleep(retryAfter ?? backoffMs(attempt), init.signal ?? undefined);
        continue;
      }

      // Non-retryable HTTP failure — count as breaker failure only for 5xx.
      if (response.status >= 500) {
        recordFailure(provider);
      } else {
        // 4xx means server is reachable; release the half-open guard.
        releaseHalfOpen(provider);
      }
      log.warn("http.error", {
        provider,
        correlationId,
        status: response.status,
        latencyMs,
        attempt,
      });
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
      if (isAbortError(err)) {
        releaseHalfOpen(provider);
        throw err;
      }

      recordFailure(provider);
      if (attempt < maxRetries) {
        await sleep(backoffMs(attempt), init.signal ?? undefined);
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

/**
 * Minimal structured logger.
 *
 * Emits single-line JSON records when LOG_LEVEL is set and/or NODE_ENV is
 * production; otherwise falls back to a human-friendly console output.
 *
 * Usage:
 *   const log = createLogger({ component: "places" });
 *   log.info("cache.hit", { cityId, cacheLayer: "L2" });
 *
 * Correlation IDs propagate via `withCorrelationId(id, fn)` or explicit
 * `{ correlationId }` fields in the payload. A helper `newCorrelationId()` is
 * provided so route handlers can stamp requests.
 */
import { serverEnv } from "./env";

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function currentLevel(): number {
  const configured = serverEnv().LOG_LEVEL;
  if (configured) return LEVELS[configured];
  return serverEnv().NODE_ENV === "production" ? LEVELS.info : LEVELS.debug;
}

function isStructured(): boolean {
  return serverEnv().NODE_ENV === "production" || !!serverEnv().LOG_LEVEL;
}

type LogContext = Record<string, unknown>;

export interface Logger {
  debug(event: string, fields?: LogContext): void;
  info(event: string, fields?: LogContext): void;
  warn(event: string, fields?: LogContext): void;
  error(event: string, fields?: LogContext): void;
  child(fields: LogContext): Logger;
}

function emit(level: LogLevel, base: LogContext, event: string, fields?: LogContext) {
  if (LEVELS[level] < currentLevel()) return;
  const record = {
    ts: new Date().toISOString(),
    level,
    event,
    ...base,
    ...(fields ?? {}),
  };
  const message = isStructured() ? JSON.stringify(record) : `[${level}] ${event} ${JSON.stringify({ ...base, ...(fields ?? {}) })}`;
  switch (level) {
    case "debug":
    case "info":
      console.log(message);
      break;
    case "warn":
      console.warn(message);
      break;
    case "error":
      console.error(message);
      break;
  }
}

export function createLogger(base: LogContext = {}): Logger {
  return {
    debug: (event, fields) => emit("debug", base, event, fields),
    info: (event, fields) => emit("info", base, event, fields),
    warn: (event, fields) => emit("warn", base, event, fields),
    error: (event, fields) => emit("error", base, event, fields),
    child: (fields) => createLogger({ ...base, ...fields }),
  };
}

/** Default root logger — modules should call `.child({ component })`. */
export const logger: Logger = createLogger({});

/** Generate a short, URL-safe correlation ID. */
export function newCorrelationId(): string {
  // 12 random bytes → 16-char base64url. Fine for tracing, not for security.
  const bytes = new Uint8Array(12);
  if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  let b64 = "";
  // Convert without Buffer dep
  for (let i = 0; i < bytes.length; i += 1) b64 += String.fromCharCode(bytes[i]);
  // btoa handles ASCII
  return (typeof btoa === "function" ? btoa(b64) : Buffer.from(b64, "binary").toString("base64"))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

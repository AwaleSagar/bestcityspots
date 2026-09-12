import { NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

/**
 * CSP violation sink (audit L-3).
 *
 * `next.config.ts` ships `Content-Security-Policy-Report-Only`. Without a
 * reporting endpoint that header collected nothing — it neither blocked nor
 * reported, so it could not inform the eventual move to an enforced,
 * nonce-based policy. This endpoint gives it somewhere to report.
 *
 * Deliberately minimal: parse, bound, log, 204. No database write and no
 * response body, so an unauthenticated flood costs a log line rather than a
 * DB round trip (contrast /api/analytics, which is rate-limited at nginx).
 * Browsers post either `application/csp-report` (legacy `report-uri`) or
 * `application/reports+json` (`report-to`); both are accepted.
 */

const log = createLogger({ component: "api/csp-report" });

const MAX_BODY_BYTES = 16 * 1024;
/** Only these fields are logged — a report body is attacker-influenced. */
const REPORTED_FIELDS = [
  "document-uri",
  "documentURL",
  "violated-directive",
  "effectiveDirective",
  "effective-directive",
  "blocked-uri",
  "blockedURL",
  "disposition",
] as const;

const MAX_FIELD_LENGTH = 512;

function summarize(report: unknown): Record<string, string> {
  if (!report || typeof report !== "object") return {};
  const source = report as Record<string, unknown>;
  const body = (source.body ?? source["csp-report"] ?? source) as Record<string, unknown>;
  if (!body || typeof body !== "object") return {};

  const out: Record<string, string> = {};
  for (const field of REPORTED_FIELDS) {
    // `field` comes from the REPORTED_FIELDS literal tuple, never from the
    // request — the report body is only ever read at these fixed keys.
    // eslint-disable-next-line security/detect-object-injection
    const value = body[field];
    if (typeof value === "string" && value.length > 0) {
      // eslint-disable-next-line security/detect-object-injection
      out[field] = value.slice(0, MAX_FIELD_LENGTH);
    }
  }
  return out;
}

export async function POST(request: Request): Promise<NextResponse> {
  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader) {
    const contentLength = Number(contentLengthHeader);
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return new NextResponse(null, { status: 204 });
    }
  }

  try {
    const raw = await request.text();
    if (raw.length === 0 || raw.length > MAX_BODY_BYTES) {
      return new NextResponse(null, { status: 204 });
    }

    const parsed: unknown = JSON.parse(raw);
    // `report-to` posts an array of reports; `report-uri` posts a single object.
    const reports = Array.isArray(parsed) ? parsed.slice(0, 10) : [parsed];
    for (const report of reports) {
      const summary = summarize(report);
      if (Object.keys(summary).length > 0) log.warn("csp_violation", summary);
    }
  } catch {
    // Malformed report — nothing actionable, and never worth a 4xx to a browser.
  }

  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}

export const dynamic = "force-dynamic";

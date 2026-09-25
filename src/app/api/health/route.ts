import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";
import { getHealth } from "@/lib/health";

const HEALTH_TIMEOUT_MS = 5000;

class HealthTimeoutError extends Error {}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new HealthTimeoutError()), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/** Constant-time bearer-token check (no early exit on the first differing byte). */
function isAuthorizedRequest(request: NextRequest): boolean {
  const token = serverEnv().HEALTH_CHECK_TOKEN;
  if (!token) return false;
  const presented = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${token}`);
  return presented.length === expected.length && timingSafeEqual(presented, expected);
}

/** GET /api/health — lightweight dependency status. */
export async function GET(request: NextRequest) {
  try {
    const report = await withTimeout(getHealth(), HEALTH_TIMEOUT_MS);
    const isAuthorized = isAuthorizedRequest(request);
    // Only the anonymous `{ ok }` body may be shared by caches, and only when
    // OK (503s must not be served stale after a recovery). The detailed,
    // token-gated report is never cacheable.
    const headers: Record<string, string> = isAuthorized
      ? { "Cache-Control": "private, no-store" }
      : report.ok
        ? { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" }
        : { "Cache-Control": "no-store" };
    headers.Vary = "Authorization";
    return NextResponse.json(isAuthorized ? report : { ok: report.ok }, {
      status: report.ok ? 200 : 503,
      headers,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof HealthTimeoutError ? "health_check_timeout" : "health_check_failed",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export const dynamic = "force-dynamic";

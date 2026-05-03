import { NextRequest, NextResponse } from "next/server";
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

/** GET /api/health — lightweight dependency status. */
export async function GET(request: NextRequest) {
  try {
    const report = await withTimeout(getHealth(), HEALTH_TIMEOUT_MS);
    const healthToken = process.env.HEALTH_CHECK_TOKEN;
    const isAuthorized =
      !!healthToken && request.headers.get("authorization") === `Bearer ${healthToken}`;
    // Only cache OK responses; 503s should not be served stale to dependent
    // probes after a recovery.
    const headers = report.ok
      ? { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" }
      : { "Cache-Control": "no-store" };
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

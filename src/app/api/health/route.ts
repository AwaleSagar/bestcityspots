import { NextResponse } from "next/server";
import { getHealth } from "@/lib/health";

/** GET /api/health — lightweight dependency status. */
export async function GET() {
  try {
    const report = await getHealth();
    // Only cache OK responses; 503s should not be served stale to dependent
    // probes after a recovery.
    const headers = report.ok
      ? { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" }
      : { "Cache-Control": "no-store" };
    return NextResponse.json(report, {
      status: report.ok ? 200 : 503,
      headers,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "health_check_failed",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export const dynamic = "force-dynamic";

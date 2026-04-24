import { NextResponse } from "next/server";
import { getHealth } from "@/lib/health";

/** GET /api/health — lightweight dependency status. */
export async function GET() {
  const report = await getHealth();
  return NextResponse.json(report, {
    status: report.ok ? 200 : 503,
    headers: {
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
    },
  });
}

export const dynamic = "force-dynamic";

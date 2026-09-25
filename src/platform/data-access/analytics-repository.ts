import "server-only";
import type { Database } from "@/lib/database.types";
import { supabaseServer } from "@/lib/supabase";

type Functions = Database["public"]["Functions"];

/** Typed wrapper: every analytics write is a service_role-only RPC. */
async function runRpc<F extends keyof Functions>(fn: F, args: Functions[F]["Args"]): Promise<void> {
  if (!supabaseServer) return;
  const { error } = await supabaseServer.rpc(fn, args);
  if (error) {
    throw new Error(error.message || `Analytics RPC failed: ${fn}`);
  }
}

/**
 * One ingested batch's contribution to the day's totals. Session rates are
 * derived in `daily_visitor_summary` from ended sessions only, so batches
 * without a `session_end` event never skew duration or bounce rate.
 */
export async function upsertDailyVisitorStats(args: {
  date: string;
  pageViews: number;
  sessions: number;
  newVisitors: number;
  returningVisitors: number;
  sessionsEnded: number;
  bouncedSessions: number;
  sessionDurationSec: number;
}): Promise<void> {
  await runRpc("upsert_daily_visitor_stats", {
    p_date: args.date,
    p_page_views: args.pageViews,
    p_sessions: args.sessions,
    p_new_visitors: args.newVisitors,
    p_returning_visitors: args.returningVisitors,
    p_sessions_ended: args.sessionsEnded,
    p_bounced_sessions: args.bouncedSessions,
    p_session_duration_sec: args.sessionDurationSec,
  });
}

export async function upsertTrafficSource(args: {
  date: string;
  sourceType: string;
  sourceName: string;
  visits: number;
  newVisitors: number;
}): Promise<void> {
  await runRpc("upsert_traffic_source", {
    p_date: args.date,
    p_source_type: args.sourceType,
    p_source_name: args.sourceName,
    p_visits: args.visits,
    p_new_visitors: args.newVisitors,
  });
}

export async function upsertDeviceStats(args: {
  date: string;
  device: string;
  browser: string | null;
  os: string | null;
}): Promise<void> {
  await runRpc("upsert_device_stats", {
    p_date: args.date,
    p_device: args.device,
    // '' is the stored "unknown" so NULLs can't defeat the primary key.
    p_browser: args.browser ?? "",
    p_os: args.os ?? "",
  });
}

export async function upsertGeoStats(args: {
  date: string;
  countryCode: string;
  countryName: string;
  city: string | null;
}): Promise<void> {
  await runRpc("upsert_geo_stats", {
    p_date: args.date,
    p_country_code: args.countryCode,
    p_country_name: args.countryName,
    p_city: args.city ?? "",
  });
}

export async function upsertCityViews(args: { date: string; cityId: number }): Promise<void> {
  await runRpc("upsert_city_views", {
    p_date: args.date,
    p_city_id: args.cityId,
  });
}

export async function upsertUserAction(args: { date: string; action: string }): Promise<void> {
  await runRpc("upsert_user_action", {
    p_date: args.date,
    p_action: args.action,
  });
}

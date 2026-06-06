import "server-only";
import { supabaseServer } from "@/lib/supabase";

interface RpcArgs {
  [key: string]: string | number | boolean | null;
}

async function runRpc(functionName: string, args: RpcArgs): Promise<void> {
  if (!supabaseServer) return;
  const { error } = await supabaseServer.rpc(functionName, args);
  if (error) {
    throw new Error(error.message || `Analytics RPC failed: ${functionName}`);
  }
}

export async function upsertDailyVisitorStats(args: {
  date: string;
  visits: number;
  unique: number;
  pageviews: number;
  duration: number;
  bounce: number;
  newVisitors: number;
  returningVisitors: number;
}): Promise<void> {
  await runRpc("upsert_daily_visitor_stats", {
    p_date: args.date,
    p_visits: args.visits,
    p_unique: args.unique,
    p_pageviews: args.pageviews,
    p_duration: args.duration,
    p_bounce: args.bounce,
    p_new: args.newVisitors,
    p_returning: args.returningVisitors,
  });
}

export async function upsertTrafficSource(args: {
  date: string;
  sourceType: string;
  sourceName: string;
  visits: number;
  unique: number;
}): Promise<void> {
  await runRpc("upsert_traffic_source", {
    p_date: args.date,
    p_source_type: args.sourceType,
    p_source_name: args.sourceName,
    p_visits: args.visits,
    p_unique: args.unique,
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
    p_browser: args.browser,
    p_os: args.os,
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
    p_city: args.city,
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

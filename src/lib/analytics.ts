import { z } from "zod";
import { supabaseServer } from "@/lib/supabase";

// =============================================================================
// Types
// =============================================================================

export type SourceTypeValue =
  | "organic"
  | "social"
  | "referral"
  | "direct"
  | "paid"
  | "email"
  | "other";

export type DeviceTypeValue = "desktop" | "mobile" | "tablet" | "other";

export const ActionType = z.enum([
  "search",
  "save_place",
  "remove_save",
  "add_note",
  "delete_note",
  "view_guide",
  "view_city",
  "click_maps_link",
  "share",
  "download_itinerary",
]);

export const AnalyticsEventSchema = z.object({
  type: z.enum(["pageview", "action", "session_end"]),
  sessionId: z.string().min(1),
  isNewVisitor: z.boolean().optional(),
  path: z.string().optional(),
  cityId: z.number().optional(),
  action: ActionType.optional(),
  referrer: z.string().optional(),
  sessionDuration: z.number().optional(),
  pageCount: z.number().optional(),
  hasGeoConsent: z.boolean().optional(),
});

export const AnalyticsPayloadSchema = z.object({
  events: z.array(AnalyticsEventSchema).min(1).max(50),
  timestamp: z.string(),
});

export type AnalyticsEvent = z.infer<typeof AnalyticsEventSchema>;

// =============================================================================
// Helpers
// =============================================================================

export function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

export function parseUserAgent(ua: string): {
  deviceType: DeviceTypeValue;
  browser: string | null;
  os: string | null;
} {
  const uaLower = ua.toLowerCase();

  let deviceType: DeviceTypeValue = "desktop";
  if (/mobile|android|iphone|ipod|blackberry|windows phone/i.test(ua)) {
    deviceType = "mobile";
  } else if (/tablet|ipad|playbook|silk/i.test(ua)) {
    deviceType = "tablet";
  }

  let browser: string | null = null;
  if (uaLower.includes("firefox")) browser = "Firefox";
  else if (uaLower.includes("edg")) browser = "Edge";
  else if (uaLower.includes("chrome")) browser = "Chrome";
  else if (uaLower.includes("safari")) browser = "Safari";
  else if (uaLower.includes("opera") || uaLower.includes("opr")) browser = "Opera";

  let os: string | null = null;
  if (uaLower.includes("windows")) os = "Windows";
  else if (uaLower.includes("mac os") || uaLower.includes("macos")) os = "macOS";
  else if (uaLower.includes("linux")) os = "Linux";
  else if (uaLower.includes("android")) os = "Android";
  else if (uaLower.includes("iphone") || uaLower.includes("ipad")) os = "iOS";

  return { deviceType, browser, os };
}

export function parseReferrer(referrer: string | null): {
  sourceType: SourceTypeValue;
  sourceName: string;
} {
  if (!referrer || referrer === "") {
    return { sourceType: "direct", sourceName: "direct" };
  }

  const refLower = referrer.toLowerCase();

  if (refLower.includes("facebook") || refLower.includes("fb.com"))
    return { sourceType: "social", sourceName: "Facebook" };
  if (refLower.includes("twitter") || refLower.includes("t.co") || refLower.includes("x.com"))
    return { sourceType: "social", sourceName: "Twitter/X" };
  if (refLower.includes("instagram")) return { sourceType: "social", sourceName: "Instagram" };
  if (refLower.includes("linkedin")) return { sourceType: "social", sourceName: "LinkedIn" };
  if (refLower.includes("pinterest")) return { sourceType: "social", sourceName: "Pinterest" };
  if (refLower.includes("reddit")) return { sourceType: "social", sourceName: "Reddit" };
  if (refLower.includes("tiktok")) return { sourceType: "social", sourceName: "TikTok" };
  if (refLower.includes("youtube")) return { sourceType: "social", sourceName: "YouTube" };

  if (refLower.includes("google")) return { sourceType: "organic", sourceName: "Google" };
  if (refLower.includes("bing")) return { sourceType: "organic", sourceName: "Bing" };
  if (refLower.includes("duckduckgo")) return { sourceType: "organic", sourceName: "DuckDuckGo" };
  if (refLower.includes("yahoo")) return { sourceType: "organic", sourceName: "Yahoo" };
  if (refLower.includes("baidu")) return { sourceType: "organic", sourceName: "Baidu" };

  if (refLower.includes("mail.") || refLower.includes("outlook") || refLower.includes("gmail"))
    return { sourceType: "email", sourceName: "Email" };

  try {
    const url = new URL(referrer);
    return { sourceType: "referral", sourceName: url.hostname };
  } catch {
    return { sourceType: "other", sourceName: "unknown" };
  }
}

// =============================================================================
// Database Operations
// =============================================================================

export async function recordDailyVisitorStats(
  date: string,
  events: AnalyticsEvent[],
  sessionDuration: number | null,
  pageCount: number | null
): Promise<void> {
  if (!supabaseServer) return;

  const sessions = new Set<string>();
  let newVisitors = 0;
  let returningVisitors = 0;
  let pageViews = 0;

  for (const event of events) {
    sessions.add(event.sessionId);
    if (event.isNewVisitor === true) newVisitors++;
    if (event.isNewVisitor === false) returningVisitors++;
    if (event.type === "pageview") pageViews++;
  }

  const totalVisits = pageViews;
  const uniqueVisitors = sessions.size;
  const isBounce = pageCount !== null && pageCount <= 1;

  const { error } = await supabaseServer.rpc("upsert_daily_visitor_stats", {
      p_date: date,
      p_visits: totalVisits,
      p_unique: uniqueVisitors,
      p_pageviews: pageViews,
      p_duration: sessionDuration || 0,
      p_bounce: isBounce ? 1 : 0,
      p_new: newVisitors,
      p_returning: returningVisitors,
    });
  if (error) console.error("[analytics] Failed to update daily visitor stats:", error);
}

export async function recordTrafficSource(
  date: string,
  sourceType: SourceTypeValue,
  sourceName: string,
  uniqueVisitors: number
): Promise<void> {
  if (!supabaseServer) return;

  const { error } = await supabaseServer.rpc("upsert_traffic_source", {
      p_date: date,
      p_source_type: sourceType,
      p_source_name: sourceName,
      p_visits: 1,
      p_unique: uniqueVisitors,
    });
  if (error) console.error("[analytics] Failed to update traffic sources:", error);
}

export async function recordDeviceStats(
  date: string,
  deviceType: DeviceTypeValue,
  browser: string | null,
  os: string | null
): Promise<void> {
  if (!supabaseServer) return;

  const { error } = await supabaseServer.rpc("upsert_device_stats", {
      p_date: date,
      p_device: deviceType,
      p_browser: browser,
      p_os: os,
    });
  if (error) console.error("[analytics] Failed to update device stats:", error);
}

export async function recordGeoStats(
  date: string,
  countryCode: string,
  countryName: string,
  city: string | null
): Promise<void> {
  if (!supabaseServer) return;

  const { error } = await supabaseServer.rpc("upsert_geo_stats", {
      p_date: date,
      p_country_code: countryCode,
      p_country_name: countryName,
      p_city: city,
    });
  if (error) console.error("[analytics] Failed to update geo stats:", error);
}

export async function recordCityView(date: string, cityId: number): Promise<void> {
  if (!supabaseServer) return;

  const { error } = await supabaseServer.rpc("upsert_city_views", {
      p_date: date,
      p_city_id: cityId,
    });
  if (error) console.error("[analytics] Failed to update city views:", error);
}

export async function recordUserAction(
  date: string,
  actionType: z.infer<typeof ActionType>
): Promise<void> {
  if (!supabaseServer) return;

  const { error } = await supabaseServer.rpc("upsert_user_action", {
      p_date: date,
      p_action: actionType,
    });
  if (error) console.error("[analytics] Failed to update user actions:", error);
}

// =============================================================================
// Orchestrator
// =============================================================================

export async function processAnalyticsBatch(
  events: AnalyticsEvent[],
  metadata: {
    userAgent: string;
    referrer: string | null;
    countryCode: string | null;
    countryName: string | null;
    city: string | null;
  }
): Promise<void> {
  const today = getToday();

  const { deviceType, browser, os } = parseUserAgent(metadata.userAgent);
  const { sourceType, sourceName } = parseReferrer(metadata.referrer);

  const sessionEndEvent = events.find((e) => e.type === "session_end");
  const sessionDuration = sessionEndEvent?.sessionDuration || null;
  const pageCount = sessionEndEvent?.pageCount || null;
  const hasGeoConsent = events.some((e) => e.hasGeoConsent === true);
  const isNewVisitor = events.some((e) => e.isNewVisitor === true);

  const writes: Promise<void>[] = [
    recordDailyVisitorStats(today, events, sessionDuration, pageCount),
    recordTrafficSource(today, sourceType, sourceName, isNewVisitor ? 1 : 0),
    recordDeviceStats(today, deviceType, browser, os),
  ];

  if (hasGeoConsent && metadata.countryCode) {
    writes.push(
      recordGeoStats(
        today,
        metadata.countryCode,
        metadata.countryName || metadata.countryCode,
        metadata.city
      )
    );
  }

  // Dedupe per-event RPCs within the batch so a 50-event payload doesn't
  // fan out to ~100 individual DB calls when most events share the same
  // cityId / action.
  const cityIds = new Set<number>();
  const actions = new Set<z.infer<typeof ActionType>>();
  for (const event of events) {
    if (event.cityId) cityIds.add(event.cityId);
    if (event.action) actions.add(event.action);
  }
  for (const cityId of cityIds) writes.push(recordCityView(today, cityId));
  for (const action of actions) writes.push(recordUserAction(today, action));

  await Promise.allSettled(writes);
}

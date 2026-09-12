import { z } from "zod";
import { createLogger } from "@/lib/logger";
import {
  upsertDailyVisitorStats,
  upsertTrafficSource,
  upsertDeviceStats,
  upsertGeoStats,
  upsertCityViews,
  upsertUserAction,
} from "@/platform/data-access/analytics-repository";

const log = createLogger({ component: "analytics" });

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
  "click_affiliate",
]);

// SECURITY (audit M-4): every free-text and numeric field is bounded. The
// endpoint is unauthenticated, so an uncapped `referrer` becomes an unlimited
// number of distinct `traffic_sources_daily` rows (source_name is part of that
// table's unique key), and uncapped durations/counts skew the weighted averages
// in upsert_daily_visitor_stats(). Limits are generous for real clients:
// a session id is 32 hex chars, a path is a URL path, a referrer is a URL.
const MAX_SESSION_ID_LENGTH = 64;
const MAX_PATH_LENGTH = 512;
const MAX_REFERRER_LENGTH = 2048;
/** One day in seconds — an upper bound no real session can legitimately exceed. */
const MAX_SESSION_DURATION_SEC = 86_400;
const MAX_PAGE_COUNT = 1_000;

export const AnalyticsEventSchema = z.object({
  type: z.enum(["pageview", "action", "session_end"]),
  sessionId: z.string().min(1).max(MAX_SESSION_ID_LENGTH),
  isNewVisitor: z.boolean().optional(),
  path: z.string().max(MAX_PATH_LENGTH).optional(),
  cityId: z.number().int().positive().optional(),
  action: ActionType.optional(),
  referrer: z.string().max(MAX_REFERRER_LENGTH).optional(),
  sessionDuration: z.number().int().min(0).max(MAX_SESSION_DURATION_SEC).optional(),
  pageCount: z.number().int().min(0).max(MAX_PAGE_COUNT).optional(),
  hasGeoConsent: z.boolean().optional(),
});

export const AnalyticsPayloadSchema = z.object({
  events: z.array(AnalyticsEventSchema).min(1).max(50),
  timestamp: z.string(),
});

/**
 * Distinct per-event RPC fan-out caps (audit M-4). A single unauthenticated
 * request could otherwise trigger ~61 database round trips; these keep the
 * worst case bounded while covering every realistic batch (a 50-event batch
 * from one visitor touches a handful of cities at most).
 */
const MAX_DISTINCT_CITY_IDS_PER_BATCH = 10;

/**
 * Bound on a stored `traffic_sources_daily.source_name`, plus the shape a
 * referral hostname must have to be stored at all (audit M-4).
 */
const MAX_SOURCE_NAME_LENGTH = 128;
const HOSTNAME_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

/** Geo strings arrive in request headers — bound and shape-check them (audit M-3). */
const MAX_GEO_CITY_LENGTH = 80;
const COUNTRY_CODE_RE = /^[A-Za-z]{2}$/;

/**
 * Normalize an edge-provided country code to an ISO 3166-1 alpha-2 string, or
 * `null` when it is absent or malformed. Anything that is not two letters is
 * rejected outright rather than stored.
 */
export function sanitizeCountryCode(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return COUNTRY_CODE_RE.test(trimmed) ? trimmed.toUpperCase() : null;
}

/**
 * Normalize an edge-provided city name: strip control characters, collapse
 * whitespace, bound the length. Returns `null` when nothing usable remains.
 */
export function sanitizeGeoCity(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return null;
  return cleaned.slice(0, MAX_GEO_CITY_LENGTH);
}

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

  // Email check MUST precede the organic-search block: a webmail referrer
  // like mail.google.com or mail.yahoo.com would otherwise match the
  // generic "google"/"yahoo" substring and be misclassified as search.
  if (refLower.includes("mail.") || refLower.includes("outlook") || refLower.includes("gmail"))
    return { sourceType: "email", sourceName: "Email" };

  if (refLower.includes("google")) return { sourceType: "organic", sourceName: "Google" };
  if (refLower.includes("bing")) return { sourceType: "organic", sourceName: "Bing" };
  if (refLower.includes("duckduckgo")) return { sourceType: "organic", sourceName: "DuckDuckGo" };
  if (refLower.includes("yahoo")) return { sourceType: "organic", sourceName: "Yahoo" };
  if (refLower.includes("baidu")) return { sourceType: "organic", sourceName: "Baidu" };

  // SECURITY (audit M-4): `source_name` is part of the unique key on
  // traffic_sources_daily, so an unconstrained value mints a new row per
  // request. Only a syntactically valid http(s) hostname is stored, lowercased
  // and length-capped; anything else collapses into the single "unknown"
  // bucket rather than creating a row of its own.
  try {
    const url = new URL(referrer);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { sourceType: "other", sourceName: "unknown" };
    }
    const hostname = url.hostname.toLowerCase();
    if (!HOSTNAME_RE.test(hostname) || hostname.length > MAX_SOURCE_NAME_LENGTH) {
      return { sourceType: "other", sourceName: "unknown" };
    }
    return { sourceType: "referral", sourceName: hostname };
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

  try {
    await upsertDailyVisitorStats({
      date,
      visits: totalVisits,
      unique: uniqueVisitors,
      pageviews: pageViews,
      duration: sessionDuration || 0,
      bounce: isBounce ? 1 : 0,
      newVisitors,
      returningVisitors,
    });
  } catch (error) {
    log.error("daily_stats_write_failed", {
      date,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function recordTrafficSource(
  date: string,
  sourceType: SourceTypeValue,
  sourceName: string,
  uniqueVisitors: number
): Promise<void> {
  try {
    await upsertTrafficSource({
      date,
      sourceType,
      sourceName,
      visits: 1,
      unique: uniqueVisitors,
    });
  } catch (error) {
    log.error("traffic_source_write_failed", {
      date,
      sourceType,
      sourceName,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function recordDeviceStats(
  date: string,
  deviceType: DeviceTypeValue,
  browser: string | null,
  os: string | null
): Promise<void> {
  try {
    await upsertDeviceStats({
      date,
      device: deviceType,
      browser,
      os,
    });
  } catch (error) {
    log.error("device_stats_write_failed", {
      date,
      deviceType,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function recordGeoStats(
  date: string,
  countryCode: string,
  countryName: string,
  city: string | null
): Promise<void> {
  try {
    await upsertGeoStats({
      date,
      countryCode,
      countryName,
      city,
    });
  } catch (error) {
    log.error("geo_stats_write_failed", {
      date,
      countryCode,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function recordCityView(date: string, cityId: number): Promise<void> {
  try {
    await upsertCityViews({
      date,
      cityId,
    });
  } catch (error) {
    log.error("city_view_write_failed", {
      date,
      cityId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function recordUserAction(
  date: string,
  actionType: z.infer<typeof ActionType>
): Promise<void> {
  try {
    await upsertUserAction({
      date,
      action: actionType,
    });
  } catch (error) {
    log.error("user_action_write_failed", {
      date,
      actionType,
      error: error instanceof Error ? error.message : String(error),
    });
  }
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
  // Hard cap the per-request RPC fan-out (audit M-4). `actions` is already
  // bounded by the ActionType enum; distinct city ids are caller-chosen.
  const cappedCityIds = [...cityIds].slice(0, MAX_DISTINCT_CITY_IDS_PER_BATCH);
  if (cityIds.size > cappedCityIds.length) {
    log.warn("city_view_fanout_capped", {
      distinct: cityIds.size,
      cap: MAX_DISTINCT_CITY_IDS_PER_BATCH,
    });
  }
  for (const cityId of cappedCityIds) writes.push(recordCityView(today, cityId));
  for (const action of actions) writes.push(recordUserAction(today, action));

  await Promise.allSettled(writes);
}

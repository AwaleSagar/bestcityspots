import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase";

// =============================================================================
// Analytics API Route - Receives and aggregates visitor analytics
// =============================================================================

// Event types matching the database schema
const ActionType = z.enum([
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

const SourceType = z.enum([
  "organic",
  "social",
  "referral",
  "direct",
  "paid",
  "email",
  "other",
]);

const DeviceType = z.enum(["desktop", "mobile", "tablet", "other"]);

// Analytics event schema
const AnalyticsEventSchema = z.object({
  type: z.enum(["pageview", "action", "session_end"]),
  sessionId: z.string().min(1),
  isNewVisitor: z.boolean().optional(),
  path: z.string().optional(),
  cityId: z.number().optional(),
  action: ActionType.optional(),
  referrer: z.string().optional(),
  sessionDuration: z.number().optional(), // in seconds
  pageCount: z.number().optional(),
  hasGeoConsent: z.boolean().optional(),
});

const AnalyticsPayloadSchema = z.object({
  events: z.array(AnalyticsEventSchema).min(1).max(50),
  timestamp: z.string(),
});

type AnalyticsEvent = z.infer<typeof AnalyticsEventSchema>;

// =============================================================================
// Helper Functions
// =============================================================================

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function parseUserAgent(ua: string): {
  deviceType: z.infer<typeof DeviceType>;
  browser: string | null;
  os: string | null;
} {
  const uaLower = ua.toLowerCase();

  // Device type detection
  let deviceType: z.infer<typeof DeviceType> = "desktop";
  if (/mobile|android|iphone|ipod|blackberry|windows phone/i.test(ua)) {
    deviceType = "mobile";
  } else if (/tablet|ipad|playbook|silk/i.test(ua)) {
    deviceType = "tablet";
  }

  // Browser detection
  let browser: string | null = null;
  if (uaLower.includes("firefox")) browser = "Firefox";
  else if (uaLower.includes("edg")) browser = "Edge";
  else if (uaLower.includes("chrome")) browser = "Chrome";
  else if (uaLower.includes("safari")) browser = "Safari";
  else if (uaLower.includes("opera") || uaLower.includes("opr")) browser = "Opera";

  // OS detection
  let os: string | null = null;
  if (uaLower.includes("windows")) os = "Windows";
  else if (uaLower.includes("mac os") || uaLower.includes("macos")) os = "macOS";
  else if (uaLower.includes("linux")) os = "Linux";
  else if (uaLower.includes("android")) os = "Android";
  else if (uaLower.includes("iphone") || uaLower.includes("ipad")) os = "iOS";

  return { deviceType, browser, os };
}

function parseReferrer(referrer: string | null): {
  sourceType: z.infer<typeof SourceType>;
  sourceName: string;
} {
  if (!referrer || referrer === "") {
    return { sourceType: "direct", sourceName: "direct" };
  }

  const refLower = referrer.toLowerCase();

  // Social media
  if (refLower.includes("facebook") || refLower.includes("fb.com")) {
    return { sourceType: "social", sourceName: "Facebook" };
  }
  if (refLower.includes("twitter") || refLower.includes("t.co") || refLower.includes("x.com")) {
    return { sourceType: "social", sourceName: "Twitter/X" };
  }
  if (refLower.includes("instagram")) {
    return { sourceType: "social", sourceName: "Instagram" };
  }
  if (refLower.includes("linkedin")) {
    return { sourceType: "social", sourceName: "LinkedIn" };
  }
  if (refLower.includes("pinterest")) {
    return { sourceType: "social", sourceName: "Pinterest" };
  }
  if (refLower.includes("reddit")) {
    return { sourceType: "social", sourceName: "Reddit" };
  }
  if (refLower.includes("tiktok")) {
    return { sourceType: "social", sourceName: "TikTok" };
  }
  if (refLower.includes("youtube")) {
    return { sourceType: "social", sourceName: "YouTube" };
  }

  // Search engines (organic)
  if (refLower.includes("google")) {
    return { sourceType: "organic", sourceName: "Google" };
  }
  if (refLower.includes("bing")) {
    return { sourceType: "organic", sourceName: "Bing" };
  }
  if (refLower.includes("duckduckgo")) {
    return { sourceType: "organic", sourceName: "DuckDuckGo" };
  }
  if (refLower.includes("yahoo")) {
    return { sourceType: "organic", sourceName: "Yahoo" };
  }
  if (refLower.includes("baidu")) {
    return { sourceType: "organic", sourceName: "Baidu" };
  }

  // Email providers
  if (
    refLower.includes("mail.") ||
    refLower.includes("outlook") ||
    refLower.includes("gmail")
  ) {
    return { sourceType: "email", sourceName: "Email" };
  }

  // Extract domain for other referrals
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

async function updateDailyVisitorStats(
  date: string,
  events: AnalyticsEvent[],
  sessionDuration: number | null,
  pageCount: number | null
) {
  if (!supabaseServer) return;

  // Count unique sessions and new visitors
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

  const totalVisits = sessions.size;
  const uniqueVisitors = sessions.size;

  // Calculate bounce rate (single page visit)
  const isBounce = pageCount !== null && pageCount <= 1;

  await supabaseServer.rpc("upsert_daily_visitor_stats", {
    p_date: date,
    p_visits: totalVisits,
    p_unique: uniqueVisitors,
    p_pageviews: pageViews,
    p_duration: sessionDuration || 0,
    p_bounce: isBounce ? 1 : 0,
    p_new: newVisitors,
    p_returning: returningVisitors,
  });
}

async function updateTrafficSources(
  date: string,
  sourceType: z.infer<typeof SourceType>,
  sourceName: string,
  uniqueVisitors: number
) {
  if (!supabaseServer) return;

  const { error } = await supabaseServer.rpc("upsert_traffic_source", {
    p_date: date,
    p_source_type: sourceType,
    p_source_name: sourceName,
    p_visits: 1,
    p_unique: uniqueVisitors,
  });

  if (error) {
    console.error("Error updating traffic sources:", error);
  }
}

async function updateDeviceStats(
  date: string,
  deviceType: z.infer<typeof DeviceType>,
  browser: string | null,
  os: string | null
) {
  if (!supabaseServer) return;

  // Use raw SQL for atomic upsert with increment
  const { error } = await supabaseServer.rpc("upsert_device_stats", {
    p_date: date,
    p_device: deviceType,
    p_browser: browser,
    p_os: os,
  });

  if (error) {
    console.error("Error updating device stats:", error);
  }
}

async function updateGeoStats(
  date: string,
  countryCode: string,
  countryName: string,
  city: string | null
) {
  if (!supabaseServer) return;

  const { error } = await supabaseServer.rpc("upsert_geo_stats", {
    p_date: date,
    p_country_code: countryCode,
    p_country_name: countryName,
    p_city: city,
  });

  if (error) {
    console.error("Error updating geo stats:", error);
  }
}

async function updateCityViews(date: string, cityId: number) {
  if (!supabaseServer) return;

  const { error } = await supabaseServer.rpc("upsert_city_views", {
    p_date: date,
    p_city_id: cityId,
  });

  if (error) {
    console.error("Error updating city views:", error);
  }
}

async function updateUserActions(
  date: string,
  actionType: z.infer<typeof ActionType>
) {
  if (!supabaseServer) return;

  const { error } = await supabaseServer.rpc("upsert_user_action", {
    p_date: date,
    p_action: actionType,
  });

  if (error) {
    console.error("Error updating user actions:", error);
  }
}

// =============================================================================
// Route Handler
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // Check if supabaseServer is available
    if (!supabaseServer) {
      return NextResponse.json(
        { error: "Analytics service unavailable" },
        { status: 503 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const result = AnalyticsPayloadSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: result.error.issues },
        { status: 400 }
      );
    }

    const { events } = result.data;
    const today = getToday();

    // Extract request metadata
    const userAgent = request.headers.get("user-agent") || "";
    const referrer = request.headers.get("referer") || events[0]?.referrer || null;

    // Vercel provides geo headers automatically
    const countryCode = request.headers.get("x-vercel-ip-country") || null;
    const countryName = request.headers.get("x-vercel-ip-country-region") || countryCode;
    const city = request.headers.get("x-vercel-ip-city") || null;

    // Parse device info
    const { deviceType, browser, os } = parseUserAgent(userAgent);

    // Parse referrer source
    const { sourceType, sourceName } = parseReferrer(referrer);

    // Find session end event for duration
    const sessionEndEvent = events.find((e) => e.type === "session_end");
    const sessionDuration = sessionEndEvent?.sessionDuration || null;
    const pageCount = sessionEndEvent?.pageCount || null;

    // Check if visitor consented to geo tracking
    const hasGeoConsent = events.some((e) => e.hasGeoConsent === true);

    // Process events in parallel
    const promises: Promise<void>[] = [];

    // Update daily visitor stats
    promises.push(
      updateDailyVisitorStats(today, events, sessionDuration, pageCount)
    );

    // Update traffic sources (once per batch)
    const isNewVisitor = events.some((e) => e.isNewVisitor === true);
    promises.push(
      updateTrafficSources(today, sourceType, sourceName, isNewVisitor ? 1 : 0)
    );

    // Update device stats (once per batch)
    promises.push(updateDeviceStats(today, deviceType, browser, os));

    // Update geo stats if consent given
    if (hasGeoConsent && countryCode) {
      promises.push(
        updateGeoStats(today, countryCode, countryName || countryCode, city)
      );
    }

    // Process individual events
    for (const event of events) {
      // Track city views
      if (event.cityId) {
        promises.push(updateCityViews(today, event.cityId));
      }

      // Track user actions
      if (event.action) {
        promises.push(updateUserActions(today, event.action));
      }
    }

    // Execute all updates
    await Promise.allSettled(promises);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Disable caching for analytics endpoint
export const dynamic = "force-dynamic";

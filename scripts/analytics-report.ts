/**
 * Analytics Report Generator for Marketing Team
 * Uses Supabase client directly - no psql required
 *
 * Usage:
 *   npx tsx scripts/analytics-report.ts              # Last 7 days (default)
 *   npx tsx scripts/analytics-report.ts --days 30   # Last 30 days
 *   npx tsx scripts/analytics-report.ts --json      # Output as JSON
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Load .env.local first, then .env
config({ path: ".env.local" });
config({ path: ".env" });

// =============================================================================
// Setup
// =============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Error: Missing Supabase credentials in environment variables");
  console.error(
    "Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Parse arguments
const args = process.argv.slice(2);
const daysIndex = args.indexOf("--days");
const days = daysIndex !== -1 ? parseInt(args[daysIndex + 1], 10) : 7;
const jsonOutput = args.includes("--json");

// Calculate date range
const today = new Date();
const fromDate = new Date(today);
fromDate.setDate(fromDate.getDate() - days);

const DATE_FROM = fromDate.toISOString().split("T")[0];
const DATE_TO = today.toISOString().split("T")[0];

// =============================================================================
// Colors (for terminal output)
// =============================================================================

const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
};

const c = (color: keyof typeof colors, text: string) =>
  jsonOutput ? text : `${colors[color]}${text}${colors.reset}`;

// =============================================================================
// Helpers
// =============================================================================

function formatNumber(num: number): string {
  return num.toLocaleString();
}

function printHeader() {
  console.log();
  console.log(
    c("bold", c("blue", "═══════════════════════════════════════════════════════════════════"))
  );
  console.log(c("bold", c("blue", "     📊  BESTCITYSPOTS ANALYTICS REPORT")));
  console.log(
    c("bold", c("blue", "═══════════════════════════════════════════════════════════════════"))
  );
  console.log();
  console.log(
    `${c("dim", "Report Period:")} ${c("bold", DATE_FROM)} ${c("dim", "to")} ${c("bold", DATE_TO)}`
  );
  console.log(`${c("dim", "Generated:")}     ${new Date().toISOString()}`);
  console.log();
}

function printSection(title: string, icon: string) {
  console.log();
  console.log(
    c("bold", c("cyan", "─────────────────────────────────────────────────────────────────"))
  );
  console.log(c("bold", c("cyan", `  ${icon}  ${title}`)));
  console.log(
    c("bold", c("cyan", "─────────────────────────────────────────────────────────────────"))
  );
}

// =============================================================================
// Report Sections
// =============================================================================

async function getOverview() {
  const { data, error } = await supabase
    .from("daily_visitor_stats")
    .select("*")
    .gte("stat_date", DATE_FROM)
    .lte("stat_date", DATE_TO);

  if (error) {
    console.error("Error fetching overview:", error.message);
    return null;
  }

  if (!data || data.length === 0) {
    return null;
  }

  const totals = data.reduce(
    (acc, row) => ({
      totalVisits: acc.totalVisits + (row.total_visits || 0),
      uniqueVisitors: acc.uniqueVisitors + (row.unique_visitors || 0),
      pageViews: acc.pageViews + (row.page_views || 0),
      newVisitors: acc.newVisitors + (row.new_visitors || 0),
      returningVisitors: acc.returningVisitors + (row.returning_visitors || 0),
      avgSessionDuration: acc.avgSessionDuration + (row.avg_session_duration_sec || 0),
      bounceRate: acc.bounceRate + (row.bounce_rate_pct || 0),
    }),
    {
      totalVisits: 0,
      uniqueVisitors: 0,
      pageViews: 0,
      newVisitors: 0,
      returningVisitors: 0,
      avgSessionDuration: 0,
      bounceRate: 0,
    }
  );

  // Calculate averages
  const count = data.length;
  totals.avgSessionDuration = Math.round(totals.avgSessionDuration / count);
  totals.bounceRate = Math.round(totals.bounceRate / count);

  return totals;
}

async function getTrafficSources() {
  const { data, error } = await supabase
    .from("traffic_sources_daily")
    .select("source_type, source_name, visits, unique_visitors")
    .gte("stat_date", DATE_FROM)
    .lte("stat_date", DATE_TO);

  if (error) {
    console.error("Error fetching traffic sources:", error.message);
    return null;
  }

  // Aggregate by source_type
  const byType = new Map<string, { visits: number; unique: number }>();
  const byName = new Map<string, number>();

  for (const row of data || []) {
    const key = row.source_type;
    const existing = byType.get(key) || { visits: 0, unique: 0 };
    byType.set(key, {
      visits: existing.visits + (row.visits || 0),
      unique: existing.unique + (row.unique_visitors || 0),
    });

    if (row.source_type === "referral" && row.source_name) {
      const nameVisits = byName.get(row.source_name) || 0;
      byName.set(row.source_name, nameVisits + (row.visits || 0));
    }
  }

  return {
    byType: Array.from(byType.entries())
      .map(([type, stats]) => ({ type, ...stats }))
      .sort((a, b) => b.visits - a.visits),
    topReferrers: Array.from(byName.entries())
      .map(([name, visits]) => ({ name, visits }))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 5),
  };
}

async function getDeviceStats() {
  const { data, error } = await supabase
    .from("device_stats_daily")
    .select("device_type, browser, visits")
    .gte("stat_date", DATE_FROM)
    .lte("stat_date", DATE_TO);

  if (error) {
    console.error("Error fetching device stats:", error.message);
    return null;
  }

  const byDevice = new Map<string, number>();
  const byBrowser = new Map<string, number>();

  for (const row of data || []) {
    const deviceVisits = byDevice.get(row.device_type) || 0;
    byDevice.set(row.device_type, deviceVisits + (row.visits || 0));

    if (row.browser) {
      const browserVisits = byBrowser.get(row.browser) || 0;
      byBrowser.set(row.browser, browserVisits + (row.visits || 0));
    }
  }

  const totalVisits = Array.from(byDevice.values()).reduce((a, b) => a + b, 0);

  return {
    devices: Array.from(byDevice.entries())
      .map(([device, visits]) => ({
        device,
        visits,
        share: totalVisits > 0 ? Math.round((visits / totalVisits) * 100) : 0,
      }))
      .sort((a, b) => b.visits - a.visits),
    browsers: Array.from(byBrowser.entries())
      .map(([browser, visits]) => ({ browser, visits }))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 5),
    totalVisits,
  };
}

async function getGeoStats() {
  const { data, error } = await supabase
    .from("geo_stats_daily")
    .select("country_code, visits, unique_visitors")
    .gte("stat_date", DATE_FROM)
    .lte("stat_date", DATE_TO);

  if (error) {
    console.error("Error fetching geo stats:", error.message);
    return null;
  }

  const byCountry = new Map<string, { visits: number; unique: number }>();

  for (const row of data || []) {
    const key = row.country_code;
    const existing = byCountry.get(key) || { visits: 0, unique: 0 };
    byCountry.set(key, {
      visits: existing.visits + (row.visits || 0),
      unique: existing.unique + (row.unique_visitors || 0),
    });
  }

  return Array.from(byCountry.entries())
    .map(([country, stats]) => ({ country, ...stats }))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 10);
}

async function getCityViews() {
  const { data, error } = await supabase
    .from("city_views_daily")
    .select(
      `
      city_id,
      views,
      unique_viewers,
      cities (
        city,
        country
      )
    `
    )
    .gte("stat_date", DATE_FROM)
    .lte("stat_date", DATE_TO);

  if (error) {
    console.error("Error fetching city views:", error.message);
    return null;
  }

  const byCity = new Map<
    number,
    { name: string; country: string; views: number; unique: number }
  >();

  for (const row of data || []) {
    // Supabase returns the joined table as an object (or null)
    const cityData = row.cities as unknown as { city: string; country: string } | null;
    const existing = byCity.get(row.city_id) || {
      name: cityData?.city || `City #${row.city_id}`,
      country: cityData?.country || "N/A",
      views: 0,
      unique: 0,
    };
    byCity.set(row.city_id, {
      ...existing,
      views: existing.views + (row.views || 0),
      unique: existing.unique + (row.unique_viewers || 0),
    });
  }

  return Array.from(byCity.values())
    .sort((a, b) => b.views - a.views)
    .slice(0, 15);
}

async function getUserActions() {
  const { data, error } = await supabase
    .from("user_actions_daily")
    .select("action_type, action_count")
    .gte("stat_date", DATE_FROM)
    .lte("stat_date", DATE_TO);

  if (error) {
    console.error("Error fetching user actions:", error.message);
    return null;
  }

  const byAction = new Map<string, number>();

  for (const row of data || []) {
    const count = byAction.get(row.action_type) || 0;
    byAction.set(row.action_type, count + (row.action_count || 0));
  }

  return Array.from(byAction.entries())
    .map(([action, count]) => ({ action, count }))
    .sort((a, b) => b.count - a.count);
}

async function getDailyTrend() {
  const { data, error } = await supabase
    .from("daily_visitor_stats")
    .select("stat_date, total_visits, unique_visitors, page_views")
    .order("stat_date", { ascending: false })
    .limit(7);

  if (error) {
    console.error("Error fetching daily trend:", error.message);
    return null;
  }

  return data || [];
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  if (jsonOutput) {
    // JSON output mode
    const [overview, traffic, devices, geo, cities, actions, trend] = await Promise.all([
      getOverview(),
      getTrafficSources(),
      getDeviceStats(),
      getGeoStats(),
      getCityViews(),
      getUserActions(),
      getDailyTrend(),
    ]);

    const report = {
      reportPeriod: { from: DATE_FROM, to: DATE_TO, generatedAt: new Date().toISOString() },
      overview,
      trafficSources: traffic,
      devices,
      geography: geo,
      topCities: cities,
      userActions: actions,
      dailyTrend: trend,
    };

    console.log(JSON.stringify(report, null, 2));
    return;
  }

  // Terminal output mode
  printHeader();

  // Overview
  printSection("VISITOR OVERVIEW", "👥");
  const overview = await getOverview();
  if (overview) {
    console.log();
    console.log(`  ${c("bold", "Total Visits:")}        ${formatNumber(overview.totalVisits)}`);
    console.log(`  ${c("bold", "Unique Visitors:")}     ${formatNumber(overview.uniqueVisitors)}`);
    console.log(`  ${c("bold", "Page Views:")}          ${formatNumber(overview.pageViews)}`);
    console.log();
    console.log(`  ${c("bold", "Avg Session:")}         ${overview.avgSessionDuration} seconds`);
    console.log(`  ${c("bold", "Bounce Rate:")}         ${overview.bounceRate}%`);
    console.log();
    console.log(`  ${c("green", "New Visitors:")}        ${formatNumber(overview.newVisitors)}`);
    console.log(
      `  ${c("blue", "Returning:")}           ${formatNumber(overview.returningVisitors)}`
    );
  } else {
    console.log(`  ${c("dim", "No data available for this period")}`);
  }

  // Traffic Sources
  printSection("TRAFFIC SOURCES", "🔗");
  const traffic = await getTrafficSources();
  if (traffic && traffic.byType.length > 0) {
    console.log();
    console.log(
      `  ${c("bold", "Source".padEnd(15))} ${c("bold", "Visits".padStart(12))} ${c("bold", "Unique".padStart(12))}`
    );
    console.log("  ─────────────────────────────────────────");
    for (const source of traffic.byType) {
      console.log(
        `  ${source.type.padEnd(15)} ${formatNumber(source.visits).padStart(12)} ${formatNumber(source.unique).padStart(12)}`
      );
    }
    if (traffic.topReferrers.length > 0) {
      console.log();
      console.log(`  ${c("bold", "Top Referrers:")}`);
      for (const ref of traffic.topReferrers) {
        console.log(`    • ${ref.name} (${formatNumber(ref.visits)} visits)`);
      }
    }
  } else {
    console.log(`  ${c("dim", "No traffic source data available")}`);
  }

  // Device Stats
  printSection("DEVICE BREAKDOWN", "📱");
  const devices = await getDeviceStats();
  if (devices && devices.devices.length > 0) {
    console.log();
    console.log(
      `  ${c("bold", "Device".padEnd(12))} ${c("bold", "Visits".padStart(12))} ${c("bold", "Share".padStart(8))}`
    );
    console.log("  ────────────────────────────────────");
    for (const device of devices.devices) {
      console.log(
        `  ${device.device.padEnd(12)} ${formatNumber(device.visits).padStart(12)} ${(device.share + "%").padStart(7)}`
      );
    }
    if (devices.browsers.length > 0) {
      console.log();
      console.log(`  ${c("bold", "Top Browsers:")}`);
      for (const browser of devices.browsers) {
        console.log(`    • ${browser.browser} (${formatNumber(browser.visits)})`);
      }
    }
  } else {
    console.log(`  ${c("dim", "No device data available")}`);
  }

  // Geographic Stats
  printSection("GEOGRAPHIC DISTRIBUTION", "🌍");
  const geo = await getGeoStats();
  if (geo && geo.length > 0) {
    console.log();
    console.log(
      `  ${c("bold", "Country".padEnd(8))} ${c("bold", "Visits".padStart(12))} ${c("bold", "Unique".padStart(12))}`
    );
    console.log("  ─────────────────────────────────────");
    for (const country of geo) {
      console.log(
        `  ${country.country.padEnd(8)} ${formatNumber(country.visits).padStart(12)} ${formatNumber(country.unique).padStart(12)}`
      );
    }
  } else {
    console.log(`  ${c("dim", "No geographic data available (consent-based)")}`);
  }

  // Top City Pages
  printSection("TOP CITY PAGES", "🏙️");
  const cities = await getCityViews();
  if (cities && cities.length > 0) {
    console.log();
    console.log(
      `  ${c("bold", "City".padEnd(25))} ${c("bold", "Country".padEnd(15))} ${c("bold", "Views".padStart(10))} ${c("bold", "Unique".padStart(10))}`
    );
    console.log("  ────────────────────────────────────────────────────────────────");
    let rank = 1;
    for (const city of cities) {
      const name = city.name.length > 22 ? city.name.substring(0, 22) + "..." : city.name;
      console.log(
        `  ${(rank + ".").padEnd(4)}${name.padEnd(21)} ${city.country.padEnd(15)} ${formatNumber(city.views).padStart(10)} ${formatNumber(city.unique).padStart(10)}`
      );
      rank++;
    }
  } else {
    console.log(`  ${c("dim", "No city view data available")}`);
  }

  // User Actions
  printSection("USER ENGAGEMENT", "⚡");
  const actions = await getUserActions();
  if (actions && actions.length > 0) {
    console.log();
    console.log(`  ${c("bold", "Action".padEnd(20))} ${c("bold", "Count".padStart(12))}`);
    console.log("  ──────────────────────────────────────────────");
    for (const action of actions) {
      console.log(`  ${action.action.padEnd(20)} ${formatNumber(action.count).padStart(12)}`);
    }
  } else {
    console.log(`  ${c("dim", "No user action data available")}`);
  }

  // Daily Trend
  printSection("DAILY TREND (Last 7 Days)", "📈");
  const trend = await getDailyTrend();
  if (trend && trend.length > 0) {
    console.log();
    console.log(
      `  ${c("bold", "Date".padEnd(12))} ${c("bold", "Visits".padStart(10))} ${c("bold", "Unique".padStart(10))} ${c("bold", "Views".padStart(10))}`
    );
    console.log("  ─────────────────────────────────────────────");
    for (const day of trend) {
      console.log(
        `  ${day.stat_date.padEnd(12)} ${formatNumber(day.total_visits || 0).padStart(10)} ${formatNumber(day.unique_visitors || 0).padStart(10)} ${formatNumber(day.page_views || 0).padStart(10)}`
      );
    }
  } else {
    console.log(`  ${c("dim", "No trend data available")}`);
  }

  console.log();
  console.log(
    c("bold", c("blue", "═══════════════════════════════════════════════════════════════════"))
  );
  console.log(c("dim", "  Run with --json for machine-readable output"));
  console.log(
    c("bold", c("blue", "═══════════════════════════════════════════════════════════════════"))
  );
  console.log();
}

main().catch((err) => {
  console.error("Report failed:", err);
  process.exit(1);
});

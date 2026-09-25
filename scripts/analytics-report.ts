/**
 * Analytics report from the aggregate analytics tables.
 *
 * Usage:
 *   npm run analytics              # Last 7 days (default)
 *   npm run analytics -- --days 30
 *   npm run analytics -- --json    # Machine-readable
 *
 * Needs SUPABASE_SECRET_KEY (the tables are server-only). Admins can see the
 * same numbers without a secret key at /admin.
 */

import { secretClient } from "./db/env";

// =============================================================================
// Setup
// =============================================================================

const supabase = secretClient();

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
    .select(
      "page_views, sessions, new_visitors, returning_visitors, sessions_ended, bounced_sessions, total_session_duration_sec"
    )
    .gte("stat_date", DATE_FROM)
    .lte("stat_date", DATE_TO);

  if (error) {
    console.error("Error fetching overview:", error.message);
    return null;
  }

  if (!data || data.length === 0) {
    return null;
  }

  type Row = (typeof data)[0];
  const sum = (pick: (row: Row) => number) => data.reduce((acc, row) => acc + pick(row), 0);
  const sessionsEnded = sum((r) => r.sessions_ended);

  // Rates over the whole period from raw counters — never an average of
  // daily averages.
  return {
    pageViews: sum((r) => r.page_views),
    sessions: sum((r) => r.sessions),
    newVisitors: sum((r) => r.new_visitors),
    returningVisitors: sum((r) => r.returning_visitors),
    sessionsEnded,
    avgSessionDuration:
      sessionsEnded > 0 ? Math.round(sum((r) => r.total_session_duration_sec) / sessionsEnded) : 0,
    bounceRate:
      sessionsEnded > 0
        ? Math.round((1000 * sum((r) => r.bounced_sessions)) / sessionsEnded) / 10
        : 0,
  };
}

async function getTrafficSources() {
  const { data, error } = await supabase
    .from("traffic_sources_daily")
    .select("source_type, source_name, visits, new_visitors")
    .gte("stat_date", DATE_FROM)
    .lte("stat_date", DATE_TO);

  if (error) {
    console.error("Error fetching traffic sources:", error.message);
    return null;
  }

  // Aggregate by source_type
  const byType = new Map<string, { visits: number; newVisitors: number }>();
  const byName = new Map<string, number>();

  for (const row of data || []) {
    const key = row.source_type;
    const existing = byType.get(key) || { visits: 0, newVisitors: 0 };
    byType.set(key, {
      visits: existing.visits + (row.visits || 0),
      newVisitors: existing.newVisitors + (row.new_visitors || 0),
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
      // '' is the stored "unknown".
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
    .select("country_code, visits")
    .gte("stat_date", DATE_FROM)
    .lte("stat_date", DATE_TO);

  if (error) {
    console.error("Error fetching geo stats:", error.message);
    return null;
  }

  const byCountry = new Map<string, { visits: number }>();

  for (const row of data || []) {
    const key = row.country_code;
    const existing = byCountry.get(key) || { visits: 0 };
    byCountry.set(key, { visits: existing.visits + (row.visits || 0) });
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

  const byCity = new Map<number, { name: string; country: string; views: number }>();

  for (const row of data || []) {
    // Supabase returns the joined table as an object (or null)
    const cityData = row.cities as unknown as { city: string; country: string } | null;
    const existing = byCity.get(row.city_id) || {
      name: cityData?.city || `City #${row.city_id}`,
      country: cityData?.country || "N/A",
      views: 0,
    };
    byCity.set(row.city_id, {
      ...existing,
      views: existing.views + (row.views || 0),
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
    .from("daily_visitor_summary")
    .select("stat_date, page_views, sessions, bounce_rate_pct")
    .gte("stat_date", DATE_FROM)
    .lte("stat_date", DATE_TO)
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
    console.log(`  ${c("bold", "Page Views:")}          ${formatNumber(overview.pageViews)}`);
    console.log(`  ${c("bold", "Sessions:")}            ${formatNumber(overview.sessions)}`);
    console.log();
    console.log(`  ${c("bold", "Avg Session:")}         ${overview.avgSessionDuration} seconds`);
    console.log(`  ${c("bold", "Bounce Rate:")}         ${overview.bounceRate}%`);
    console.log(
      `  ${c("dim", `(rates over ${formatNumber(overview.sessionsEnded)} completed sessions)`)}`
    );
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
      `  ${c("bold", "Source".padEnd(15))} ${c("bold", "Visits".padStart(12))} ${c("bold", "New".padStart(12))}`
    );
    console.log("  ─────────────────────────────────────────");
    for (const source of traffic.byType) {
      console.log(
        `  ${source.type.padEnd(15)} ${formatNumber(source.visits).padStart(12)} ${formatNumber(source.newVisitors).padStart(12)}`
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
    console.log(`  ${c("bold", "Country".padEnd(8))} ${c("bold", "Visits".padStart(12))}`);
    console.log("  ─────────────────────");
    for (const country of geo) {
      console.log(`  ${country.country.padEnd(8)} ${formatNumber(country.visits).padStart(12)}`);
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
      `  ${c("bold", "City".padEnd(25))} ${c("bold", "Country".padEnd(15))} ${c("bold", "Views".padStart(10))}`
    );
    console.log("  ────────────────────────────────────────────────────────────────");
    let rank = 1;
    for (const city of cities) {
      const name = city.name.length > 22 ? city.name.substring(0, 22) + "..." : city.name;
      console.log(
        `  ${(rank + ".").padEnd(4)}${name.padEnd(21)} ${city.country.padEnd(15)} ${formatNumber(city.views).padStart(10)}`
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
      `  ${c("bold", "Date".padEnd(12))} ${c("bold", "Views".padStart(10))} ${c("bold", "Sessions".padStart(10))} ${c("bold", "Bounce".padStart(8))}`
    );
    console.log("  ─────────────────────────────────────────────");
    for (const day of trend) {
      const bounce = day.bounce_rate_pct === null ? "—" : `${day.bounce_rate_pct}%`;
      console.log(
        `  ${(day.stat_date ?? "").padEnd(12)} ${formatNumber(day.page_views || 0).padStart(10)} ${formatNumber(day.sessions || 0).padStart(10)} ${bounce.padStart(8)}`
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

/**
 * Comprehensive Supabase backend test harness.
 *
 * Modular suites:
 *   - schema:      verify expected tables, columns, and RPC functions exist
 *   - queries:     exercise read paths the app depends on
 *   - rpc:         call critical RPCs (search_cities_elastic, ...)
 *   - storage:     verify the place_images bucket is reachable
 *   - rls:         confirm anon role cannot write to protected tables
 *   - consistency: cross-table invariants (FK integrity, cache freshness)
 *   - performance: response-time budgets + light parallel-load probe
 *
 * Usage:
 *   tsx scripts/test-supabase-backend.ts                # run all suites
 *   tsx scripts/test-supabase-backend.ts --suite=rpc    # one suite
 *   tsx scripts/test-supabase-backend.ts --json         # machine-readable
 *   tsx scripts/test-supabase-backend.ts --concurrency=20
 *
 * Read-only by default. Never writes to production tables.
 * Loads credentials from `.env.local`.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// ────────────────────────────────────────────────────────────────────────────
// CLI args
// ────────────────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const hit = argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return undefined;
  const eq = hit.indexOf("=");
  return eq === -1 ? "" : hit.slice(eq + 1);
};

const SUITE_FILTER = flag("suite");
const JSON_OUTPUT = flag("json") !== undefined;
const CONCURRENCY = Number(flag("concurrency") ?? 10);
const PERF_ITERATIONS = Number(flag("iterations") ?? 5);

// ────────────────────────────────────────────────────────────────────────────
// Logger
// ────────────────────────────────────────────────────────────────────────────

const C = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

const noColor = JSON_OUTPUT || !process.stdout.isTTY;
const paint = (color: string, s: string) => (noColor ? s : `${color}${s}${C.reset}`);

const log = {
  info: (msg: string) => !JSON_OUTPUT && console.log(paint(C.cyan, "→ ") + msg),
  ok: (msg: string) => !JSON_OUTPUT && console.log(paint(C.green, "✓ ") + msg),
  warn: (msg: string) => !JSON_OUTPUT && console.log(paint(C.yellow, "! ") + msg),
  fail: (msg: string) => !JSON_OUTPUT && console.log(paint(C.red, "✗ ") + msg),
  section: (title: string) =>
    !JSON_OUTPUT && console.log("\n" + paint(C.bold + C.blue, `── ${title} ──`)),
  dim: (msg: string) => !JSON_OUTPUT && console.log(paint(C.dim, `  ${msg}`)),
};

// ────────────────────────────────────────────────────────────────────────────
// Test framework
// ────────────────────────────────────────────────────────────────────────────

type Status = "pass" | "fail" | "warn" | "skip";

interface TestResult {
  suite: string;
  name: string;
  status: Status;
  durationMs: number;
  message?: string;
  details?: Record<string, unknown>;
}

const results: TestResult[] = [];

async function runTest(
  suite: string,
  name: string,
  fn: () => Promise<void | { warn?: string; details?: Record<string, unknown> }>
): Promise<void> {
  const start = performance.now();
  try {
    const out = await fn();
    const durationMs = Math.round(performance.now() - start);
    if (out && out.warn) {
      results.push({ suite, name, status: "warn", durationMs, message: out.warn, details: out.details });
      log.warn(`${name} ${paint(C.dim, `(${durationMs}ms)`)} — ${out.warn}`);
    } else {
      results.push({ suite, name, status: "pass", durationMs, details: out?.details });
      log.ok(`${name} ${paint(C.dim, `(${durationMs}ms)`)}`);
    }
  } catch (err) {
    const durationMs = Math.round(performance.now() - start);
    const message = err instanceof Error ? err.message : String(err);
    results.push({ suite, name, status: "fail", durationMs, message });
    log.fail(`${name} ${paint(C.dim, `(${durationMs}ms)`)} — ${message}`);
  }
}

function skipTest(suite: string, name: string, reason: string) {
  results.push({ suite, name, status: "skip", durationMs: 0, message: reason });
  log.dim(`skip ${name} — ${reason}`);
}

function shouldRunSuite(suite: string): boolean {
  return !SUITE_FILTER || SUITE_FILTER === suite;
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

// ────────────────────────────────────────────────────────────────────────────
// Clients
// ────────────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
  );
  process.exit(2);
}

const anon: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

const admin: SupabaseClient | null = SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

// ────────────────────────────────────────────────────────────────────────────
// Expectations (kept in sync with /supabase/*.sql)
// ────────────────────────────────────────────────────────────────────────────

const EXPECTED_TABLES = [
  "cities",
  "city_ai_insights",
  "city_metrics",
  "city_places_cache",
  "place_details_cache",
  "city_search_aliases",
  "daily_visitor_stats",
  "traffic_sources_daily",
  "device_stats_daily",
  "geo_stats_daily",
  "city_views_daily",
  "user_actions_daily",
] as const;

const EXPECTED_RPCS = ["search_cities_elastic"] as const;

const STORAGE_BUCKET = "place_images";

// ────────────────────────────────────────────────────────────────────────────
// Suite: schema
// ────────────────────────────────────────────────────────────────────────────

async function suiteSchema() {
  if (!shouldRunSuite("schema")) return;
  log.section("schema");

  for (const table of EXPECTED_TABLES) {
    await runTest("schema", `table public.${table} reachable`, async () => {
      const { error } = await anon.from(table).select("*", { count: "exact", head: true }).limit(1);
      if (error) throw new Error(error.message);
    });
  }

  await runTest("schema", "cities has expected columns", async () => {
    const { data, error } = await anon
      .from("cities")
      .select("id, city, city_ascii, country, iso2, iso3, admin_name, capital, population, lat, lng")
      .limit(1);
    if (error) throw new Error(error.message);
    assert(data && data.length > 0, "cities table is empty");
    const row = data[0] as Record<string, unknown>;
    const required = ["id", "city", "city_ascii", "country", "lat", "lng"];
    for (const k of required) assert(k in row, `missing column: ${k}`);
  });

  for (const fn of EXPECTED_RPCS) {
    await runTest("schema", `rpc ${fn} callable`, async () => {
      const { error } = await anon.rpc(fn, { query: "ping", result_limit: 1 });
      if (error) throw new Error(error.message);
    });
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Suite: queries
// ────────────────────────────────────────────────────────────────────────────

async function suiteQueries() {
  if (!shouldRunSuite("queries")) return;
  log.section("queries");

  await runTest("queries", "list top cities by population", async () => {
    const { data, error } = await anon
      .from("cities")
      .select("id, city, country, population")
      .order("population", { ascending: false, nullsFirst: false })
      .limit(10);
    if (error) throw new Error(error.message);
    assert(data && data.length === 10, `expected 10 rows, got ${data?.length ?? 0}`);
    return { details: { sample: data.slice(0, 3) } };
  });

  await runTest("queries", "ilike search hits Tokyo", async () => {
    const { data, error } = await anon
      .from("cities")
      .select("id, city_ascii")
      .ilike("city_ascii", "%tokyo%")
      .limit(5);
    if (error) throw new Error(error.message);
    assert(data && data.length > 0, "no Tokyo match via ilike");
  });

  await runTest("queries", "city_ai_insights selectable", async () => {
    const { data, error } = await anon
      .from("city_ai_insights")
      .select("city_id, city_name, updated_at")
      .order("updated_at", { ascending: false })
      .limit(5);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return { warn: "table is empty (cache cold)" };
  });

  await runTest("queries", "city_metrics selectable", async () => {
    const { data, error } = await anon
      .from("city_metrics")
      .select("city_id, cost_index, updated_at")
      .limit(5);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return { warn: "table is empty (no metrics seeded)" };
  });

  await runTest("queries", "city_places_cache selectable", async () => {
    const { data, error } = await anon
      .from("city_places_cache")
      .select("city_name, place_type, updated_at")
      .limit(5);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return { warn: "table is empty (cache cold)" };
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Suite: rpc
// ────────────────────────────────────────────────────────────────────────────

async function suiteRpc() {
  if (!shouldRunSuite("rpc")) return;
  log.section("rpc");

  await runTest("rpc", "search_cities_elastic('paris')", async () => {
    const { data, error } = await anon.rpc("search_cities_elastic", {
      query: "paris",
      result_limit: 5,
    });
    if (error) throw new Error(error.message);
    assert(Array.isArray(data) && data.length > 0, "no Paris results");
    const top = data[0] as { city_ascii: string; rank_score: number; match_type: string };
    assert(/paris/i.test(top.city_ascii), `top hit not Paris: ${top.city_ascii}`);
    return { details: { top: top.city_ascii, match_type: top.match_type } };
  });

  await runTest("rpc", "search_cities_elastic typo tolerance ('tokio')", async () => {
    const { data, error } = await anon.rpc("search_cities_elastic", {
      query: "tokio",
      result_limit: 5,
    });
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return { warn: "fuzzy did not resolve 'tokio' → expected Tokyo" };
  });

  await runTest("rpc", "search_cities_elastic empty query is safe", async () => {
    const { data, error } = await anon.rpc("search_cities_elastic", {
      query: "",
      result_limit: 5,
    });
    if (error) throw new Error(error.message);
    assert(Array.isArray(data) && data.length === 0, "empty query should return zero rows");
  });

  await runTest("rpc", "search_cities_elastic respects result_limit", async () => {
    const { data, error } = await anon.rpc("search_cities_elastic", {
      query: "san",
      result_limit: 3,
    });
    if (error) throw new Error(error.message);
    assert((data?.length ?? 0) <= 3, `limit not honored: ${data?.length}`);
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Suite: storage
// ────────────────────────────────────────────────────────────────────────────

async function suiteStorage() {
  if (!shouldRunSuite("storage")) return;
  log.section("storage");

  await runTest("storage", `bucket ${STORAGE_BUCKET} listable`, async () => {
    const { data, error } = await anon.storage.from(STORAGE_BUCKET).list("", { limit: 1 });
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return { warn: "bucket is empty" };
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Suite: rls
// ────────────────────────────────────────────────────────────────────────────

async function suiteRls() {
  if (!shouldRunSuite("rls")) return;
  log.section("rls");

  // Anon must NOT be able to insert into protected tables.
  await runTest("rls", "anon cannot insert into city_metrics", async () => {
    const { error } = await anon
      .from("city_metrics")
      .insert({ city_id: -999999, cost_index: 0 });
    assert(error, "RLS hole: anon insert into city_metrics succeeded");
  });

  await runTest("rls", "anon cannot insert into city_places_cache", async () => {
    const { error } = await anon
      .from("city_places_cache")
      .insert({ city_name: "__test__", place_type: "__test__", places_data: {} });
    assert(error, "RLS hole: anon insert into city_places_cache succeeded");
  });

  await runTest("rls", "anon cannot insert into daily_visitor_stats", async () => {
    const { error } = await anon
      .from("daily_visitor_stats")
      .insert({ stat_date: "1900-01-01", total_visits: 0 });
    assert(error, "RLS hole: anon insert into daily_visitor_stats succeeded");
  });

  await runTest("rls", "anon CAN read public cities", async () => {
    const { data, error } = await anon.from("cities").select("id").limit(1);
    if (error) throw new Error(error.message);
    assert(data && data.length === 1, "anon read of cities returned 0 rows");
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Suite: consistency
// ────────────────────────────────────────────────────────────────────────────

async function suiteConsistency() {
  if (!shouldRunSuite("consistency")) return;
  log.section("consistency");

  await runTest("consistency", "city_ai_insights.city_id ⊂ cities.id", async () => {
    const { data: insights, error } = await anon
      .from("city_ai_insights")
      .select("city_id")
      .limit(50);
    if (error) throw new Error(error.message);
    if (!insights || insights.length === 0) return { warn: "no insights to validate" };
    const ids = insights.map((r) => r.city_id);
    const { data: cities, error: cErr } = await anon
      .from("cities")
      .select("id")
      .in("id", ids);
    if (cErr) throw new Error(cErr.message);
    const known = new Set((cities ?? []).map((c) => c.id));
    const orphans = ids.filter((id) => !known.has(id));
    assert(orphans.length === 0, `orphan city_ids in city_ai_insights: ${orphans.join(",")}`);
  });

  await runTest("consistency", "city_ai_insights freshness vs 365-day TTL", async () => {
    const { data, error } = await anon
      .from("city_ai_insights")
      .select("updated_at")
      .order("updated_at", { ascending: true })
      .limit(1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return { warn: "no insights to validate" };
    const oldest = new Date(data[0].updated_at as string).getTime();
    const ageDays = (Date.now() - oldest) / (24 * 3600 * 1000);
    if (ageDays > 365) return { warn: `oldest insight is ${ageDays.toFixed(0)}d old (TTL = 365d)` };
    return { details: { oldestAgeDays: Math.round(ageDays) } };
  });

  await runTest("consistency", "cities lat/lng within bounds", async () => {
    const { data, error } = await anon
      .from("cities")
      .select("id, lat, lng")
      .or("lat.gt.90,lat.lt.-90,lng.gt.180,lng.lt.-180")
      .limit(5);
    if (error) throw new Error(error.message);
    assert(!data || data.length === 0, `out-of-range coords: ${JSON.stringify(data)}`);
  });

  await runTest("consistency", "city_places_cache has no future updated_at", async () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    const { data, error } = await anon
      .from("city_places_cache")
      .select("city_name, updated_at")
      .gt("updated_at", future)
      .limit(5);
    if (error) throw new Error(error.message);
    assert(!data || data.length === 0, `future timestamps detected: ${JSON.stringify(data)}`);
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Suite: performance
// ────────────────────────────────────────────────────────────────────────────

interface PerfStat {
  p50: number;
  p95: number;
  max: number;
  mean: number;
  errors: number;
}

function summarize(samples: number[], errors: number): PerfStat {
  const sorted = [...samples].sort((a, b) => a - b);
  const pick = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] ?? 0;
  const mean = samples.reduce((s, n) => s + n, 0) / Math.max(1, samples.length);
  return {
    p50: Math.round(pick(0.5)),
    p95: Math.round(pick(0.95)),
    max: Math.round(sorted[sorted.length - 1] ?? 0),
    mean: Math.round(mean),
    errors,
  };
}

async function timeIt(fn: () => Promise<void>): Promise<{ ms: number; ok: boolean }> {
  const start = performance.now();
  try {
    await fn();
    return { ms: performance.now() - start, ok: true };
  } catch {
    return { ms: performance.now() - start, ok: false };
  }
}

async function probe(label: string, fn: () => Promise<void>, budgetMs: number) {
  await runTest("performance", `${label} (budget ${budgetMs}ms p95)`, async () => {
    const samples: number[] = [];
    let errors = 0;
    for (let i = 0; i < PERF_ITERATIONS; i++) {
      const r = await timeIt(fn);
      if (r.ok) samples.push(r.ms);
      else errors++;
    }
    const stats = summarize(samples, errors);
    if (errors > 0) throw new Error(`${errors}/${PERF_ITERATIONS} runs errored`);
    if (stats.p95 > budgetMs) {
      return {
        warn: `p95 ${stats.p95}ms exceeds budget ${budgetMs}ms`,
        details: stats as unknown as Record<string, unknown>,
      };
    }
    return { details: stats as unknown as Record<string, unknown> };
  });
}

async function suitePerformance() {
  if (!shouldRunSuite("performance")) return;
  log.section("performance");

  await probe(
    "select top cities by population",
    async () => {
      const { error } = await anon
        .from("cities")
        .select("id, city, population")
        .order("population", { ascending: false, nullsFirst: false })
        .limit(20);
      if (error) throw new Error(error.message);
    },
    400
  );

  await probe(
    "rpc search_cities_elastic('lond')",
    async () => {
      const { error } = await anon.rpc("search_cities_elastic", {
        query: "lond",
        result_limit: 10,
      });
      if (error) throw new Error(error.message);
    },
    600
  );

  await probe(
    "select cities by id",
    async () => {
      const { error } = await anon.from("cities").select("*").eq("id", 1).limit(1);
      if (error) throw new Error(error.message);
    },
    300
  );

  // Light load probe — N parallel reads.
  await runTest("performance", `parallel read load x${CONCURRENCY}`, async () => {
    const start = performance.now();
    const out = await Promise.allSettled(
      Array.from({ length: CONCURRENCY }, () =>
        anon.from("cities").select("id").order("population", { ascending: false }).limit(5)
      )
    );
    const totalMs = Math.round(performance.now() - start);
    const failed = out.filter(
      (r) => r.status === "rejected" || (r.status === "fulfilled" && r.value.error)
    ).length;
    if (failed > 0) throw new Error(`${failed}/${CONCURRENCY} parallel reads failed`);
    return { details: { concurrency: CONCURRENCY, totalMs, perReqMs: Math.round(totalMs / CONCURRENCY) } };
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Driver
// ────────────────────────────────────────────────────────────────────────────

async function main() {
  if (!JSON_OUTPUT) {
    console.log(paint(C.bold, "Supabase backend test harness"));
    log.dim(`url: ${SUPABASE_URL}`);
    log.dim(`service role: ${admin ? "available" : "missing (RLS-only mode)"}`);
    log.dim(`suite filter: ${SUITE_FILTER ?? "all"} | iterations: ${PERF_ITERATIONS} | concurrency: ${CONCURRENCY}`);
  }

  // Surface obvious RLS holes early if no service role set.
  if (!admin) {
    skipTest("rls", "service-role write probe", "SUPABASE_SERVICE_ROLE_KEY not set");
  }

  await suiteSchema();
  await suiteQueries();
  await suiteRpc();
  await suiteStorage();
  await suiteRls();
  await suiteConsistency();
  await suitePerformance();

  // ── Summary ──────────────────────────────────────────────────────────────
  const counts = { pass: 0, fail: 0, warn: 0, skip: 0 } as Record<Status, number>;
  for (const r of results) counts[r.status]++;

  if (JSON_OUTPUT) {
    console.log(JSON.stringify({ counts, results }, null, 2));
  } else {
    console.log("\n" + paint(C.bold, "Summary"));
    console.log(
      `  ${paint(C.green, `${counts.pass} pass`)}  ` +
        `${paint(C.red, `${counts.fail} fail`)}  ` +
        `${paint(C.yellow, `${counts.warn} warn`)}  ` +
        `${paint(C.dim, `${counts.skip} skip`)}`
    );
    if (counts.fail > 0) {
      console.log("\n" + paint(C.red, "Failures:"));
      for (const r of results.filter((x) => x.status === "fail")) {
        console.log(`  ${paint(C.red, "✗")} [${r.suite}] ${r.name} — ${r.message}`);
      }
    }
    if (counts.warn > 0) {
      console.log("\n" + paint(C.yellow, "Warnings:"));
      for (const r of results.filter((x) => x.status === "warn")) {
        console.log(`  ${paint(C.yellow, "!")} [${r.suite}] ${r.name} — ${r.message}`);
      }
    }
  }

  process.exit(counts.fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(paint(C.red, "fatal: ") + (err instanceof Error ? err.stack : String(err)));
  process.exit(2);
});

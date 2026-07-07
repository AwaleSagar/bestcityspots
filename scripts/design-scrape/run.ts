/**
 * Design System Scraper — orchestrates Firecrawl branding scrapes across
 * all travel competitor sources.
 *
 * Usage:
 *   npx tsx scripts/design-scrape/run.ts                 # scrape all (5 parallel)
 *   npx tsx scripts/design-scrape/run.ts --segment magazine
 *   npx tsx scripts/design-scrape/run.ts --limit 10      # first 10 only
 *   npx tsx scripts/design-scrape/run.ts --force         # re-scrape existing
 *   npx tsx scripts/design-scrape/run.ts --dry-run       # show plan, no fetch
 *
 * Output: .firecrawl/design/sites/<slug>.json  (branding + markdown + metadata)
 * Failures logged to: .firecrawl/design/failed.txt
 *
 * Idempotent: skips slugs whose output file already exists unless --force.
 */

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, appendFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { SOURCES, SOURCES_BY_SEGMENT, SEGMENTS, type Segment } from "./sources";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const OUT_DIR = resolve(".firecrawl/design/sites");
const FAILED_LOG = resolve(".firecrawl/design/failed.txt");
const CONCURRENCY = 5; // firecrawl plan cap
const SCRAPE_TIMEOUT_MS = 90_000; // 90s per site
const WAIT_FOR_MS = 3000; // SPA render wait

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const segIdx = args.indexOf("--segment");
const segmentFilter = segIdx !== -1 ? (args[segIdx + 1] as Segment | undefined) : undefined;
const limitIdx = args.indexOf("--limit");
const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : Infinity;

if (segmentFilter && !SEGMENTS.includes(segmentFilter)) {
  console.error(`Unknown segment: ${segmentFilter}. Valid: ${SEGMENTS.join(", ")}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Pool
// ---------------------------------------------------------------------------

let targets = SOURCES;
if (segmentFilter) targets = SOURCES_BY_SEGMENT[segmentFilter] ?? [];
if (Number.isFinite(limit)) targets = targets.slice(0, limit);

if (dryRun) {
  console.log(`DRY RUN — ${targets.length} sites would be scraped (concurrency ${CONCURRENCY})`);
  for (const t of targets) console.log(`  [${t.segment.padEnd(14)}] ${t.slug.padEnd(20)} ${t.url}`);
  process.exit(0);
}

mkdirSync(OUT_DIR, { recursive: true });

interface JobResult {
  slug: string;
  url: string;
  ok: boolean;
  bytes?: number;
  error?: string;
  durationMs: number;
}

function scrapeOne(slug: string, url: string): Promise<JobResult> {
  const outPath = resolve(OUT_DIR, `${slug}.json`);
  const start = Date.now();

  return new Promise((resolveP) => {
    const child = spawn(
      "firecrawl",
      [
        "scrape",
        url,
        "--format",
        "markdown,branding",
        "--wait-for",
        String(WAIT_FOR_MS),
        "-o",
        outPath,
      ],
      { stdio: ["ignore", "pipe", "pipe"] }
    );

    let stderr = "";
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolveP({
        slug,
        url,
        ok: false,
        error: `timeout after ${SCRAPE_TIMEOUT_MS}ms`,
        durationMs: Date.now() - start,
      });
    }, SCRAPE_TIMEOUT_MS);

    child.on("close", (code) => {
      clearTimeout(timer);
      const durationMs = Date.now() - start;
      if (code === 0 && existsSync(outPath)) {
        let bytes = 0;
        try {
          bytes = statSync(outPath).size;
        } catch {
          /* ignore */
        }
        resolveP({ slug, url, ok: true, bytes, durationMs });
      } else {
        const err = (stderr || `exit ${code}`).slice(0, 240);
        resolveP({ slug, url, ok: false, error: err, durationMs });
      }
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      resolveP({
        slug,
        url,
        ok: false,
        error: err.message,
        durationMs: Date.now() - start,
      });
    });
  });
}

async function runPool(jobs: Array<{ slug: string; url: string }>): Promise<JobResult[]> {
  const results: JobResult[] = [];
  const queue = [...jobs];
  let inFlight = 0;
  let completed = 0;
  const total = jobs.length;

  return new Promise((resolveAll) => {
    const launch = () => {
      while (inFlight < CONCURRENCY && queue.length > 0) {
        const job = queue.shift()!;
        inFlight++;
        scrapeOne(job.slug, job.url).then((r) => {
          results.push(r);
          inFlight--;
          completed++;
          const pct = ((completed / total) * 100).toFixed(0);
          const status = r.ok
            ? `OK  ${(r.bytes ?? 0).toString().padStart(7)}B`
            : `FAIL: ${r.error}`;
          console.log(
            `[${completed.toString().padStart(3)}/${total}] ${pct.padStart(3)}%  ${r.slug.padEnd(20)} ${status}`
          );
          if (!r.ok) {
            appendFileSync(FAILED_LOG, `${r.slug}\t${r.url}\t${r.error}\n`);
          }
          launch();
          if (completed === total) resolveAll(results);
        });
      }
    };
    launch();
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const todo: Array<{ slug: string; url: string }> = [];
  let skipped = 0;
  for (const t of targets) {
    const outPath = resolve(OUT_DIR, `${t.slug}.json`);
    if (!force && existsSync(outPath)) {
      skipped++;
      continue;
    }
    todo.push({ slug: t.slug, url: t.url });
  }

  console.log(
    `Design scrape: ${todo.length} to do, ${skipped} skipped, concurrency ${CONCURRENCY}`
  );
  if (todo.length === 0) {
    console.log("Nothing to do. Use --force to re-scrape.");
    return;
  }

  const start = Date.now();
  const results = await runPool(todo);
  const ok = results.filter((r) => r.ok).length;
  const fail = results.length - ok;
  const elapsed = ((Date.now() - start) / 1000).toFixed(0);

  console.log(`\nDone in ${elapsed}s — ${ok} ok, ${fail} failed, ${skipped} previously cached.`);
  if (fail > 0) console.log(`Failures logged to ${FAILED_LOG}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

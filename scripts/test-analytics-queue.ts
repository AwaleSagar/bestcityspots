#!/usr/bin/env npx tsx
/**
 * Client analytics batching (src/lib/analytics-queue.ts).
 * Run: npm run test:analytics-queue  (exit code non-zero on failure)
 */
import assert from "node:assert/strict";
import {
  AnalyticsQueue,
  MAX_EVENTS_PER_REQUEST,
  type AnalyticsEnvironment,
} from "../src/lib/analytics-queue";

interface Harness {
  queue: AnalyticsQueue;
  sent: Array<{ events: Array<{ type: string; action?: string; isNewVisitor?: boolean }> }>;
  beacons: string[];
  release: () => void;
}

function harness(overrides: Partial<AnalyticsEnvironment> = {}, holdSends = false): Harness {
  const sent: Harness["sent"] = [];
  const beacons: string[] = [];
  let release = () => {};
  let held = 0;
  const env: AnalyticsEnvironment = {
    isEnabled: () => true,
    getSession: () => ({ id: "s1", isNew: true }),
    claimNewVisitor: () => true,
    referrerOrigin: () => "https://example.com",
    now: () => 1_000_000,
    send: async (body) => {
      sent.push(JSON.parse(body));
      // Hold only the first request so the test can flush while it is in flight.
      if (holdSends && held++ === 0) await new Promise<void>((resolve) => (release = resolve));
    },
    beacon: (body) => {
      beacons.push(body);
      return true;
    },
    ...overrides,
  };
  return { queue: new AnalyticsQueue(env), sent, beacons, release: () => release() };
}

async function main() {
  // 1. Events recorded before any provider effect ran are kept (lazy init),
  //    and only the first pageview is flagged as a new visitor.
  {
    const h = harness();
    h.queue.pageview("/", false);
    h.queue.action("view_city", 7);
    h.queue.pageview("/cities", false);
    await h.queue.flush();
    const events = h.sent[0]?.events ?? [];
    assert.equal(events.length, 3);
    assert.equal(events[0]?.isNewVisitor, true);
    assert.equal(events[2]?.isNewVisitor, false);
  }

  // 2. Batches respect the server's 50-event limit.
  {
    const h = harness();
    for (let i = 0; i < MAX_EVENTS_PER_REQUEST * 2 + 5; i++) h.queue.action("search");
    await h.queue.flush();
    assert.deepEqual(
      h.sent.map((batch) => batch.events.length),
      [MAX_EVENTS_PER_REQUEST, MAX_EVENTS_PER_REQUEST, 5]
    );
  }

  // 3. A flush while a request is in flight keeps later events queued.
  {
    const h = harness({}, true);
    h.queue.action("search");
    const first = h.queue.flush();
    h.queue.action("share");
    await h.queue.flush(); // no-op: still sending
    assert.equal(h.queue.size, 1, "event recorded mid-flight is retained");
    h.release();
    await first;
    await h.queue.flush();
    assert.equal(h.sent.length, 2);
    assert.equal(h.sent[1]?.events[0]?.action, "share");
  }

  // 4. Disabled (DNT / dev): nothing is queued or sent.
  {
    const h = harness({ isEnabled: () => false });
    h.queue.pageview("/", true);
    h.queue.endSession(true);
    await h.queue.flush();
    assert.equal(h.queue.size, 0);
    assert.equal(h.sent.length + h.beacons.length, 0);
  }

  // 5. session_end is beaconed once per page lifetime, again after bfcache resume.
  {
    const h = harness();
    h.queue.pageview("/", true);
    h.queue.endSession(true);
    h.queue.endSession(true);
    assert.equal(h.beacons.length, 1);
    const payload = JSON.parse(h.beacons[0] ?? "{}") as { events: Array<{ type: string }> };
    assert.deepEqual(
      payload.events.map((event) => event.type),
      ["pageview", "session_end"]
    );
    h.queue.resumeSession();
    h.queue.endSession(false);
    assert.equal(h.beacons.length, 2);
  }

  // 6. Without sendBeacon the unload batch falls back to fetch.
  {
    const h = harness({ beacon: () => false });
    h.queue.action("search");
    h.queue.endSession(false);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(h.sent.length, 1);
  }

  console.log("✓ analytics-queue: all 6 assertion groups passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

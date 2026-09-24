#!/usr/bin/env npx tsx
/**
 * AI briefing stream client protocol (src/lib/briefing-stream.ts).
 * Run: npm run test:briefing-stream  (exit code non-zero on failure)
 */
import assert from "node:assert/strict";
import {
  coerceToInsight,
  drainSseBuffer,
  hasInsightContent,
  insightFromStreamText,
  mergeSeasons,
} from "../src/lib/briefing-stream";

const insight = {
  intro: "A river city.",
  attractions: [{ name: "Old Town", why: "Lanes." }],
  seasons: [{ name: "Spring", months: "Mar–May", summary: "Mild." }],
  weather: [{ season: "spring", tempC: "14–22°C", notes: "Showers." }],
};

// 1. Complete events parse; a trailing partial block is kept as `rest`.
{
  const buffer =
    `data: ${JSON.stringify({ type: "stale", insight })}\n\n` +
    `data: ${JSON.stringify({ type: "chunk", text: '{"intro":"A' })}\n\n` +
    `data: {"type":"comp`;
  const { events, rest } = drainSseBuffer(buffer);
  assert.equal(events.length, 2);
  assert.equal(events[0]?.type, "stale");
  assert.equal(events[1]?.type, "chunk");
  assert.equal(rest, 'data: {"type":"comp');
  const next = drainSseBuffer(`${rest}lete","insight":${JSON.stringify(insight)}}\n\n`);
  assert.equal(next.events[0]?.type, "complete");
  assert.equal(next.rest, "");
}

// 2. Malformed JSON, blocks without data:, and unknown types are skipped.
{
  const { events } = drainSseBuffer(
    `: comment\n\n` +
      `data: not-json\n\n` +
      `data: {"type":"mystery"}\n\n` +
      `event: x\ndata: {"type":"error","reason":"rate_limit"}\n\n`
  );
  assert.deepEqual(events, [{ type: "error", reason: "rate_limit" }]);
}

// 3. Partial model text → renderable insight with server-schema caps.
{
  const partial = insightFromStreamText(
    '```json\n{"intro":"' + "x".repeat(700) + '","attractions":[{"name":"Tower","why":"Vi'
  );
  assert.ok(partial);
  assert.equal(partial.intro.length, 600);
  assert.deepEqual(partial.attractions, [{ name: "Tower", why: "Vi" }]);
  assert.equal(insightFromStreamText('{"intro":'), null, "nothing renderable yet");
}

// 4. Items without a name are dropped; non-objects never throw.
{
  const coerced = coerceToInsight({
    attractions: [{ why: "no name" }, null, "x", { name: "Keep" }],
    seasons: [{ name: "" }, { name: "Winter", months: 5 }],
  });
  assert.deepEqual(coerced.attractions, [{ name: "Keep", why: "" }]);
  assert.deepEqual(coerced.seasons, [{ name: "Winter", months: "", summary: "" }]);
  assert.deepEqual(coerceToInsight(null), { intro: "", attractions: [], seasons: [], weather: [] });
  assert.equal(hasInsightContent(coerceToInsight(undefined)), false);
}

// 5. Weather notes join onto seasons case-insensitively.
{
  const merged = mergeSeasons(insight);
  assert.deepEqual(merged, [
    { name: "Spring", months: "Mar–May", summary: "Mild.", tempC: "14–22°C", notes: "Showers." },
  ]);
  assert.equal(mergeSeasons({ ...insight, weather: [] })[0]?.tempC, null);
}

console.log("✓ briefing-stream: all 5 assertion groups passed");

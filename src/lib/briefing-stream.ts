import type { CityInsight } from "./intelligence";
import { parsePartialJson } from "./partialJson";

/**
 * Client-side protocol helpers for GET /api/cities/insight (SSE-framed).
 * The route emits `data: <json>\n\n` blocks with this union (see
 * src/app/api/cities/insight/route.ts). Pure — unit-tested by
 * scripts/test-briefing-stream.ts.
 */

export type BriefingStreamEvent =
  | { type: "stale"; insight: CityInsight }
  | { type: "chunk"; text: string }
  | { type: "complete"; insight: CityInsight }
  | { type: "error"; reason: string };

/**
 * Split a growing SSE buffer into complete events. Returns parsed events and
 * the unconsumed remainder (a partial block still waiting for `\n\n`).
 * Blocks without a `data:` line or with invalid JSON are skipped.
 */
export function drainSseBuffer(buffer: string): { events: BriefingStreamEvent[]; rest: string } {
  const events: BriefingStreamEvent[] = [];
  let rest = buffer;
  let separator = rest.indexOf("\n\n");
  while (separator !== -1) {
    const block = rest.slice(0, separator);
    rest = rest.slice(separator + 2);
    separator = rest.indexOf("\n\n");
    const dataLine = block.split("\n").find((line) => line.startsWith("data:"));
    if (!dataLine) continue;
    try {
      const parsed: unknown = JSON.parse(dataLine.slice(5).trim());
      if (isStreamEvent(parsed)) events.push(parsed);
    } catch {
      // Malformed block — ignore and keep reading.
    }
  }
  return { events, rest };
}

function isStreamEvent(value: unknown): value is BriefingStreamEvent {
  if (!value || typeof value !== "object") return false;
  const type = (value as { type?: unknown }).type;
  return type === "stale" || type === "chunk" || type === "complete" || type === "error";
}

type PartialInsight = {
  intro?: unknown;
  attractions?: unknown;
  seasons?: unknown;
  weather?: unknown;
};

function pickString(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.length > max ? value.slice(0, max) : value;
}

function pickArray<T>(value: unknown, mapper: (item: Record<string, unknown>) => T | null): T[] {
  if (!Array.isArray(value)) return [];
  const out: T[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const mapped = mapper(item as Record<string, unknown>);
    if (mapped !== null) out.push(mapped);
  }
  return out;
}

/**
 * Coerce an in-flight partial JSON value into the CityInsight shape with the
 * same caps the server schema enforces. Items without a name are dropped so
 * a half-typed entry never renders as an empty card.
 */
export function coerceToInsight(partial: unknown): CityInsight {
  const source = (partial && typeof partial === "object" ? partial : {}) as PartialInsight;
  return {
    intro: pickString(source.intro, 600),
    attractions: pickArray(source.attractions, (item) => {
      const name = pickString(item.name, 120);
      return name ? { name, why: pickString(item.why, 240) } : null;
    }),
    seasons: pickArray(source.seasons, (item) => {
      const name = pickString(item.name, 60);
      return name
        ? { name, months: pickString(item.months, 60), summary: pickString(item.summary, 320) }
        : null;
    }),
    weather: pickArray(source.weather, (item) => {
      const season = pickString(item.season, 60);
      return season
        ? { season, tempC: pickString(item.tempC, 60), notes: pickString(item.notes, 240) }
        : null;
    }),
  };
}

/** Parse the accumulated model text into a renderable insight (or null). */
export function insightFromStreamText(text: string): CityInsight | null {
  const insight = coerceToInsight(parsePartialJson(text));
  return hasInsightContent(insight) ? insight : null;
}

export function hasInsightContent(insight: CityInsight | null | undefined): boolean {
  return Boolean(
    insight &&
    (insight.intro.length > 0 || insight.attractions.length > 0 || insight.seasons.length > 0)
  );
}

export interface MergedSeason {
  name: string;
  months: string;
  summary: string;
  tempC: string | null;
  notes: string | null;
}

/** Join `weather[]` onto `seasons[]` by case-insensitive season name. */
export function mergeSeasons(insight: CityInsight): MergedSeason[] {
  const weatherByName = new Map(
    insight.weather.map((entry) => [entry.season.trim().toLowerCase(), entry])
  );
  return insight.seasons.map((season) => {
    const weather = weatherByName.get(season.name.trim().toLowerCase());
    return {
      name: season.name,
      months: season.months,
      summary: season.summary,
      tempC: weather?.tempC?.trim() || null,
      notes: weather?.notes?.trim() || null,
    };
  });
}

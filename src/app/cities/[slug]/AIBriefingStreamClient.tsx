"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { CityInsight } from "@/lib/intelligence";
import { parsePartialJson } from "@/lib/partialJson";
import AIBriefingClient from "./AIBriefingClient";
import AIBriefingSkeleton from "./AIBriefingSkeleton";

interface AIBriefingStreamClientProps {
  cityId: number;
  /** Stale cached insight rendered while a fresh stream is in flight. */
  initialInsight?: CityInsight | null;
}

type PartialInsight = {
  intro?: string;
  attractions?: Array<{ name?: string; why?: string }>;
  seasons?: Array<{ name?: string; months?: string; summary?: string }>;
  weather?: Array<{ season?: string; tempC?: string; notes?: string }>;
};

function pickString(value: unknown, max = 600): string {
  if (typeof value !== "string") return "";
  return value.length > max ? value.slice(0, max) : value;
}

function pickArray<T>(value: unknown, mapper: (v: unknown) => T | null): T[] {
  if (!Array.isArray(value)) return [];
  const out: T[] = [];
  for (const item of value) {
    const mapped = mapper(item);
    if (mapped !== null) out.push(mapped);
  }
  return out;
}

/**
 * Coerce an in-flight partial JSON value into the CityInsight shape, filling
 * missing fields with safe defaults. Items with no usable name are dropped so
 * we never render an empty "Top Spots" card.
 */
function coerceToInsight(partial: PartialInsight | null): CityInsight {
  return {
    intro: pickString(partial?.intro, 600),
    attractions: pickArray(partial?.attractions, (item) => {
      if (!item || typeof item !== "object") return null;
      const obj = item as Record<string, unknown>;
      const name = pickString(obj.name, 120);
      if (!name) return null;
      return { name, why: pickString(obj.why, 240) };
    }),
    seasons: pickArray(partial?.seasons, (item) => {
      if (!item || typeof item !== "object") return null;
      const obj = item as Record<string, unknown>;
      const name = pickString(obj.name, 60);
      if (!name) return null;
      return {
        name,
        months: pickString(obj.months, 60),
        summary: pickString(obj.summary, 320),
      };
    }),
    weather: pickArray(partial?.weather, (item) => {
      if (!item || typeof item !== "object") return null;
      const obj = item as Record<string, unknown>;
      const season = pickString(obj.season, 60);
      if (!season) return null;
      return {
        season,
        tempC: pickString(obj.tempC, 60),
        notes: pickString(obj.notes, 240),
      };
    }),
  };
}

type StreamEvent =
  | { type: "stale"; insight: CityInsight }
  | { type: "chunk"; text: string }
  | { type: "complete"; insight: CityInsight }
  | { type: "error"; reason: string };

function useInsightStream(cityId: number, initialInsight: CityInsight | null) {
  const [insight, setInsight] = useState<CityInsight | null>(initialInsight);
  const [streaming, setStreaming] = useState(true);
  const [errored, setErrored] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/cities/insight?cityId=${cityId}`, {
          signal: controller.signal,
          headers: { Accept: "text/event-stream" },
        });
        if (!res.ok || !res.body) {
          if (!cancelled) {
            setErrored(true);
            setStreaming(false);
          }
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let streamedText = "";

        while (!cancelled) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE events delimited by `\n\n`.
          let sepIdx;
          while ((sepIdx = buffer.indexOf("\n\n")) !== -1) {
            const rawEvent = buffer.slice(0, sepIdx);
            buffer = buffer.slice(sepIdx + 2);
            const dataLine = rawEvent
              .split("\n")
              .find((line) => line.startsWith("data:"));
            if (!dataLine) continue;
            const json = dataLine.slice(5).trim();
            let evt: StreamEvent;
            try {
              evt = JSON.parse(json) as StreamEvent;
            } catch {
              continue;
            }

            if (evt.type === "stale") {
              setInsight(evt.insight);
            } else if (evt.type === "chunk") {
              streamedText += evt.text;
              const partial = parsePartialJson<PartialInsight>(streamedText);
              const coerced = coerceToInsight(partial);
              // Only commit a chunk update when it actually adds content,
              // otherwise we risk flickering an empty render in front of a
              // valid stale insight.
              const hasContent =
                coerced.intro.length > 0 ||
                coerced.attractions.length > 0 ||
                coerced.seasons.length > 0;
              if (hasContent) setInsight(coerced);
            } else if (evt.type === "complete") {
              setInsight(evt.insight);
              setStreaming(false);
            } else if (evt.type === "error") {
              setErrored(true);
              setStreaming(false);
            }
          }
        }

        if (!cancelled) setStreaming(false);
      } catch (err) {
        if (cancelled) return;
        if ((err as Error).name === "AbortError") return;
        setErrored(true);
        setStreaming(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [cityId]);

  return { insight, streaming, errored };
}

/**
 * Lightweight progressive header overlay. Keeps the existing AIBriefingClient
 * untouched while still surfacing a "live" status while tokens are arriving.
 */
function StreamingHeaderBadge() {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.span
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1 }}
      className="text-accent/80 inline-flex items-center gap-1.5 text-[11px] font-black tracking-[0.2em] uppercase"
    >
      <span className="bg-accent h-1.5 w-1.5 animate-pulse rounded-full" aria-hidden />
      Live
    </motion.span>
  );
}

export default function AIBriefingStreamClient({
  cityId,
  initialInsight = null,
}: AIBriefingStreamClientProps) {
  const { insight, streaming, errored } = useInsightStream(cityId, initialInsight);

  // No initial cache + still streaming first useful chunk → show skeleton.
  if (!insight && streaming) {
    return <AIBriefingSkeleton />;
  }

  if (!insight && errored) {
    return (
      <section className="atlas-panel rounded-[1.4rem] p-6 sm:rounded-[1.7rem] md:rounded-[2rem]">
        <h2 className="labelled-rule">
          <Sparkles className="text-accent h-4 w-4" />
          AI City Briefing
        </h2>
        <p className="text-muted-strong mt-3 text-sm font-semibold tracking-wide">
          AI briefing is unavailable for this city right now.
        </p>
      </section>
    );
  }

  if (!insight) return <AIBriefingSkeleton />;

  return (
    <div>
      {streaming ? (
        <div className="mb-2 flex justify-end">
          <StreamingHeaderBadge />
        </div>
      ) : null}
      <AIBriefingClient insight={insight} />
    </div>
  );
}

// (no extras)

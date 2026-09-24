"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { CityInsight } from "@/lib/intelligence";
import { drainSseBuffer, hasInsightContent, insightFromStreamText } from "@/lib/briefing-stream";

export type InsightStatus = "ready" | "streaming" | "error";

interface InsightState {
  insight: CityInsight | null;
  status: InsightStatus;
  generatedAt: string | null;
}

const InsightContext = createContext<InsightState>({
  insight: null,
  status: "error",
  generatedAt: null,
});

export function useInsight() {
  return useContext(InsightContext);
}

interface InsightProviderProps {
  cityId: number;
  initialInsight: CityInsight | null;
  /** Fresh, version-matched cache hit: render as-is, never stream. */
  fresh: boolean;
  generatedAt: string | null;
  children: ReactNode;
}

/**
 * One briefing per page, shared by the Overview and When-to-go sections.
 * Fresh cache → server-rendered and static. Otherwise it streams from
 * /api/cities/insight, showing the stale copy (if any) until fresher text
 * arrives, and falls back quietly when AI is unavailable.
 */
export function InsightProvider({
  cityId,
  initialInsight,
  fresh,
  generatedAt,
  children,
}: InsightProviderProps) {
  const [state, setState] = useState<InsightState>({
    insight: initialInsight,
    status: fresh && initialInsight ? "ready" : "streaming",
    generatedAt: fresh ? generatedAt : null,
  });

  useEffect(() => {
    if (fresh && initialInsight) return;
    const controller = new AbortController();

    const finish = (status: InsightStatus, insight?: CityInsight | null) =>
      setState((previous) => ({
        insight: insight ?? previous.insight,
        status: status === "error" && hasInsightContent(previous.insight) ? "ready" : status,
        generatedAt: insight ? new Date().toISOString() : previous.generatedAt,
      }));

    (async () => {
      try {
        const response = await fetch(`/api/cities/insight?cityId=${cityId}`, {
          signal: controller.signal,
          headers: { Accept: "text/event-stream" },
        });
        if (!response.ok || !response.body) {
          finish("error");
          return;
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let text = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          const drained = drainSseBuffer(buffer + decoder.decode(value, { stream: true }));
          buffer = drained.rest;
          for (const event of drained.events) {
            if (event.type === "stale") {
              setState((previous) => ({ ...previous, insight: event.insight }));
            } else if (event.type === "chunk") {
              text += event.text;
              const partial = insightFromStreamText(text);
              // Only replace what's on screen when the stream adds content,
              // so a stale briefing never flickers to empty.
              if (partial) setState((previous) => ({ ...previous, insight: partial }));
            } else if (event.type === "complete") {
              finish("ready", event.insight);
            } else {
              finish("error");
            }
          }
        }
        setState((previous) =>
          previous.status === "streaming"
            ? { ...previous, status: hasInsightContent(previous.insight) ? "ready" : "error" }
            : previous
        );
      } catch (error) {
        if ((error as Error).name !== "AbortError") finish("error");
      }
    })();

    return () => controller.abort();
  }, [cityId, fresh, initialInsight]);

  return <InsightContext.Provider value={state}>{children}</InsightContext.Provider>;
}

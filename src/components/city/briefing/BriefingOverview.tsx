"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Notice } from "@/components/ui/Notice";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";
import { useInsight } from "./InsightProvider";

function LiveStatus({ streaming }: { streaming: boolean }) {
  return (
    <p role="status" className="text-ink-muted flex items-center gap-2 text-xs font-medium">
      {streaming ? (
        <>
          <span aria-hidden className="animate-live bg-highlight size-2 rounded-full" />
          Writing the latest briefing…
        </>
      ) : null}
    </p>
  );
}

export function BriefingSkeleton() {
  return (
    <LoadingRegion label="Loading the city briefing" className="space-y-3">
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-6 w-11/12" />
      <Skeleton className="h-6 w-3/4" />
      <div className="space-y-3 pt-6">
        {[0, 1, 2].map((row) => (
          <Skeleton key={row} className="h-12 w-full" />
        ))}
      </div>
    </LoadingRegion>
  );
}

/** Overview: serif intro + "Worth your time" highlights, labelled as AI. */
export function BriefingOverview({ cityName }: { cityName: string }) {
  const { insight, status, generatedAt } = useInsight();
  const streaming = status === "streaming";

  if (!insight) {
    if (streaming) return <BriefingSkeleton />;
    return (
      <Notice title="The written overview isn't available right now.">
        Live conditions, seasons and places for {cityName} below are unaffected.
      </Notice>
    );
  }

  return (
    <div aria-busy={streaming}>
      <LiveStatus streaming={streaming} />
      {insight.intro ? (
        <p className="font-display text-lede mt-2 max-w-prose">{insight.intro}</p>
      ) : null}

      {insight.attractions.length > 0 ? (
        <div className="mt-10">
          <h3 className="text-h3">Worth your time</h3>
          <ol className="border-rule mt-3 border-t">
            {insight.attractions.map((attraction, index) => (
              <li
                key={`${attraction.name}-${index}`}
                className="border-rule grid grid-cols-[2rem_minmax(0,1fr)] gap-3 border-b py-4"
              >
                <span className="font-display text-ink-subtle text-xl leading-6 tabular-nums">
                  {index + 1}
                </span>
                <div>
                  <p className="font-medium">{attraction.name}</p>
                  {attraction.why ? (
                    <p className="text-ink-muted mt-1 text-sm">{attraction.why}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <p className="text-ink-muted mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <Sparkles aria-hidden className="text-accent size-3.5" />
        <span>AI-written briefing (Google Gemini)</span>
        {generatedAt ? (
          <>
            <span aria-hidden>·</span>
            <RelativeTime iso={generatedAt} prefix="Generated" />
          </>
        ) : null}
        <span aria-hidden>·</span>
        <Link href="/methodology#ai" className="text-accent underline underline-offset-2">
          How we use AI
        </Link>
      </p>
    </div>
  );
}

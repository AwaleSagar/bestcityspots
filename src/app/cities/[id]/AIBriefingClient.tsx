"use client";

import { useState } from "react";
import {
  Sparkles,
  MapPin,
  CalendarRange,
  ThermometerSun,
  Compass,
  Eye,
} from "lucide-react";
import type { CityInsight } from "@/lib/intelligence";
import {
  Card,
  Caption,
  Heading,
  Text,
  Mono,
  Badge,
  Stack,
  Row,
  Grid,
  cx,
} from "@/components/atlas";

interface AIBriefingClientProps {
  insight: CityInsight;
}

type Tab = "overview" | "attractions" | "seasons";

export default function AIBriefingClient({ insight }: AIBriefingClientProps) {
  const [tab, setTab] = useState<Tab>("overview");

  const mergedSeasons = insight.seasons.map((season) => {
    const weatherMatch = insight.weather.find(
      (w) => w.season.toLowerCase() === season.name.toLowerCase(),
    );
    return {
      ...season,
      tempC: weatherMatch?.tempC || "—",
      weatherNotes: weatherMatch?.notes || "",
    };
  });

  const tabs = [
    { id: "overview" as Tab, label: "Overview", icon: Eye, count: 1 },
    {
      id: "attractions" as Tab,
      label: "Top spots",
      icon: Compass,
      count: insight.attractions.length,
    },
    {
      id: "seasons" as Tab,
      label: "When to visit",
      icon: CalendarRange,
      count: mergedSeasons.length,
    },
  ];

  return (
    <section aria-labelledby="ai-briefing-heading">
      <Stack gap={4}>
        <Row gap={2}>
          <Caption>
            <Sparkles
              className="h-3.5 w-3.5 text-[color:var(--color-accent)]"
              aria-hidden
            />
            AI briefing
          </Caption>
        </Row>
        <Heading level={2} id="ai-briefing-heading">
          A quick read on the city
        </Heading>
        <Text tone="muted" size="sm" className="max-w-xl">
          Attractions, seasons, and weather at a glance — generated and
          verified against public data.
        </Text>

        {/* Tabs */}
        <div role="tablist" className="flex flex-wrap gap-1 pt-2" aria-label="AI briefing sections">
          {tabs.map(({ id, label, icon: Icon, count }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                id={`ai-tab-${id}`}
                aria-selected={active}
                aria-controls={`ai-panel-${id}`}
                onClick={() => setTab(id)}
                className={cx(
                  "inline-flex min-h-[var(--touch-target-min)] items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "border-[color:var(--color-foreground)] bg-[color:var(--color-foreground)] text-[color:var(--color-background)]"
                    : "border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] text-[color:var(--color-foreground)] hover:border-[color:var(--color-foreground)]",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                <span>{label}</span>
                {id !== "overview" && (
                  <span
                    className={cx(
                      "rounded-full px-1.5 text-xs font-semibold tabular-nums",
                      active
                        ? "bg-[color:var(--color-background)]/20 text-[color:var(--color-background)]"
                        : "bg-[color:var(--color-surface-muted)] text-[color:var(--color-muted)]",
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Panels */}
        {tab === "overview" && (
          <div
            role="tabpanel"
            id="ai-panel-overview"
            aria-labelledby="ai-tab-overview"
          >
            <Card variant="outline" className="p-6 md:p-8">
              <Text size="lg" className="leading-[1.7] text-[color:var(--color-foreground)]">
                {insight.intro}
              </Text>
              <div className="mt-6 flex items-center gap-2 border-t border-[color:var(--color-line)] pt-4">
                <span
                  aria-hidden
                  className="inline-block h-1.5 w-1.5 rounded-full bg-[color:var(--color-accent)]"
                />
                <p className="text-[0.7rem] uppercase tracking-[0.08em] text-[color:var(--color-muted)]">
                  AI-generated via Google Gemini · verified against public data
                </p>
              </div>
            </Card>
          </div>
        )}

        {tab === "attractions" && (
          <Grid
            role="tabpanel"
            id="ai-panel-attractions"
            aria-labelledby="ai-tab-attractions"
            cols={{ base: 1, sm: 2 }}
            gap={4}
          >
            {insight.attractions.map((a, idx) => (
              <Card key={idx} variant="outline" className="p-5">
                <Row gap={3} align="start">
                  <span
                    aria-hidden
                    className="mt-0.5 inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--color-line)] bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent-strong)]"
                  >
                    <MapPin className="h-4 w-4" />
                  </span>
                  <Stack gap={2}>
                    <Heading level={3}>{a.name}</Heading>
                    <Badge tone="accent">Must visit</Badge>
                    <Text size="sm" tone="muted">
                      {a.why}
                    </Text>
                  </Stack>
                </Row>
              </Card>
            ))}
          </Grid>
        )}

        {tab === "seasons" && (
          <Grid
            role="tabpanel"
            id="ai-panel-seasons"
            aria-labelledby="ai-tab-seasons"
            cols={{ base: 1, sm: 2 }}
            gap={4}
          >
            {mergedSeasons.map((s, idx) => (
              <Card key={idx} variant="outline" className="p-5">
                <Stack gap={3}>
                  <Row justify="between" align="start" wrap gap={2}>
                    <Row gap={3} align="start">
                      <span
                        aria-hidden
                        className="mt-0.5 inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--color-line)] bg-[color:var(--color-surface-muted)] text-[color:var(--color-muted)]"
                      >
                        <CalendarRange className="h-4 w-4" />
                      </span>
                      <Stack gap={1}>
                        <Heading level={3}>{s.name}</Heading>
                        <Caption>{s.months}</Caption>
                      </Stack>
                    </Row>
                    <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface-muted)] px-2.5 py-1">
                      <ThermometerSun
                        className="h-3.5 w-3.5 text-[color:var(--color-muted)]"
                        aria-hidden
                      />
                      <Mono size="sm" className="text-[color:var(--color-foreground)]">
                        {s.tempC}
                      </Mono>
                    </span>
                  </Row>
                  <Text size="sm" tone="muted" className="leading-[1.6]">
                    {s.summary}
                  </Text>
                  {s.weatherNotes && (
                    <div className="rounded-[var(--radius-md)] border border-[color:var(--color-line)] bg-[color:var(--color-surface-muted)] p-3">
                      <Caption className="mb-1">Weather note</Caption>
                      <Text size="sm" tone="muted">
                        {s.weatherNotes}
                      </Text>
                    </div>
                  )}
                </Stack>
              </Card>
            ))}
          </Grid>
        )}
      </Stack>
    </section>
  );
}

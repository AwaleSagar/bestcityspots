import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { SpecList, type SpecRow } from "@/components/ui/SpecList";
import { getAdminContext } from "@/lib/supabase-admin";
import type { TypedSupabaseClient } from "@/lib/supabase";
import { signOut } from "./actions";

export const metadata: Metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

const WINDOW_DAYS = 30;

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

const number = (value: number) => value.toLocaleString("en-US");

/**
 * Every query runs as the signed-in admin (role `authenticated`) and is
 * allowed only by the admin RLS policies in
 * supabase/migrations/20260925120600_admin_auth.sql.
 */
async function loadOverview(db: TypedSupabaseClient) {
  const since = isoDaysAgo(WINDOW_DAYS);
  const today = isoDaysAgo(0);

  const [visitors, views, usage, cache] = await Promise.all([
    db
      .from("daily_visitor_stats")
      .select("page_views, sessions, sessions_ended, bounced_sessions, total_session_duration_sec")
      .gte("stat_date", since),
    db
      .from("city_views_daily")
      .select("city_id, views, cities(city, country)")
      .gte("stat_date", since),
    db.from("provider_daily_usage").select("provider, used").eq("day", today).order("provider"),
    db.from("cache_hit_stats").select("hit_count, miss_count").gte("event_date", isoDaysAgo(7)),
  ]);

  const rows = visitors.data ?? [];
  const sum = (pick: (row: (typeof rows)[0]) => number) => rows.reduce((a, r) => a + pick(r), 0);
  const ended = sum((r) => r.sessions_ended);

  const cityTotals = new Map<number, { label: string; views: number }>();
  for (const row of views.data ?? []) {
    const label = row.cities ? `${row.cities.city}, ${row.cities.country}` : `City #${row.city_id}`;
    const entry = cityTotals.get(row.city_id) ?? { label, views: 0 };
    entry.views += row.views;
    cityTotals.set(row.city_id, entry);
  }

  const hits = (cache.data ?? []).reduce((a, r) => a + r.hit_count, 0);
  const misses = (cache.data ?? []).reduce((a, r) => a + r.miss_count, 0);

  return {
    failed: [visitors, views, usage, cache].some((result) => result.error),
    traffic: {
      pageViews: sum((r) => r.page_views),
      sessions: sum((r) => r.sessions),
      avgSessionSec:
        ended > 0 ? Math.round(sum((r) => r.total_session_duration_sec) / ended) : null,
      bounceRate:
        ended > 0 ? Math.round((1000 * sum((r) => r.bounced_sessions)) / ended) / 10 : null,
    },
    topCities: [...cityTotals.values()].sort((a, b) => b.views - a.views).slice(0, 10),
    providerUsage: usage.data ?? [],
    cacheHitRate: hits + misses > 0 ? Math.round((1000 * hits) / (hits + misses)) / 10 : null,
  };
}

export default async function AdminPage() {
  const context = await getAdminContext();
  if (context.status === "signed-out") redirect("/admin/login");

  if (context.status !== "admin") {
    return (
      <main id="main-content">
        <Container>
          <PageHeader title="Admin" />
          <div className="max-w-xl space-y-4 pb-16">
            <Notice tone="warning" title="No access">
              {context.status === "unconfigured"
                ? "Supabase isn't configured on this deployment."
                : `${context.email ?? "This account"} isn't an admin. Ask an existing admin to run npm run admin -- add <email>.`}
            </Notice>
            {context.status === "forbidden" ? (
              <form action={signOut}>
                <Button type="submit">Sign out</Button>
              </form>
            ) : null}
          </div>
        </Container>
      </main>
    );
  }

  const overview = await loadOverview(context.client);
  const trafficRows: SpecRow[] = [
    { key: "pv", label: "Page views", value: number(overview.traffic.pageViews) },
    { key: "sessions", label: "Sessions", value: number(overview.traffic.sessions) },
    {
      key: "duration",
      label: "Average session",
      value: overview.traffic.avgSessionSec === null ? "—" : `${overview.traffic.avgSessionSec} s`,
    },
    {
      key: "bounce",
      label: "Bounce rate",
      value: overview.traffic.bounceRate === null ? "—" : `${overview.traffic.bounceRate}%`,
      note: "Over completed sessions only",
    },
  ];

  return (
    <main id="main-content">
      <Container>
        <PageHeader
          title="Overview"
          lede={`Aggregate, privacy-first numbers for the last ${WINDOW_DAYS} days. No per-visitor data exists.`}
          actions={
            <form action={signOut}>
              <Button type="submit" size="sm">
                Sign out {context.email ?? ""}
              </Button>
            </form>
          }
        />
        <div className="space-y-14 pb-16">
          {overview.failed ? (
            <Notice tone="warning" title="Some figures failed to load">
              Check the server logs; the admin RLS policies may be missing on this database.
            </Notice>
          ) : null}

          <Section id="traffic" title="Traffic">
            <SpecList rows={trafficRows} className="max-w-xl" />
          </Section>

          <Section id="cities" title="Most-viewed cities">
            {overview.topCities.length > 0 ? (
              <SpecList
                className="max-w-xl"
                rows={overview.topCities.map((city, index) => ({
                  key: `${index}`,
                  label: `${index + 1}. ${city.label}`,
                  value: number(city.views),
                }))}
              />
            ) : (
              <p className="text-ink-muted">No city views recorded yet.</p>
            )}
          </Section>

          <Section
            id="providers"
            title="Paid provider calls today"
            description="Claims against the durable daily budget (src/lib/cost-guard.ts)."
          >
            {overview.providerUsage.length > 0 ? (
              <SpecList
                className="max-w-xl"
                rows={overview.providerUsage.map((row) => ({
                  key: row.provider,
                  label: row.provider,
                  value: number(row.used),
                }))}
              />
            ) : (
              <p className="text-ink-muted">No paid calls today.</p>
            )}
          </Section>

          <Section id="cache" title="Places cache (last 7 days)">
            <SpecList
              className="max-w-xl"
              rows={[
                {
                  key: "hit",
                  label: "Hit rate",
                  value: overview.cacheHitRate === null ? "—" : `${overview.cacheHitRate}%`,
                  note: "Sampled at 10% of requests",
                },
              ]}
            />
          </Section>
        </div>
      </Container>
    </main>
  );
}

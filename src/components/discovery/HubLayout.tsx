import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Info, ListX } from "lucide-react";
import type { CityWithMetric } from "@/lib/topical-hubs";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { CityRow } from "@/components/city/CityRow";
import { MixerLink } from "./MixerLink";

const OTHER_GUIDES = [
  { href: "/best-cities-by-air-quality", label: "Cleanest air" },
  { href: "/best-cities-for-digital-nomads", label: "For digital nomads" },
  { href: "/resources/top-cities", label: "The Top 250" },
  { href: "/guides", label: "All guides" },
];

interface HubLayoutProps {
  eyebrow: string;
  title: string;
  lede: string;
  cities: CityWithMetric[];
  /** Plain-language explanation of the ranking (auditability). */
  methodologyNote: string;
  breadcrumbLabel: string;
  currentPath: string;
  /** Extra navigation under the header (e.g. the month switcher). */
  subnav?: ReactNode;
}

/** Shared layout for the ranked topical guides (SEO Phase 2.3 hubs). */
export function HubLayout({
  eyebrow,
  title,
  lede,
  cities,
  methodologyNote,
  breadcrumbLabel,
  currentPath,
  subnav,
}: HubLayoutProps) {
  return (
    <main id="main-content">
      <Container>
        <PageHeader
          breadcrumbs={[{ label: "Guides", href: "/guides" }, { label: breadcrumbLabel }]}
          eyebrow={eyebrow}
          title={title}
          lede={lede}
        >
          {subnav}
        </PageHeader>

        <div className="grid gap-12 py-12 pb-20 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-16">
          <div className="min-w-0">
            {cities.length > 0 ? (
              <ol className="border-rule border-t">
                {cities.map((city, index) => (
                  <CityRow
                    key={city.id}
                    city={city}
                    rank={index + 1}
                    meta={
                      <span className="text-ink-muted hidden text-right tabular-nums sm:inline">
                        {city.metricLabel}
                      </span>
                    }
                    detail={
                      <>
                        <span>{[city.admin_name, city.country].filter(Boolean).join(", ")}</span>
                        <span className="sm:hidden"> · {city.metricLabel}</span>
                      </>
                    }
                  />
                ))}
              </ol>
            ) : (
              <EmptyState icon={<ListX aria-hidden />} title="This ranking is being refreshed">
                Metrics for this guide are collected as city guides are viewed. Check back soon, or
                browse the full city index.
              </EmptyState>
            )}
          </div>

          <aside className="space-y-8 lg:sticky lg:top-24 lg:self-start">
            <section
              aria-labelledby="how-ranked"
              className="border-rule bg-surface rounded-md border p-4"
            >
              <h2
                id="how-ranked"
                className="flex items-center gap-2 font-sans text-base font-semibold"
              >
                <Info aria-hidden className="text-accent size-4" />
                How this ranks
              </h2>
              <p className="text-ink-muted mt-2 text-sm">{methodologyNote}</p>
              <Link
                href="/methodology"
                className="text-accent mt-3 inline-block text-sm underline underline-offset-2"
              >
                Methodology and sources
              </Link>
            </section>
            <MixerLink />
            <nav aria-labelledby="other-guides">
              <h2 id="other-guides" className="font-sans text-base font-semibold">
                Other guides
              </h2>
              <ul className="border-rule mt-2 border-t">
                {OTHER_GUIDES.filter((guide) => guide.href !== currentPath).map((guide) => (
                  <li key={guide.href}>
                    <Link
                      href={guide.href}
                      className="border-rule hover:text-accent flex min-h-11 items-center justify-between border-b text-sm"
                    >
                      {guide.label}
                      <ArrowRight aria-hidden className="text-ink-subtle size-4" />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        </div>
      </Container>
    </main>
  );
}

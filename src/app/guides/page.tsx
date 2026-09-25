import type { Metadata } from "next";
import Link from "next/link";
import type { ComponentType } from "react";
import { ArrowRight, Globe2, Laptop, ListOrdered, Scale, Wind } from "lucide-react";
import { getSiteUrl } from "@/lib/site";
import { listMonthSlugs, monthLabel } from "@/lib/topical-hubs";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { cn } from "@/components/ui/cn";
import { JsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "Travel Guides & City Rankings: Where to Go, and When",
  description:
    "Every Best City Spots guide in one place: cities ranked by air quality, remote-work suitability and population, plus the best cities to visit in each month.",
  alternates: { canonical: "/guides" },
  openGraph: {
    title: "Travel Guides & City Rankings | Best City Spots",
    description: "City rankings by air quality, remote work, population and month of travel.",
    url: "/guides",
    type: "website",
  },
};

export const revalidate = 86400;

interface GuideLink {
  href: string;
  title: string;
  body: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}

const RANKINGS: GuideLink[] = [
  {
    href: "/resources/top-cities",
    title: "The Top 250",
    body: "The largest cities with full guides — re-rank them by budget, air quality and safety.",
    icon: ListOrdered,
  },
  {
    href: "/best-cities-by-air-quality",
    title: "Cleanest air",
    body: "Ranked by the latest PM2.5 readings.",
    icon: Wind,
  },
  {
    href: "/best-cities-for-digital-nomads",
    title: "For digital nomads",
    body: "Connection speed, climate and a safety signal in one score.",
    icon: Laptop,
  },
  {
    href: "/compare",
    title: "Compare cities",
    body: "Up to three cities side by side.",
    icon: Scale,
  },
  {
    href: "/countries",
    title: "By country",
    body: "Every country, A to Z, with its cities by size.",
    icon: Globe2,
  },
];

export default function GuidesPage() {
  const siteUrl = getSiteUrl();
  const currentMonth = new Date().getUTCMonth();
  return (
    <main id="main-content">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
            { "@type": "ListItem", position: 2, name: "Guides", item: `${siteUrl}/guides` },
          ],
        }}
      />
      <Container>
        <PageHeader
          breadcrumbs={[{ label: "Home", href: "/" }, { label: "Guides" }]}
          title="Guides"
          lede="Rankings that each answer one planning question. Every list explains how it's scored and links to the full city guides."
        />
        <div className="space-y-20 py-12 pb-20">
          <Section id="rankings" title="Rankings">
            <ul className="border-rule bg-rule grid gap-px overflow-hidden rounded-md border sm:grid-cols-2 lg:grid-cols-3">
              {RANKINGS.map(({ href, title, body, icon: Icon }) => (
                <li key={href} className="bg-surface">
                  <Link href={href} className="group hover:bg-paper flex h-full gap-4 p-5">
                    <Icon aria-hidden className="text-accent mt-1 size-5 shrink-0" />
                    <span className="flex-1">
                      <span className="font-display group-hover:text-accent block text-xl">
                        {title}
                      </span>
                      <span className="text-ink-muted mt-1 block text-sm">{body}</span>
                    </span>
                    <ArrowRight
                      aria-hidden
                      className="text-ink-subtle group-hover:text-accent mt-1.5 size-4 shrink-0"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
          <Section
            id="by-month"
            title="Best cities by month"
            description="Cities in a comfortable season for each month, scored on climate and air quality."
          >
            <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {listMonthSlugs().map((slug, index) => {
                const now = index === currentMonth;
                return (
                  <li key={slug}>
                    <Link
                      href={`/best-cities-to-visit-in/${slug}`}
                      className={cn(
                        "bg-surface ease-standard hover:border-accent flex min-h-14 items-center justify-between rounded-md border px-4 transition-colors duration-150",
                        now ? "border-ink" : "border-rule"
                      )}
                    >
                      <span className="font-medium">{monthLabel(slug)}</span>
                      {now ? (
                        <span className="text-highlight-ink text-xs font-medium">Now</span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ol>
          </Section>
        </div>
      </Container>
    </main>
  );
}

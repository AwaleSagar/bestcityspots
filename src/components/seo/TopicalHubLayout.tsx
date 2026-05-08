import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import CityCard from "@/components/seo/CityCard";
import type { CityWithMetric } from "@/lib/topical-hubs";

interface TopicalHubLayoutProps {
  eyebrow: string;
  eyebrowIcon: ReactNode;
  title: string;
  lede: string;
  cities: CityWithMetric[];
  /** Inline copy explaining how the ranking is computed (auditability). */
  methodologyNote: string;
  breadcrumbLabel: string;
  emptyState?: string;
}

/**
 * Shared layout for the SEO Phase 2.3 topical hubs. Keeps the visual
 * parallel between hubs so users moving between them feel coherent, and
 * keeps the SEO surface (h1, intro paragraph, ranked list) consistent
 * across hub pages.
 */
export default function TopicalHubLayout({
  eyebrow,
  eyebrowIcon,
  title,
  lede,
  cities,
  methodologyNote,
  breadcrumbLabel,
  emptyState,
}: TopicalHubLayoutProps) {
  return (
    <main id="main-content" className="text-foreground min-h-screen bg-transparent">
      <div
        className="container-gutter mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20"
        style={{ paddingTop: "max(4rem, calc(env(safe-area-inset-top, 0px) + 5rem))" }}
      >
        <Breadcrumbs
          items={[
            { label: "Cities", href: "/cities" },
            { label: breadcrumbLabel },
          ]}
        />

        <span className="eyebrow">
          {eyebrowIcon}
          {eyebrow}
        </span>
        <h1 className="page-title text-foreground mt-6 max-w-3xl">{title}</h1>
        <p className="lede mt-5 max-w-2xl">{lede}</p>

        <p className="text-muted mt-4 max-w-2xl text-xs leading-relaxed">
          <em>How this ranks:</em> {methodologyNote}{" "}
          <Link href="/methodology" className="text-accent hover:underline">
            See full methodology
          </Link>
          .
        </p>

        <section aria-labelledby="ranked-cities-heading" className="mt-10">
          <h2
            id="ranked-cities-heading"
            className="text-muted text-[11px] font-semibold tracking-[0.22em] uppercase"
          >
            Ranked cities
          </h2>
          {cities.length === 0 ? (
            <p className="text-muted-strong mt-4 text-sm">
              {emptyState ??
                "Ranking will populate as more cities are indexed. Check back soon."}
            </p>
          ) : (
            <ol className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {cities.map((city, index) => (
                <li key={city.id} className="flex items-start gap-3">
                  <span className="text-muted mt-3 w-6 shrink-0 text-right text-xs font-semibold tabular-nums">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <CityCard city={city} context={city.metricLabel} />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <nav className="mt-12 flex flex-wrap gap-3" aria-label="Hub navigation">
          <Link
            href="/cities"
            className="border-line bg-background/65 text-muted-strong hover:text-foreground inline-flex items-center gap-3 rounded-full border px-4 py-3 text-[0.72rem] font-bold tracking-[0.18em] uppercase transition-colors duration-300"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to all cities
          </Link>
        </nav>
      </div>
    </main>
  );
}

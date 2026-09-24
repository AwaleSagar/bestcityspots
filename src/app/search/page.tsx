import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { searchCities } from "@/lib/cities";
import { searchableQuery } from "@/lib/search-utils";
import { buttonClasses } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { CityRow } from "@/components/city/CityRow";
import { SearchField } from "@/components/search/SearchField";

export const metadata: Metadata = {
  title: "Search cities",
  description: "Search Best City Spots city guides by name, alias or country.",
  robots: { index: false, follow: true },
};

const RESULT_LIMIT = 20;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { q } = await searchParams;
  const query = searchableQuery(typeof q === "string" ? q : "");
  const results = query ? await searchCities(query, RESULT_LIMIT).catch(() => []) : [];

  return (
    <main id="main-content">
      <Container>
        <PageHeader
          breadcrumbs={[{ label: "Home", href: "/" }, { label: "Search" }]}
          title={query ? <>Results for “{query}”</> : "Search cities"}
          lede={
            query
              ? `${results.length} ${results.length === 1 ? "city" : "cities"} found, best match first.`
              : "Find any city by name, local name or alias."
          }
        >
          <div className="max-w-2xl">
            <SearchField
              size="lg"
              defaultQuery={query ?? ""}
              label="Search cities"
              showRecent={false}
            />
          </div>
        </PageHeader>
        <div className="py-10 pb-20">
          {!query ? (
            <p className="text-ink-muted">Type at least two letters to search.</p>
          ) : results.length > 0 ? (
            <ol className="border-rule border-t">
              {results.map((city) => (
                <CityRow
                  key={city.id}
                  city={city}
                  meta={
                    city.match_type === "alias" ? (
                      <span className="text-ink-muted hidden sm:inline">Also known as</span>
                    ) : city.match_type === "fuzzy" ? (
                      <span className="text-ink-muted hidden sm:inline">Close match</span>
                    ) : null
                  }
                />
              ))}
            </ol>
          ) : (
            <EmptyState
              icon={<SearchX aria-hidden />}
              title={`No cities match “${query}”`}
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Link href="/countries" className={buttonClasses({ size: "sm" })}>
                    Browse by country
                  </Link>
                  <Link
                    href="/resources/top-cities"
                    className={buttonClasses({ size: "sm", variant: "ghost" })}
                  >
                    See the Top 250
                  </Link>
                </div>
              }
            >
              Check the spelling, try the English or local name, or drop accents.
            </EmptyState>
          )}
        </div>
      </Container>
    </main>
  );
}

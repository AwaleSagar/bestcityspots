import type { Metadata } from "next";
import { Globe2 } from "lucide-react";
import { getCountrySummaries } from "@/lib/countries";
import { getSiteUrl } from "@/lib/site";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { CountryIndex } from "@/components/discovery/CountryIndex";
import { JsonLd } from "@/components/seo/JsonLd";

// SEO Phase 2.3 (audit 7.2): parent index for the programmatic country hubs.
export const metadata: Metadata = {
  title: "City Guides by Country: Browse Travel Destinations Worldwide",
  description:
    "Browse Best City Spots travel guides organized by country. Live weather, neighborhoods, and AI-assisted briefings for cities across every continent.",
  alternates: { canonical: "/countries" },
  openGraph: {
    title: "City Guides by Country | Best City Spots",
    description: "Browse Best City Spots travel guides organized by country.",
    url: "/countries",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "City Guides by Country | Best City Spots",
    description: "Browse Best City Spots travel guides organized by country.",
  },
};

// Re-render daily so newly-added countries surface without a full deploy.
export const revalidate = 86400;

export default async function CountriesIndexPage() {
  const countries = await getCountrySummaries().catch(() => []);
  const siteUrl = getSiteUrl();
  return (
    <main id="main-content">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
            { "@type": "ListItem", position: 2, name: "Countries", item: `${siteUrl}/countries` },
          ],
        }}
      />
      <Container>
        <PageHeader
          breadcrumbs={[{ label: "Home", href: "/" }, { label: "Countries" }]}
          title="Countries"
          lede={
            countries.length > 0
              ? `${countries.length} countries indexed, A to Z. Each country page lists its cities by size.`
              : "Every country page lists its cities by size."
          }
        />
        <div className="py-8 pb-20">
          {countries.length > 0 ? (
            <CountryIndex countries={countries} />
          ) : (
            <EmptyState
              icon={<Globe2 aria-hidden />}
              title="The country index is unavailable right now"
            >
              Try again in a moment, or search for a city directly.
            </EmptyState>
          )}
        </div>
      </Container>
    </main>
  );
}

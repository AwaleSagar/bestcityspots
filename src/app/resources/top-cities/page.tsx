import type { Metadata } from "next";
import { getTopCities } from "@/lib/cities";
import {
  Container,
  Section,
  Stack,
  Grid,
  Display,
  Caption,
  Text,
  CityCard,
  FadeIn,
} from "@/components/atlas";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bestcityspots.com";

export const metadata: Metadata = {
  title: "Top 50 cities to explore | Free city guide",
  description:
    "A free curated list of 50 cities worth a closer look — population, location, and direct links to each full guide. No sign-up.",
  alternates: { canonical: "/resources/top-cities" },
  openGraph: {
    title: "Top 50 cities to explore | Best City Spots",
    description: "A free curated grid of top cities with links to full guides.",
    url: "/resources/top-cities",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Top 50 cities to explore | Best City Spots",
    description: "Free curated list of top cities with links to full guides.",
  },
};

export const revalidate = 86400;

export default async function TopCitiesPage() {
  const cities = await getTopCities(50);

  const itemListStructuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Top 50 cities to explore",
    description:
      "A curated list of top cities, with links to full city guides.",
    numberOfItems: cities.length,
    itemListElement: cities.slice(0, 50).map((city, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Place",
        name: city.city,
        url: `${siteUrl}/cities/${city.id}`,
      },
    })),
  };

  return (
    <main id="main-content">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(itemListStructuredData),
        }}
      />
      <Section size="lg" className="pt-10">
        <Container>
          <Stack gap={6}>
            <Breadcrumbs items={[{ label: "Top cities" }]} />
            <Caption>Curated</Caption>
            <Display>Top cities worth a closer look</Display>
            <Text tone="muted" size="lg" className="max-w-2xl">
              Ranked by population, cultural depth, and editorial pull. Tap any
              city for its live signals and AI briefing.
            </Text>
          </Stack>
        </Container>
      </Section>

      <Section size="md" className="!pt-0">
        <Container>
          <FadeIn>
            <Grid cols={{ base: 2, sm: 2, md: 3, lg: 4 }} gap={4} role="list">
              {cities.map((city, idx) => (
                <div key={city.id} role="listitem">
                  <CityCard
                    id={city.id}
                    name={city.city}
                    country={city.country}
                    lat={city.lat}
                    lng={city.lng}
                    ratio="portrait"
                    priority={idx < 4}
                  />
                </div>
              ))}
            </Grid>
          </FadeIn>
        </Container>
      </Section>
    </main>
  );
}

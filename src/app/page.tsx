import { fetchTrendingDestinations } from "@/app/actions";
import CitySearch from "@/components/features/city/CitySearch";
import {
  Container,
  Section,
  Stack,
  Grid,
  Display,
  Heading,
  Text,
  Caption,
  ChipLink,
  CityCard,
  FadeIn,
  Divider,
} from "@/components/atlas";
import { Search, Database, Sparkles } from "lucide-react";

export const metadata = {
  title: "Best City Spots | City intelligence for deliberate travel",
  description:
    "Research cities with a clean atlas of live urban signals and AI-assisted briefings. Search, compare, and plan without sign-up.",
};

/** Browse-by-intent vibes — links pre-fill the search chips route for now. */
const vibes = [
  { label: "Beach", q: "beach" },
  { label: "Food", q: "food" },
  { label: "Winter", q: "winter" },
  { label: "Remote-friendly", q: "remote" },
  { label: "Budget", q: "budget" },
  { label: "Nightlife", q: "nightlife" },
] as const;

export default async function Home() {
  const topCities = await fetchTrendingDestinations();
  const trending = topCities.slice(0, 8);

  return (
    <main id="main-content" className="pb-10">
      {/* ── Hero: search is the front door ── */}
      <Section as="section" size="lg" className="pt-10 md:pt-16" aria-labelledby="hero-heading">
        <Container>
          <Stack gap={6} align="start">
            <Caption>An atlas for travellers</Caption>
            <Display id="hero-heading">
              Where do you want to <em className="not-italic text-[color:var(--color-accent-strong)]">go</em>?
            </Display>
            <Text tone="muted" size="lg" className="max-w-2xl">
              Search any city to see live weather, air quality, a long-form AI
              briefing, and curated places. Free, no sign-up.
            </Text>
            <div className="w-full max-w-2xl">
              <CitySearch topCities={topCities} />
            </div>
          </Stack>
        </Container>
      </Section>

      {/* ── Browse by vibe ── */}
      <Section size="sm" aria-labelledby="vibes-heading">
        <Container>
          <Stack gap={4}>
            <Heading level={3} id="vibes-heading">
              Browse by vibe
            </Heading>
            <ul className="flex flex-wrap gap-2" role="list">
              {vibes.map((v) => (
                <li key={v.label}>
                  <ChipLink href={`/resources/top-cities?vibe=${v.q}`}>
                    {v.label}
                  </ChipLink>
                </li>
              ))}
            </ul>
          </Stack>
        </Container>
      </Section>

      <Container>
        <Divider />
      </Container>

      {/* ── Trending destinations — image-led grid ── */}
      <Section size="md" aria-labelledby="trending-heading">
        <Container>
          <Stack gap={6}>
            <Stack gap={2}>
              <Caption>Trending</Caption>
              <Heading level={2} id="trending-heading">
                Places worth a closer look
              </Heading>
              <Text tone="muted" className="max-w-xl">
                Curated from live search, AI-ranked signals, and population
                scale. Open any city to read the briefing.
              </Text>
            </Stack>
            {trending.length > 0 ? (
              <FadeIn>
                <Grid
                  cols={{ base: 2, sm: 2, md: 3, lg: 4 }}
                  gap={4}
                  role="list"
                >
                  {trending.map((city, idx) => (
                    <div key={city.id} role="listitem">
                      <CityCard
                        id={city.id}
                        name={city.city}
                        country={city.country}
                        lat={city.lat}
                        lng={city.lng}
                        ratio={idx % 5 === 0 ? "square" : "portrait"}
                        priority={idx < 2}
                      />
                    </div>
                  ))}
                </Grid>
              </FadeIn>
            ) : (
              <Text tone="muted">Trending destinations are loading…</Text>
            )}
          </Stack>
        </Container>
      </Section>

      <Container>
        <Divider />
      </Container>

      {/* ── How it works ── */}
      <Section size="md" aria-labelledby="how-heading">
        <Container>
          <Stack gap={8}>
            <Stack gap={2}>
              <Caption>How it works</Caption>
              <Heading level={2} id="how-heading">
                A calmer way to plan
              </Heading>
            </Stack>
            <Grid cols={{ base: 1, md: 3 }} gap={6}>
              {[
                {
                  icon: Search,
                  title: "Search by city or region",
                  text: "A single input with keyboard navigation, geolocation, and fuzzy matching.",
                },
                {
                  icon: Database,
                  title: "See live, cached signals",
                  text: "Weather, AQI, and population — sourced from public providers and refreshed on demand.",
                },
                {
                  icon: Sparkles,
                  title: "Read an AI briefing",
                  text: "A concise why-go summary, attractions, and seasonal notes. Always marked as AI-generated.",
                },
              ].map(({ icon: Icon, title, text }) => (
                <Stack key={title} gap={3} as="article">
                  <span
                    aria-hidden
                    className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-[color:var(--color-foreground)]"
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <Heading level={3}>{title}</Heading>
                  <Text tone="muted" size="sm">
                    {text}
                  </Text>
                </Stack>
              ))}
            </Grid>
          </Stack>
        </Container>
      </Section>
    </main>
  );
}

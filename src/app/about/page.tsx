import type { Metadata } from "next";
import Link from "next/link";
import {
  Database,
  Globe2,
  Radar,
  Shield,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import {
  Container,
  Section,
  Stack,
  Grid,
  Display,
  Heading,
  Text,
  Caption,
  ButtonLink,
  Divider,
  Card,
} from "@/components/atlas";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bestcityspots.com";

export const metadata: Metadata = {
  title: "About Best City Spots",
  description:
    "How Best City Spots works: data sources, methodology, and a commitment to no paywalls, no dark patterns, and ethical design.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Best City Spots | How we work & our data",
    description:
      "Transparent overview of our data sources, methodology, and commitment to ethical design.",
    url: "/about",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Best City Spots — Urban intelligence",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "About Best City Spots | How we work & our data",
    description: "Transparent overview of our data sources and ethical design.",
    images: ["/opengraph-image"],
  },
};

const principles = [
  {
    title: "No paywalls",
    text: "The core city research experience stays open so planning is not gated behind an account wall.",
  },
  {
    title: "No dark patterns",
    text: "We do not use fake scarcity, manipulative timers, or disguised calls to action.",
  },
  {
    title: "Transparent data",
    text: "Metrics are sourced from recognisable providers and described in plain language.",
  },
  {
    title: "Ethical AI use",
    text: "AI adds summary and synthesis. It does not replace source data or hide where facts come from.",
  },
];

const stack = [
  {
    icon: Globe2,
    title: "Global city graph",
    text: "A searchable index of major cities and urban centres with demographic context.",
  },
  {
    icon: Radar,
    title: "Live signals",
    text: "Weather and air quality are refreshed so shortlists do not feel frozen in time.",
  },
  {
    icon: Shield,
    title: "Responsible analytics",
    text: "Usage insights help improve the product without turning the interface into a surveillance funnel.",
  },
  {
    icon: Sparkles,
    title: "AI briefings, labelled",
    text: "AI text is always marked as AI-generated and anchored to public data.",
  },
];

const sources = [
  "Google Places API — landmarks, restaurants, hotels, ratings, reviews",
  "OpenWeatherMap + Open-Meteo — live conditions, pollution, seasonal context",
  "Public census and geographic datasets — scale, region, population",
  "Google Gemini — clearly labelled AI briefings and city summaries",
];

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Best City Spots",
    url: siteUrl,
    description:
      "Best City Spots is a curated atlas of global cities blending live signals with urban intelligence.",
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Best City Spots",
    url: siteUrl,
  },
];

export default function AboutPage() {
  return (
    <main id="main-content">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <Section size="lg" className="pt-10">
        <Container>
          <Stack gap={6} align="start">
            <Breadcrumbs items={[{ label: "About" }]} />
            <Caption>About</Caption>
            <Display>
              Travel intelligence, told like an <em className="not-italic text-[color:var(--color-accent-strong)]">atlas</em>.
            </Display>
            <Text tone="muted" size="lg" className="max-w-2xl">
              Best City Spots is a lightweight research tool for thoughtful
              travellers. Clear data, calm design, and briefings written for
              people who read, not skim.
            </Text>
            <ButtonLink href="/" variant="accent" size="lg">
              Start exploring
              <ArrowRight className="h-4 w-4" aria-hidden />
            </ButtonLink>
          </Stack>
        </Container>
      </Section>

      <Container>
        <Divider />
      </Container>

      <Section size="md" aria-labelledby="principles-heading">
        <Container>
          <Stack gap={6}>
            <Stack gap={2}>
              <Caption>Principles</Caption>
              <Heading level={2} id="principles-heading">
                A simpler contract with the reader
              </Heading>
            </Stack>
            <Grid cols={{ base: 1, md: 2 }} gap={4}>
              {principles.map(({ title, text }) => (
                <Card key={title} variant="outline" className="p-5">
                  <Stack gap={2}>
                    <Heading level={3}>{title}</Heading>
                    <Text size="sm" tone="muted">
                      {text}
                    </Text>
                  </Stack>
                </Card>
              ))}
            </Grid>
          </Stack>
        </Container>
      </Section>

      <Container>
        <Divider />
      </Container>

      <Section size="md" id="source-stack" aria-labelledby="stack-heading">
        <Container>
          <Stack gap={6}>
            <Stack gap={2}>
              <Caption>Source stack</Caption>
              <Heading level={2} id="stack-heading">
                What we bring together
              </Heading>
            </Stack>
            <Grid cols={{ base: 1, md: 2 }} gap={4}>
              {stack.map(({ icon: Icon, title, text }) => (
                <Card key={title} variant="outline" className="p-5">
                  <Stack gap={3}>
                    <span
                      aria-hidden
                      className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--color-line)] bg-[color:var(--color-surface-muted)] text-[color:var(--color-foreground)]"
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <Heading level={3}>{title}</Heading>
                    <Text size="sm" tone="muted">
                      {text}
                    </Text>
                  </Stack>
                </Card>
              ))}
            </Grid>

            <Card variant="outline" className="mt-2 p-5">
              <Stack gap={3}>
                <Caption>
                  <Database className="h-3.5 w-3.5" aria-hidden />
                  Data sources
                </Caption>
                <ul className="list-disc space-y-2 pl-5 text-sm text-[color:var(--color-muted)] marker:text-[color:var(--color-accent)]">
                  {sources.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </Stack>
            </Card>
          </Stack>
        </Container>
      </Section>

      <Section size="md">
        <Container>
          <Card variant="raised" className="p-6 md:p-8">
            <Stack gap={3}>
              <Caption>Ready?</Caption>
              <Heading level={2}>Pick a city and dive in.</Heading>
              <Text tone="muted">
                No sign-up, no paywalls. Search any city, skim the signals, and
                read the briefing — that&apos;s it.
              </Text>
              <div className="pt-2">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--color-accent-strong)] hover:underline"
                >
                  Start exploring
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </Stack>
          </Card>
        </Container>
      </Section>
    </main>
  );
}

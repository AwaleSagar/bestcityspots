import { serializeJsonLd } from "@/lib/json-ld";
import type { Metadata } from "next";
import Link from "next/link";
import { Accessibility, Mail } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { publicEnv } from "@/lib/env";

const publicConfig = publicEnv();
const siteUrl = (publicConfig.NEXT_PUBLIC_SITE_URL ?? "https://bestcityspots.com").replace(
  /\/$/,
  ""
);
const contactEmail = publicConfig.NEXT_PUBLIC_CONTACT_EMAIL;

// UI review item 4: the European Accessibility Act (in force since June 2025)
// expects service providers to publish an accessibility statement. This page
// states the conformance target, what is implemented, known gaps, and a
// feedback channel — and doubles as a trust signal consistent with the
// site's "source transparency" pillar.
export const metadata: Metadata = {
  title: "Accessibility Statement",
  description:
    "Best City Spots' accessibility statement: WCAG 2.2 AA conformance target, implemented measures, known limitations, and how to report issues.",
  alternates: { canonical: "/accessibility" },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
    {
      "@type": "ListItem",
      position: 2,
      name: "Accessibility",
      item: `${siteUrl}/accessibility`,
    },
  ],
};

const implementedMeasures = [
  "Color contrast of text meets or exceeds WCAG 2.2 AA ratios in light and dark themes",
  "All functionality is operable by keyboard, with visible focus indicators",
  "A skip-to-content link and landmark regions support screen-reader navigation",
  "Touch targets meet the 44px minimum on interactive controls",
  "Motion and animation respect the prefers-reduced-motion system setting",
  "Increased-contrast preferences (prefers-contrast) are honored",
  "Text can be resized up to 200% and pages remain usable",
  "Loading states are announced to assistive technology",
] as const;

export default function AccessibilityPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />
      <main id="main-content" className="text-foreground min-h-screen bg-transparent">
        <div
          className="container-gutter mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20"
          style={{ paddingTop: "max(4rem, calc(env(safe-area-inset-top, 0px) + 5rem))" }}
        >
          <Breadcrumbs items={[{ label: "Accessibility" }]} />

          <span className="eyebrow">
            <Accessibility className="text-accent h-3.5 w-3.5" aria-hidden />
            Accessibility
          </span>

          <h1 className="page-title text-foreground mt-4">Accessibility statement</h1>

          <p className="lede mt-5">
            Best City Spots is designed to be usable by everyone. We aim to conform to the Web
            Content Accessibility Guidelines (WCAG) 2.2, Level AA, across the whole site.
          </p>

          <section className="mt-10" aria-labelledby="measures-heading">
            <h2 id="measures-heading" className="section-title text-foreground">
              What we have implemented
            </h2>
            <ul className="mt-5 space-y-3">
              {implementedMeasures.map((item) => (
                <li key={item} className="text-muted-strong flex gap-3 text-sm leading-relaxed">
                  <span className="bg-accent mt-2 h-1.5 w-1.5 shrink-0 rounded-full" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-10" aria-labelledby="limitations-heading">
            <h2 id="limitations-heading" className="section-title text-foreground">
              Known limitations
            </h2>
            <p className="text-muted-strong mt-5 text-sm leading-relaxed">
              Some third-party imagery and AI-generated briefing content may occasionally lack fully
              descriptive alternative text. Live data visualizations (weather, air quality) provide
              text equivalents, but their granularity is still being improved. We review these areas
              continuously.
            </p>
          </section>

          <section className="mt-10" aria-labelledby="feedback-heading">
            <h2 id="feedback-heading" className="section-title text-foreground">
              Feedback and contact
            </h2>
            <p className="text-muted-strong mt-5 text-sm leading-relaxed">
              If you encounter an accessibility barrier on this site, please tell us. We aim to
              respond within five business days.
            </p>
            {contactEmail ? (
              <a href={`mailto:${contactEmail}`} className="btn-secondary mt-5">
                <Mail className="h-4 w-4" aria-hidden />
                {contactEmail}
              </a>
            ) : (
              <p className="text-muted-strong mt-5 text-sm leading-relaxed">
                Contact us via the details on the{" "}
                <Link href="/about" className="text-link">
                  About page
                </Link>
                .
              </p>
            )}
          </section>

          <p className="text-muted mt-12 text-xs">
            This statement was last reviewed in June 2026 and is revisited alongside significant
            interface changes.
          </p>
        </div>
      </main>
    </>
  );
}

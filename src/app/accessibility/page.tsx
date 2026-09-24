import type { Metadata } from "next";
import Link from "next/link";
import { publicEnv } from "@/lib/env";
import { getSiteUrl } from "@/lib/site";
import { ProseLayout } from "@/components/editorial/ProseLayout";
import { JsonLd } from "@/components/seo/JsonLd";

const publicConfig = publicEnv();
const siteUrl = getSiteUrl();
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
  "Text and interface colors meet WCAG 2.2 AA contrast ratios in both light and dark themes",
  "Everything works with a keyboard, with a clearly visible focus indicator",
  "A skip link, landmark regions and one heading outline per page support screen readers",
  "Search, tabs, dialogs and menus follow WAI-ARIA patterns (combobox, tablist, modal dialog)",
  "Controls meet the WCAG 2.2 target-size minimum, and primary controls grow to 44px on touch screens",
  "Motion respects the reduced-motion setting, and increased-contrast preferences are honored",
  "Text can be resized to 200% and layouts reflow down to 320px wide without horizontal scrolling",
  "Loading, search results and confirmations are announced to assistive technology",
  "Color is never the only signal — air quality and seasons always carry a text label",
] as const;

export default function AccessibilityPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <ProseLayout
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Accessibility" }]}
        title="Accessibility statement"
        lede="Best City Spots is designed to be usable by everyone. We aim to conform to the Web Content Accessibility Guidelines (WCAG) 2.2, Level AA, across the whole site."
      >
        <h2 id="implemented">What we have implemented</h2>
        <ul>
          {implementedMeasures.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <h2 id="limitations">Known limitations</h2>
        <p>
          Maps are supplementary: every place on a map is also listed as text, but the map itself is
          not fully usable with a screen reader. Some place photos come from third parties and only
          carry the place name as alternative text. AI-written briefings are checked for structure,
          not reviewed by a person before publishing.
        </p>

        <h2 id="feedback">Feedback and contact</h2>
        <p>
          If you run into an accessibility barrier on this site, please tell us. We aim to respond
          within five business days.
        </p>
        {contactEmail ? (
          <p>
            <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
          </p>
        ) : (
          <p>
            Contact us via the details on the <Link href="/about">About page</Link>.
          </p>
        )}
        <p className="text-ink-muted text-sm">
          This statement was last reviewed in September 2026, alongside the redesign of the site,
          and is revisited with every significant interface change.
        </p>
      </ProseLayout>
    </>
  );
}

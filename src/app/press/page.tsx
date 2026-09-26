import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { publicEnv } from "@/lib/env";
import { getSiteUrl } from "@/lib/site";
import { ProseLayout } from "@/components/editorial/ProseLayout";
import { JsonLd } from "@/components/seo/JsonLd";

const publicConfig = publicEnv();
const siteUrl = getSiteUrl();
const contactEmail = publicConfig.NEXT_PUBLIC_CONTACT_EMAIL;

// SEO Phase 3.5 (audit 7.5): a press kit page is a small but reliable
// off-page asset. It surfaces brand assets, the methodology, and a contact
// path for journalists — the kind of page HARO/journalist outreach links to.
export const metadata: Metadata = {
  title: "Press Kit & Brand Assets",
  description:
    "Press kit for Best City Spots: brand assets, methodology link, and journalist contact.",
  alternates: { canonical: "/press" },
  openGraph: {
    title: "Press Kit | Best City Spots",
    description: "Brand assets, methodology link, and journalist contact for Best City Spots.",
    url: "/press",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Press Kit | Best City Spots",
    description: "Brand assets, methodology, and journalist contact.",
  },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
    { "@type": "ListItem", position: 2, name: "Press", item: `${siteUrl}/press` },
  ],
};

export default function PressPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <ProseLayout
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Press" }]}
        title="Press kit"
        lede="Best City Spots is a free city research tool: live conditions, clearly labelled AI briefings and places ranked by traveler reviews, with every source named. Assets and contact details are below."
      >
        <h2 id="assets">Brand assets</h2>
        <ul className="not-prose space-y-3">
          <li>
            <a
              href="/logo.svg"
              download
              className="text-accent inline-flex items-center gap-2 font-medium underline underline-offset-4"
            >
              <Download aria-hidden className="size-4" />
              Logo (SVG)
            </a>
          </li>
          <li>
            <a
              href="/opengraph-image"
              className="text-accent inline-flex items-center gap-2 font-medium underline underline-offset-4"
            >
              <Download aria-hidden className="size-4" />
              Social card (PNG, 1200×630)
            </a>
          </li>
        </ul>

        <h2 id="facts">Quick facts</h2>
        <ul>
          <li>
            A free, no-sign-up city research tool combining live weather and air-quality data with
            AI-assisted briefings.
          </li>
          <li>Credit line: Source: Best City Spots (bestcityspots.co)</li>
          <li>
            How the data is collected and labelled: <Link href="/methodology">/methodology</Link>
          </li>
        </ul>

        {contactEmail ? (
          <>
            <h2 id="contact">Contact</h2>
            <p>
              <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
            </p>
          </>
        ) : null}
      </ProseLayout>
    </>
  );
}

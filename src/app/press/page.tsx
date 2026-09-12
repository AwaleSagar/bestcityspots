import { serializeJsonLd } from "@/lib/json-ld";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Download, Mail, Sparkles } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { publicEnv } from "@/lib/env";

const publicConfig = publicEnv();
const siteUrl = (publicConfig.NEXT_PUBLIC_SITE_URL ?? "https://bestcityspots.com").replace(
  /\/$/,
  ""
);
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />
      <main id="main-content" className="text-foreground min-h-screen bg-transparent">
        <div
          className="container-gutter mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20"
          style={{ paddingTop: "max(4rem, calc(env(safe-area-inset-top, 0px) + 5rem))" }}
        >
          <Breadcrumbs items={[{ label: "Press" }]} />

          <span className="eyebrow">
            <Sparkles className="text-accent h-3.5 w-3.5" aria-hidden />
            Press kit
          </span>
          <h1 className="page-title text-foreground mt-6 max-w-2xl">Press kit and brand assets.</h1>
          <p className="lede mt-5 max-w-xl">
            Best City Spots is an editorial atlas of global cities &mdash; live signals,
            neighborhood texture, and AI-assisted briefings, available without a sign-up.
            Quick-reference assets and contact details are below.
          </p>

          <section aria-labelledby="assets-heading" className="mt-12">
            <h2
              id="assets-heading"
              className="text-muted text-xs font-semibold tracking-[0.22em] uppercase"
            >
              Brand assets
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              <li className="border-line bg-surface/60 rounded-lg border p-4">
                <a
                  href="/logo.svg"
                  download
                  className="text-foreground inline-flex items-center gap-3 text-sm font-semibold"
                >
                  <Download className="h-4 w-4" aria-hidden /> Logo (SVG)
                </a>
                <p className="text-muted mt-2 text-xs">Vector mark, transparent background.</p>
              </li>
              <li className="border-line bg-surface/60 rounded-lg border p-4">
                <a
                  href="/opengraph-image"
                  className="text-foreground inline-flex items-center gap-3 text-sm font-semibold"
                >
                  <Download className="h-4 w-4" aria-hidden /> Social card (1200×630)
                </a>
                <p className="text-muted mt-2 text-xs">PNG suitable for press headers.</p>
              </li>
            </ul>
          </section>

          <section aria-labelledby="facts-heading" className="mt-12">
            <h2
              id="facts-heading"
              className="text-muted text-xs font-semibold tracking-[0.22em] uppercase"
            >
              Quick facts
            </h2>
            <ul className="mt-4 space-y-2 text-sm leading-relaxed">
              <li>
                <strong className="text-foreground">What it is:</strong>{" "}
                <span className="text-muted-strong">
                  A free, no-sign-up city research tool combining live weather and air-quality data
                  with AI-assisted briefings.
                </span>
              </li>
              <li>
                <strong className="text-foreground">How to cite:</strong>{" "}
                <span className="text-muted-strong">
                  Source: Best City Spots (bestcityspots.com)
                </span>
              </li>
              <li>
                <strong className="text-foreground">Methodology:</strong>{" "}
                <Link href="/methodology" className="text-accent hover:underline">
                  /methodology
                </Link>{" "}
                <span className="text-muted-strong">documents sources and refresh cadence.</span>
              </li>
            </ul>
          </section>

          {contactEmail ? (
            <section aria-labelledby="contact-heading" className="mt-12">
              <h2
                id="contact-heading"
                className="text-muted text-xs font-semibold tracking-[0.22em] uppercase"
              >
                <Mail className="text-accent mr-2 inline h-3.5 w-3.5" aria-hidden />
                Contact
              </h2>
              <p className="mt-4 text-sm">
                <a
                  href={`mailto:${contactEmail}`}
                  className="text-accent text-base font-semibold hover:underline"
                >
                  {contactEmail}
                </a>
              </p>
            </section>
          ) : null}

          <nav className="mt-12 flex flex-wrap gap-3" aria-label="Press navigation">
            <Link
              href="/"
              className="border-line bg-background/65 text-muted-strong hover:text-foreground inline-flex items-center gap-3 rounded-full border px-4 py-3 text-xs font-bold tracking-[0.18em] uppercase transition-colors duration-300"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back to home
            </Link>
            <Link
              href="/methodology"
              className="border-line bg-background/65 text-muted-strong hover:text-foreground inline-flex items-center gap-3 rounded-full border px-4 py-3 text-xs font-bold tracking-[0.18em] uppercase transition-colors duration-300"
            >
              Methodology
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </nav>
        </div>
      </main>
    </>
  );
}

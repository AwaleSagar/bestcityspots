import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Instrument_Sans } from "next/font/google";
import { AnalyticsProvider, PageTracker } from "@/components/analytics";
import LazyGeoConsentBanner from "@/components/analytics/LazyGeoConsentBanner";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import SiteFooter from "@/components/layout/SiteFooter";
import SiteNav from "@/components/layout/SiteNav";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { publicEnv } from "@/lib/env";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  // Azure Atlas palette (color audit): Paper / cool charcoal.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7f2" },
    { media: "(prefers-color-scheme: dark)", color: "#07090c" },
  ],
};

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  display: "swap",
});

const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-cormorant-garamond",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

// IBM Plex Mono removed: --font-mono now uses the system mono stack
// (globals.css) — its usage was too sparse to justify webfont weight on LCP.

const publicConfig = publicEnv();
const siteUrl = (publicConfig.NEXT_PUBLIC_SITE_URL ?? "https://bestcityspots.com").replace(
  /\/$/,
  ""
);

// SEO Phase 1 (T11/T12, audit 1.3): externalize the Organization properties
// that were previously empty so search engines can build a more complete
// knowledge-panel entry. All fields fall back gracefully when the env is
// absent — `sameAs` is omitted entirely rather than emitted as `[]`, which
// the Rich Results Test flags as a warning.
function parseSameAs(raw: string | undefined): string[] | undefined {
  if (!raw) return undefined;
  const list = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => {
      if (!s) return false;
      try {
        const parsed = new URL(s);
        // Only http(s) URLs are appropriate for schema.org `sameAs`.
        return parsed.protocol === "https:" || parsed.protocol === "http:";
      } catch {
        return false;
      }
    });
  return list.length > 0 ? list : undefined;
}

const sameAs = parseSameAs(publicConfig.NEXT_PUBLIC_ORGANIZATION_SAME_AS);
const contactEmail = publicConfig.NEXT_PUBLIC_CONTACT_EMAIL;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Best City Spots | Curated City Experiences for Modern Explorers",
    template: "%s | Best City Spots",
  },
  description:
    "Discover hidden gems, plan smarter trips, and explore the world's most vibrant cities with curated guides, insider tips, and AI-powered insights.",
  applicationName: "Best City Spots",
  keywords: [
    "best cities to visit",
    "city guides",
    "curated travel experiences",
    "travel inspiration",
    "city exploration",
    "destination discovery",
    "hidden gems",
    "where to travel",
  ],
  authors: [{ name: "Best City Spots", url: siteUrl }],
  creator: "Best City Spots",
  publisher: "Best City Spots",
  referrer: "origin-when-cross-origin",
  category: "travel",
  alternates: {
    canonical: "/",
    // SEO Phase 3.4 (audit 7.4): emit `hreflang` self-references on every
    // page so when locale variants ship later we are not retrofitting from
    // scratch. `x-default` doubles as the canonical for the en surface and
    // makes the site eligible for hreflang-aware indexing today.
    languages: {
      "en-US": "/",
      "x-default": "/",
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    title: "Best City Spots | Curated City Experiences for Modern Explorers",
    description:
      "Discover hidden gems, plan smarter trips, and explore the world's most vibrant cities with curated guides and AI-powered insights.",
    type: "website",
    url: "/",
    siteName: "Best City Spots",
    locale: "en_US",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Best City Spots - Urban Intelligence",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Best City Spots | Curated City Experiences for Modern Explorers",
    description:
      "Discover hidden gems, plan smarter trips, and explore cities with curated guides and AI-powered insights.",
    images: ["/opengraph-image"],
  },
  verification: publicConfig.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: publicConfig.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "Best City Spots",
      legalName: "Best City Spots",
      url: siteUrl,
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/opengraph-image`,
        width: 1200,
        height: 630,
      },
      description:
        "Best City Spots provides curated city experiences for modern explorers—discover hidden gems, plan smarter trips, and explore with confidence.",
      ...(sameAs ? { sameAs } : {}),
      ...(contactEmail
        ? {
            contactPoint: {
              "@type": "ContactPoint",
              contactType: "customer support",
              email: contactEmail,
              availableLanguage: ["English"],
            },
          }
        : {}),
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      name: "Best City Spots",
      url: siteUrl,
      description:
        "Discover hidden gems, plan smarter trips, and explore the world's most vibrant cities with curated guides and AI-powered insights.",
      publisher: { "@id": `${siteUrl}/#organization` },
      inLanguage: "en-US",
      // SEO audit 5.5: SearchAction unlocks sitelinks-search-box eligibility
      // on the SERP. The target URL points at the on-site search results page,
      // wrapped in the EntryPoint schema Google requires.
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${siteUrl}/?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body
        className={`${instrumentSans.variable} ${cormorantGaramond.variable} min-h-screen antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AnalyticsProvider>
            <PageTracker />
            <SiteNav />
            <a
              href="#main-content"
              className="skip-link border-line bg-surface text-foreground z-[210] rounded-lg border px-4 py-2 text-xs font-semibold shadow-md transition"
            >
              Skip to content
            </a>
            <div className="flex min-h-screen flex-col">
              <div className="flex flex-1 flex-col">{children}</div>
              <SiteFooter />
            </div>
            <MobileBottomNav />
            <LazyGeoConsentBanner />
          </AnalyticsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { serializeJsonLd } from "@/lib/json-ld";
import { publicEnv } from "@/lib/env";
import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";
import { LazyConsentBanner } from "@/components/analytics/LazyConsentBanner";
import { PageTracker } from "@/components/analytics/PageTracker";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { SearchDialog } from "@/components/search/SearchDialog";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  // Paper / ink — keep in sync with --paper in globals.css.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f5f1" },
    { media: "(prefers-color-scheme: dark)", color: "#121417" },
  ],
};

// Self-hosted latin variable fonts (OFL, see ./fonts/LICENSE-OFL.txt).
// next/font/google broke builds whenever Google served multi-parameter
// `/l/font?kit=…` URLs, which Turbopack's loader rejects, so builds no
// longer fetch from Google at all.
const geist = localFont({
  src: "./fonts/Geist-latin-var.woff2",
  variable: "--font-geist",
  weight: "100 900",
  style: "normal",
  display: "swap",
  adjustFontFallback: "Arial",
});

const newsreader = localFont({
  src: "./fonts/Newsreader-latin-var.woff2",
  variable: "--font-newsreader",
  weight: "200 800",
  style: "normal",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

const publicConfig = publicEnv();
const siteUrl = (publicConfig.NEXT_PUBLIC_SITE_URL ?? "https://bestcityspots.co").replace(
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
// Privacy-conscious analytics stay off in development unless explicitly enabled.
const analyticsEnabled =
  publicConfig.NODE_ENV !== "development" || Boolean(publicConfig.NEXT_PUBLIC_ANALYTICS_DEV);
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
      // on the SERP. The target is the server-rendered /search results page,
      // wrapped in the EntryPoint schema Google requires.
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${siteUrl}/search?q={search_term_string}`,
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
    <html lang="en" suppressHydrationWarning className={`${geist.variable} ${newsreader.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AnalyticsProvider enabled={analyticsEnabled}>
            <a
              href="#main-content"
              className="skip-link bg-ink text-paper rounded-md px-4 py-2 text-sm font-medium"
            >
              Skip to content
            </a>
            <PageTracker />
            <SiteHeader />
            <div className="flex flex-1 flex-col">{children}</div>
            <SiteFooter />
            <SearchDialog />
            <LazyConsentBanner />
          </AnalyticsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

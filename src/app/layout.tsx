import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4efe6" },
    { media: "(prefers-color-scheme: dark)", color: "#17110d" },
  ],
};

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
});

const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-cormorant-garamond",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bestcityspots.com";

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
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
};

import { ThemeProvider } from "@/components/layout/ThemeProvider";
import SiteNav from "@/components/layout/SiteNav";
import SiteFooter from "@/components/layout/SiteFooter";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import ClientEffects from "@/components/effects/ClientEffects";
import { AnalyticsProvider, PageTracker, GeoConsentBanner } from "@/components/analytics";

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Best City Spots",
    url: siteUrl,
    description:
      "Best City Spots provides curated city experiences for modern explorers—discover hidden gems, plan smarter trips, and explore with confidence.",
    sameAs: [],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Best City Spots",
    url: siteUrl,
    description:
      "Discover hidden gems, plan smarter trips, and explore the world's most vibrant cities with curated guides and AI-powered insights.",
    publisher: { "@id": `${siteUrl}/#organization` },
    inLanguage: "en-US",
  },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${instrumentSans.variable} ${cormorantGaramond.variable} ${ibmPlexMono.variable} relative isolate min-h-screen overflow-x-hidden antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd[0]) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd[1]) }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <AnalyticsProvider>
            <PageTracker />
            <SiteNav />
            <a
              href="#main-content"
              className="skip-link border-line bg-surface/95 text-foreground focus-visible:ring-accent/40 pointer-events-auto fixed top-3 left-3 z-[210] rounded-full border px-4 py-3 text-[11px] font-semibold tracking-[0.24em] uppercase opacity-0 shadow-lg backdrop-blur-xl transition focus-visible:opacity-100 focus-visible:ring-2 sm:top-4 sm:left-4"
              style={{
                marginLeft: "env(safe-area-inset-left, 0)",
                marginTop: "env(safe-area-inset-top, 0)",
              }}
            >
              Skip to content
            </a>
            <ClientEffects />
            <div className="mobile-bottom-spacer relative z-10 flex min-h-screen flex-col">
              <div className="flex flex-1 flex-col">{children}</div>
              <SiteFooter />
            </div>
            <MobileBottomNav />
            <GeoConsentBanner />
          </AnalyticsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

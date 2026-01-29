import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bestcityspots.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Best City Spots | Trusted Urban Intelligence & City Guides",
    template: "%s | Best City Spots",
  },
  description:
    "Discover your next destination with trusted city data, live metrics, and AI-powered insights. Compare cities, explore experiences, and plan trips with clarity—no paywalls, no dark patterns.",
  applicationName: "Best City Spots",
  keywords: [
    "best cities to visit",
    "city guides",
    "urban intelligence",
    "travel inspiration",
    "city comparison",
    "destination discovery",
    "city metrics",
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
    title: "Best City Spots | Trusted Urban Intelligence & City Guides",
    description:
      "Discover your next destination with trusted city data and AI-powered insights. Compare cities and plan trips with clarity.",
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
    title: "Best City Spots | Trusted Urban Intelligence & City Guides",
    description:
      "Discover your next destination with trusted city data and AI-powered insights.",
    images: ["/opengraph-image"],
  },
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
};

import Link from "next/link";
import VisualEffects from "@/components/VisualEffects";
import FloralAccent from "@/components/FloralAccent";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import SiteFooter from "@/components/SiteFooter";

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Best City Spots",
    url: siteUrl,
    description:
      "Best City Spots provides trusted urban intelligence and city guides—live metrics, AI insights, and transparent data to help travelers discover and compare cities.",
    sameAs: [],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Best City Spots",
    url: siteUrl,
    description:
      "Discover your next destination with trusted city data, live metrics, and AI-powered insights.",
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
        className={`${geistSans.variable} ${geistMono.variable} relative isolate min-h-screen overflow-x-hidden antialiased selection:bg-blue-500/30 selection:text-blue-200`}
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
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <div className="fixed right-4 top-4 z-[200] flex items-center gap-3">
            <Link
              href="/about"
              className="rounded-full border border-foreground/10 bg-foreground/[0.04] px-4 py-2 text-[10px] font-black tracking-[0.2em] text-foreground/70 uppercase transition hover:border-foreground/30 hover:text-foreground"
            >
              About
            </Link>
            <ThemeToggle />
          </div>
          <a
            href="#main-content"
            className="skip-link pointer-events-auto fixed left-4 top-4 z-[200] rounded-xl border border-foreground/10 bg-background/80 px-4 py-2 text-xs font-black tracking-[0.2em] text-foreground/80 uppercase opacity-0 backdrop-blur-md transition focus-visible:opacity-100"
          >
            Skip to content
          </a>
          <VisualEffects />
          <FloralAccent />
          <div className="relative z-10 flex min-h-screen flex-col">
            <div className="flex-1 flex flex-col">{children}</div>
            <SiteFooter />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}

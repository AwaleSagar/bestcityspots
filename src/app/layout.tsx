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
  title: "Best City Spots - Explore the World",
  description: "Discover your next destination with our curated database of world cities.",
  applicationName: "Best City Spots",
  keywords: [
    "best cities",
    "city guides",
    "travel inspiration",
    "urban intelligence",
    "city metrics",
    "destination discovery",
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
  },
  openGraph: {
    title: "Best City Spots - Explore the World",
    description: "Discover your next destination with our curated database of world cities.",
    type: "website",
    url: "/",
    siteName: "Best City Spots",
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
    title: "Best City Spots - Explore the World",
    description: "Discover your next destination with our curated database of world cities.",
    images: ["/opengraph-image"],
  },
};

import Link from "next/link";
import VisualEffects from "@/components/VisualEffects";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";

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
          <div className="relative z-10">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  );
}

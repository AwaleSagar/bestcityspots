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

export const metadata: Metadata = {
  title: "Best City Spots - Explore the World",
  description: "Discover your next destination with our curated database of world cities.",
};

import VisualEffects from "@/components/VisualEffects";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} relative min-h-screen overflow-x-hidden antialiased selection:bg-blue-500/30 selection:text-blue-200`}
      >
        <VisualEffects />
        {children}
      </body>
    </html>
  );
}

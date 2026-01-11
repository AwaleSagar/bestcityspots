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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased relative min-h-screen overflow-x-hidden selection:bg-blue-500/30 selection:text-blue-200`}
      >
        {/* Liquid Sexy Background Elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="orb w-[500px] h-[500px] bg-blue-600/20 top-[-100px] left-[-100px]" />
          <div className="orb w-[400px] h-[400px] bg-purple-600/20 bottom-[-100px] right-[-100px] animation-delay-2000" />
          <div className="orb w-[300px] h-[300px] bg-indigo-600/20 top-[40%] left-[20%] animation-delay-4000" />
        </div>
        {children}
      </body>
    </html>
  );
}

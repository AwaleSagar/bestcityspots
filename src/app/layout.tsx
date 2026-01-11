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
        className={`${geistSans.variable} ${geistMono.variable} relative min-h-screen overflow-x-hidden antialiased selection:bg-blue-500/30 selection:text-blue-200`}
      >
        {/* Liquid Sexy Background Elements */}
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="orb top-[-100px] left-[-100px] h-[500px] w-[500px] bg-blue-600/20" />
          <div className="orb animation-delay-2000 right-[-100px] bottom-[-100px] h-[400px] w-[400px] bg-purple-600/20" />
          <div className="orb animation-delay-4000 top-[40%] left-[20%] h-[300px] w-[300px] bg-indigo-600/20" />
        </div>
        {children}
      </body>
    </html>
  );
}

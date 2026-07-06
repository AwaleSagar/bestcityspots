import type { Metadata } from "next";
import PassportContent from "@/components/pages/PassportContent";

export const metadata: Metadata = {
  title: "Atlas Passport — Your Exploration Record | Best City Spots",
  description:
    "A private, on-device record of the cities you've researched and the places you've saved. No account, no cloud — your passport lives in your browser.",
  robots: { index: false, follow: true },
};

export default function PassportPage() {
  return (
    <main id="main-content" className="text-foreground min-h-screen bg-transparent">
      <PassportContent />
    </main>
  );
}

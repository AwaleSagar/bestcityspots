import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { SavedContent } from "@/components/saved/SavedContent";

// Personal, device-local view — never indexed.
export const metadata: Metadata = {
  title: "Saved places",
  description: "The places and cities you've saved in this browser.",
  robots: { index: false, follow: true },
};

export default function SavedPage() {
  return (
    <main id="main-content">
      <Container>
        <PageHeader
          breadcrumbs={[{ label: "Home", href: "/" }, { label: "Saved" }]}
          title="Saved"
          lede="Your shortlist of places and the cities you've been reading about."
        />
        <SavedContent />
      </Container>
    </main>
  );
}

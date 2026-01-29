import Link from "next/link";
import { BookOpen, ArrowRight } from "lucide-react";

export default function FreeResourceCTA() {
  return (
    <section
      className="mx-auto max-w-2xl px-6 py-12"
      aria-labelledby="free-resource-heading"
    >
      <div className="liquid-glass rounded-[2rem] border border-purple-500/20 bg-purple-500/5 p-8 text-center sm:p-10">
        <h2
          id="free-resource-heading"
          className="mb-2 flex items-center justify-center gap-2 text-sm font-black uppercase tracking-[0.2em] text-purple-300"
        >
          <BookOpen className="h-4 w-4" aria-hidden />
          Free resource
        </h2>
        <p className="mb-6 text-lg font-medium text-foreground/90">
          Top 50 cities to explore—curated list with quick links to full guides. No sign-up required.
        </p>
        <Link
          href="/resources/top-cities"
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-purple-400/40 bg-purple-500/20 px-6 py-3 text-sm font-bold text-foreground transition-colors hover:bg-purple-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          View the guide
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}

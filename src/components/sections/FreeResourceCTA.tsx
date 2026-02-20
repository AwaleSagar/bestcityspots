import Link from "next/link";
import { BookOpen, ArrowRight, MapPin, Star, Wallet } from "lucide-react";

const guideHighlights = [
  { icon: MapPin, text: "50 curated cities" },
  { icon: Star, text: "Top attractions" },
  { icon: Wallet, text: "Budget-friendly picks" },
] as const;

export default function FreeResourceCTA() {
  return (
    <section
      className="mx-auto max-w-3xl px-4 sm:px-6"
      aria-labelledby="free-resource-heading"
    >
      <div className="liquid-glass relative overflow-hidden rounded-2xl border border-purple-500/15 bg-gradient-to-br from-purple-500/[0.04] to-transparent p-8 text-center sm:rounded-3xl sm:p-12">
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 -z-10 h-48 w-48 rounded-full bg-purple-500/[0.06] blur-[80px]" />

        <div className="mb-3 flex items-center justify-center gap-2">
          <span className="badge-featured rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
            Free Guide
          </span>
        </div>

        <h2
          id="free-resource-heading"
          className="mb-3 text-xl font-bold tracking-tight text-foreground/90 sm:text-2xl"
        >
          Your Next Adventure Starts Here
        </h2>

        <p className="mx-auto mb-6 max-w-md text-sm leading-relaxed text-foreground/50 sm:text-base">
          50 handpicked cities with insider tips, budget planning, and quick links to full guides. No sign-up required.
        </p>

        <div className="mb-8 flex flex-wrap items-center justify-center gap-3">
          {guideHighlights.map(({ icon: Icon, text }) => (
            <div
              key={text}
              className="flex items-center gap-1.5 rounded-full border border-purple-500/15 bg-purple-500/[0.06] px-3.5 py-2 text-[11px] font-semibold tracking-wide text-purple-300/80"
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {text}
            </div>
          ))}
        </div>

        <Link
          href="/resources/top-cities"
          className="btn-primary"
        >
          <BookOpen className="h-4 w-4" aria-hidden />
          Explore the Guide
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}

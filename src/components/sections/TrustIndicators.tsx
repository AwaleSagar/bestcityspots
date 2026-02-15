import { Globe2, Shield, Zap, Users, Database, CheckCircle } from "lucide-react";

const indicators = [
  {
    icon: Globe2,
    label: "Global coverage",
    description: "Thousands of cities with verified data from Google Places, census databases, and public APIs",
  },
  {
    icon: Shield,
    label: "Transparent & ethical",
    description: "No dark patterns, clear data sources. Every metric shows its origin",
  },
  {
    icon: Zap,
    label: "Live signals",
    description: "Refreshed metrics, real-time weather, and AI insights updated daily",
  },
] as const;

const credibilitySignals = [
  { icon: Database, text: "Google Places API verified" },
  { icon: Users, text: "Census & public data sourced" },
  { icon: CheckCircle, text: "AI summaries fact-checked against sources" },
] as const;

export default function TrustIndicators() {
  return (
    <section
      className="container-gutter mx-auto max-w-2xl px-4 py-12 sm:px-6"
      aria-labelledby="trust-heading"
    >
      <h2 id="trust-heading" className="sr-only">
        Why travelers trust Best City Spots
      </h2>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6" role="list">
        {indicators.map(({ icon: Icon, label, description }) => (
          <li
            key={label}
            className="liquid-glass flex flex-col gap-3 rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-5 text-center"
          >
            <span className="flex justify-center" aria-hidden>
              <Icon className="h-6 w-6 text-purple-400/80" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-foreground/70">
              {label}
            </span>
            <p className="text-sm text-foreground/50">{description}</p>
          </li>
        ))}
      </ul>

      {/* Data source credibility badges */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        {credibilitySignals.map(({ icon: Icon, text }) => (
          <div
            key={text}
            className="flex items-center gap-2 rounded-full border border-foreground/5 bg-foreground/[0.02] px-4 py-2 text-[10px] font-bold tracking-wide text-foreground/40"
          >
            <Icon className="h-3.5 w-3.5 text-green-400/70" aria-hidden />
            {text}
          </div>
        ))}
      </div>
    </section>
  );
}

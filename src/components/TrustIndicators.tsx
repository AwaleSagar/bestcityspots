import { Globe2, Shield, Zap } from "lucide-react";

const indicators = [
  {
    icon: Globe2,
    label: "Global coverage",
    description: "Thousands of cities with verified data",
  },
  {
    icon: Shield,
    label: "Transparent & ethical",
    description: "No dark patterns, clear data sources",
  },
  {
    icon: Zap,
    label: "Live signals",
    description: "Refreshed metrics and AI insights",
  },
] as const;

export default function TrustIndicators() {
  return (
    <section
      className="mx-auto max-w-2xl px-6 py-12"
      aria-labelledby="trust-heading"
    >
      <h2 id="trust-heading" className="sr-only">
        Why travelers trust Best City Spots
      </h2>
      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-3" role="list">
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
    </section>
  );
}

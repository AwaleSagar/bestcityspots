import { Globe2, Shield, Zap, CheckCircle } from "lucide-react";

const indicators = [
  {
    icon: Globe2,
    label: "Worldwide Coverage",
    description: "Thousands of cities with verified data, so you can explore confidently—wherever your curiosity takes you.",
  },
  {
    icon: Shield,
    label: "Transparent & Ethical",
    description: "No dark patterns, no hidden agendas. Every metric shows its source, so you always know what you're reading.",
  },
  {
    icon: Zap,
    label: "Always Fresh",
    description: "Live weather, updated metrics, and AI-curated insights refreshed daily—so your plans stay current.",
  },
] as const;

const credibilitySignals = [
  { icon: CheckCircle, text: "Google Places verified" },
  { icon: CheckCircle, text: "Public data sourced" },
  { icon: CheckCircle, text: "AI insights fact-checked" },
] as const;

export default function TrustIndicators() {
  return (
    <section
      className="mx-auto max-w-3xl px-4 sm:px-6"
      aria-labelledby="trust-heading"
    >
      <h2 id="trust-heading" className="mb-2 text-center section-heading">
        Why Travelers Trust Us
      </h2>
      <p className="mb-8 text-center text-sm text-foreground/40 sm:mb-10">
        Built on verified data, designed for clarity.
      </p>
      <ul className="grid grid-cols-1 gap-5 sm:grid-cols-3 sm:gap-6" role="list">
        {indicators.map(({ icon: Icon, label, description }) => (
          <li
            key={label}
            className="liquid-glass group flex flex-col gap-4 rounded-2xl border border-foreground/[0.06] bg-foreground/[0.015] p-6 text-center transition-all duration-300 hover:border-purple-500/20 hover:shadow-lg hover:-translate-y-0.5"
          >
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/[0.08]" aria-hidden>
              <Icon className="h-5 w-5 text-purple-400" />
            </span>
            <span className="text-sm font-bold tracking-tight text-foreground/80">
              {label}
            </span>
            <p className="text-sm leading-relaxed text-foreground/45">{description}</p>
          </li>
        ))}
      </ul>

      {/* Credibility badges */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {credibilitySignals.map(({ icon: Icon, text }) => (
          <div
            key={text}
            className="flex items-center gap-1.5 rounded-full border border-foreground/[0.06] bg-foreground/[0.02] px-3.5 py-2 text-[11px] font-semibold tracking-wide text-foreground/40"
          >
            <Icon className="h-3 w-3 text-emerald-400/70" aria-hidden />
            {text}
          </div>
        ))}
      </div>
    </section>
  );
}

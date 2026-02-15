import { Lightbulb, Eye, Shield, MapPin, Wallet, Route } from "lucide-react";

const highlights = [
  {
    text: "Real metrics\u2014population, climate, air quality\u2014without sign-up walls. Compare cities side by side using verified data from Google Places and public databases.",
    label: "Open data access",
    icon: Eye,
    color: "bg-blue-500/20 text-blue-400",
  },
  {
    text: "AI-generated briefings summarize each city in seconds, covering attractions, seasons, and weather. All factual data comes from verified third-party sources.",
    label: "AI-assisted summaries",
    icon: Lightbulb,
    color: "bg-purple-500/20 text-purple-400",
  },
  {
    text: "No pop-ups, no dark patterns, no paywalls. Our About page explains exactly how we source and curate data. Every metric shows its origin.",
    label: "Transparent by design",
    icon: Shield,
    color: "bg-teal-500/20 text-teal-400",
  },
] as const;

const uniqueFeatures = [
  {
    icon: MapPin,
    title: "Hidden Local Gems",
    description: "Discover places only locals know about\u2014quiet parks, neighborhood caf\u00e9s, and offbeat landmarks beyond the tourist trail.",
  },
  {
    icon: Wallet,
    title: "Budget-Smart Planning",
    description: "Filter dining and stays by price level. See cost indicators for every recommendation so you can plan within your budget.",
  },
  {
    icon: Route,
    title: "Insider Itinerary Tips",
    description: "Get arrival timing tips, best entry points, and daily specials from our AI-curated insider knowledge for every listed spot.",
  },
] as const;

export default function TestimonialsSection() {
  return (
    <section
      className="border-t border-foreground/5 bg-foreground/[0.02] py-12 sm:py-16"
      aria-labelledby="highlights-heading"
    >
      <div className="container-gutter mx-auto max-w-4xl px-4 sm:px-6">
        <h2
          id="highlights-heading"
          className="mb-8 text-center text-sm font-black uppercase tracking-[0.2em] text-foreground/50 sm:mb-10"
        >
          How we help you explore
        </h2>
        <ul className="grid gap-6 sm:grid-cols-3 sm:gap-8" role="list">
          {highlights.map(({ text, label, icon: Icon, color }) => (
            <li
              key={label}
              className="liquid-glass flex flex-col gap-4 rounded-2xl border border-foreground/5 p-5 sm:p-6 transition-all hover:scale-[1.02]"
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${color}`}>
                  <Icon className="h-4 w-4" aria-hidden />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-foreground/70">
                  {label}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-foreground/70">
                {text}
              </p>
            </li>
          ))}
        </ul>

        {/* Unique value propositions */}
        <div className="mt-12 sm:mt-16">
          <h3 className="mb-8 text-center text-sm font-black uppercase tracking-[0.2em] text-foreground/50 sm:mb-10">
            What makes us different
          </h3>
          <ul className="grid gap-6 sm:grid-cols-3 sm:gap-8" role="list">
            {uniqueFeatures.map(({ icon: Icon, title, description }) => (
              <li
                key={title}
                className="flex flex-col gap-3 rounded-2xl border border-purple-500/10 bg-purple-500/[0.03] p-5 sm:p-6"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10">
                  <Icon className="h-5 w-5 text-purple-400" aria-hidden />
                </div>
                <span className="text-sm font-black tracking-tight text-foreground/80">
                  {title}
                </span>
                <p className="text-sm leading-relaxed text-foreground/50">
                  {description}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

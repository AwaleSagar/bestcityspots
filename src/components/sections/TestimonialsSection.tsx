import { Lightbulb, Eye, Shield, MapPin, Wallet, Route } from "lucide-react";

const highlights = [
  {
    text: "Real metrics—population, climate, air quality—without sign-up walls. Compare cities side by side with data you can trust.",
    label: "Open Data Access",
    icon: Eye,
    color: "bg-blue-500/10 text-blue-400",
  },
  {
    text: "AI-curated briefings that summarize each city in seconds—attractions, best seasons, and local weather, all from verified sources.",
    label: "Smart City Briefings",
    icon: Lightbulb,
    color: "bg-purple-500/10 text-purple-400",
  },
  {
    text: "No pop-ups, no dark patterns, no paywalls. We believe great travel tools should be honest and straightforward.",
    label: "Transparent by Design",
    icon: Shield,
    color: "bg-emerald-500/10 text-emerald-400",
  },
] as const;

const uniqueFeatures = [
  {
    icon: MapPin,
    title: "Hidden Local Gems",
    description: "Go beyond the tourist trail. Discover quiet parks, neighborhood cafés, and offbeat landmarks that only locals know about.",
  },
  {
    icon: Wallet,
    title: "Budget-Smart Planning",
    description: "See cost indicators for every recommendation. Filter by price level to plan experiences that fit your budget perfectly.",
  },
  {
    icon: Route,
    title: "Insider Itinerary Tips",
    description: "Arrival timing, best entry points, daily specials—AI-curated insider knowledge that turns a good trip into a great one.",
  },
] as const;

export default function TestimonialsSection() {
  return (
    <section
      className="rounded-3xl border border-foreground/[0.04] bg-foreground/[0.015] py-14 sm:py-20"
      aria-labelledby="highlights-heading"
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <h2
          id="highlights-heading"
          className="mb-2 text-center section-heading sm:mb-3"
        >
          How We Help You Explore
        </h2>
        <p className="mb-10 text-center text-sm text-foreground/40 sm:mb-12">
          Everything you need to plan with confidence and discover with delight.
        </p>

        <ul className="grid gap-5 sm:grid-cols-3 sm:gap-6" role="list">
          {highlights.map(({ text, label, icon: Icon, color }) => (
            <li
              key={label}
              className="liquid-glass group flex flex-col gap-4 rounded-2xl border border-foreground/[0.06] p-6 transition-all duration-300 hover:border-purple-500/15 hover:shadow-lg hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${color}`}>
                  <Icon className="h-4 w-4" aria-hidden />
                </div>
                <span className="text-sm font-bold tracking-tight text-foreground/75">
                  {label}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-foreground/45">
                {text}
              </p>
            </li>
          ))}
        </ul>

        {/* Unique value propositions */}
        <div className="mt-16 sm:mt-20">
          <h3 className="mb-2 text-center section-heading sm:mb-3">
            What Makes Us Different
          </h3>
          <p className="mb-10 text-center text-sm text-foreground/40 sm:mb-12">
            Curated, not scraped. Every recommendation is intentional.
          </p>

          <ul className="grid gap-5 sm:grid-cols-3 sm:gap-6" role="list">
            {uniqueFeatures.map(({ icon: Icon, title, description }) => (
              <li
                key={title}
                className="group flex flex-col gap-4 rounded-2xl border border-purple-500/[0.08] bg-purple-500/[0.02] p-6 transition-all duration-300 hover:border-purple-500/20 hover:shadow-lg hover:-translate-y-0.5"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-purple-500/15 bg-purple-500/[0.06] transition-colors duration-300 group-hover:bg-purple-500/10">
                  <Icon className="h-5 w-5 text-purple-400" aria-hidden />
                </div>
                <span className="text-sm font-bold tracking-tight text-foreground/80">
                  {title}
                </span>
                <p className="text-sm leading-relaxed text-foreground/45">
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

import { Activity, MapPin, Navigation, Users } from "lucide-react";

interface CityTravelEssentialsSectionProps {
  cityName: string;
  adminName: string | null;
  capital: string | null;
  population: number;
}

export default function CityTravelEssentialsSection({
  cityName,
  adminName,
  capital,
  population,
}: CityTravelEssentialsSectionProps) {
  return (
    <section className="space-y-6">
      <h2 className="labelled-rule">Travel Essentials</h2>
      <div className="flow-grid">
        {[
          {
            icon: MapPin,
            title: "Neighborhood texture",
            color: "text-[color:var(--color-cat-dining)]",
            text: adminName
              ? `Use the ${adminName} context as a starting layer, then let landmarks reveal the smaller local pockets.`
              : `Start with landmarks, then use saved notes to build a more personal read of ${cityName}.`,
          },
          {
            icon: Users,
            title: "Budget transparency",
            color: "text-[color:var(--color-brand-accent)]",
            text: capital
              ? `${cityName} reads as a capital - pricing skews higher around official quarters; lean on the Dining and Stays price filters to keep your shortlist grounded.`
              : population >= 5_000_000
                ? `Major-metro pricing varies sharply between districts in ${cityName}. The Dining and Stays price filters above keep high-interest places aligned with realistic trip spending.`
                : `Use the Dining and Stays price filters above to keep ${cityName} options grounded in realistic trip spending - useful especially when balancing landmark proximity against value.`,
          },
          {
            icon: Navigation,
            title: "On-trip handoff",
            color: "text-[color:var(--color-brand-secondary)]",
            text: `Open any listed spot in Maps for directions, then keep your personal ${cityName} shortlist in saved places.`,
          },
          {
            icon: Activity,
            title: "Source posture",
            color: "text-accent",
            text: "Google Places, public city data, weather providers, and AI-assisted summaries are labeled so the guide stays auditable.",
          },
        ].map(({ icon: ItemIcon, title, text, color }) => (
          <div key={title} className="intent-card rounded-lg p-4 sm:rounded-xl sm:p-5">
            <div className="text-muted mb-3 flex items-center gap-2 text-xs font-semibold tracking-[0.15em] uppercase">
              <ItemIcon className={`h-4 w-4 ${color}`} />
              {title}
            </div>
            <p className="text-muted text-sm leading-relaxed">{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

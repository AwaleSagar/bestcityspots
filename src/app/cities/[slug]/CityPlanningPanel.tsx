import Link from "next/link";

interface CityPlanningPanelProps {
  cityName: string;
  className?: string;
}

export default function CityPlanningPanel({ cityName, className }: CityPlanningPanelProps) {
  return (
    <div className={className}>
      <h3 className="text-foreground text-xl leading-tight font-bold tracking-[-0.02em] sm:text-2xl md:text-3xl">
        Plan Your <br className="hidden md:block" /> {cityName} Trip
      </h3>
      <p className="text-muted text-sm leading-relaxed">
        Explore AI-powered briefings, live weather data, budget filters, and curated local
        experiences. Save your favorite spots to build a personal itinerary - all free, no sign-up
        required.
      </p>
      <Link href="/resources/top-cities" className="btn-primary w-full">
        Browse Free City Guide
      </Link>
    </div>
  );
}

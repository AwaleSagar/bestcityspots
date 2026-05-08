import { getCityInsight } from "@/lib/intelligence";
import { City } from "@/lib/cities";
import AIBriefingClient from "./AIBriefingClient";

interface AIBriefingSectionProps {
  city: City;
}

export default async function AIBriefingSection({ city }: AIBriefingSectionProps) {
  const aiInsight = await getCityInsight(city);

  if (!aiInsight) {
    return (
      <section className="atlas-panel rounded-[1.4rem] p-6 sm:rounded-[1.7rem] md:rounded-[2rem]">
        <h2 className="labelled-rule">AI City Briefing</h2>
        <p className="text-muted-strong mt-3 text-sm font-semibold tracking-wide">
          AI briefing is unavailable for this city right now.
        </p>
      </section>
    );
  }

  return <AIBriefingClient insight={aiInsight} />;
}

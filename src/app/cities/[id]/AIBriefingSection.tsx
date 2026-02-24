import { getCityInsight } from "@/lib/intelligence";
import { City } from "@/lib/cities";
import AIBriefingClient from "./AIBriefingClient";

interface AIBriefingSectionProps {
  city: City;
}

export default async function AIBriefingSection({ city }: AIBriefingSectionProps) {
  const aiInsight = await getCityInsight(city);

  if (!aiInsight) {
    return null;
  }

  return <AIBriefingClient insight={aiInsight} />;
}

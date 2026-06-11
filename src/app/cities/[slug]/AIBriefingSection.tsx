import { readCachedCityInsight } from "@/lib/intelligence";
import { City } from "@/lib/cities";
import AIBriefingClient from "./AIBriefingClient";
import AIBriefingStreamClient from "./AIBriefingStreamClient";

interface AIBriefingSectionProps {
  city: City;
}

/**
 * Renders the AI briefing card.
 *
 *  - Cache hit (fresh + version-matched): server-render the final insight
 *    with `AIBriefingClient`. Zero client streaming overhead.
 *  - Cache miss / stale: hand the cityId to the client streaming component
 *    so the user sees tokens as Gemini emits them, instead of waiting for
 *    the full payload to arrive.
 */
export default async function AIBriefingSection({ city }: AIBriefingSectionProps) {
  const { insight, fresh, updatedAt } = await readCachedCityInsight(city.id);

  if (fresh && insight) {
    // US-11: surface the generation date next to the existing AI label.
    return <AIBriefingClient insight={insight} generatedAt={updatedAt} />;
  }

  return <AIBriefingStreamClient cityId={city.id} initialInsight={insight} />;
}

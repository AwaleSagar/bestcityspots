import { MessageCircleQuestion } from "lucide-react";
import type { City } from "@/lib/cities";
import { readCachedCityInsight } from "@/lib/intelligence";
import { getCityMetrics } from "@/lib/metrics";
import { buildFaqs } from "./CityFAQSection";

/**
 * Anticipatory briefing chips (innovation proposal Idea 7): the questions a
 * reader asks *after* scanning the briefing, answered inline from the same
 * cached FAQ source — conversational feel with zero request-time AI spend
 * and zero JS (<details> disclosure). The full FAQ block further down keeps
 * its JSON-LD role; these chips are a fast-path duplicate of the top three.
 */
export default async function BriefingChips({ city }: { city: City }) {
  const [insight, metrics] = await Promise.all([
    readCachedCityInsight(city.id)
      .then((read) => read.insight)
      .catch(() => null),
    getCityMetrics(city).catch(() => null),
  ]);

  const faqs = buildFaqs(city, insight?.intro?.trim() ?? null, metrics?.climate_comfort ?? null);
  // Best time to visit, tap water, visa — the three highest-intent follow-ups.
  const picks = [faqs.at(0), faqs.at(4), faqs.at(5)].filter((faq): faq is NonNullable<typeof faq> =>
    Boolean(faq)
  );
  if (picks.length === 0) return null;

  return (
    <div className="mt-6">
      <p className="text-muted mb-3 flex items-center gap-2 text-xs font-semibold tracking-[0.2em] uppercase">
        <MessageCircleQuestion className="text-accent h-3.5 w-3.5" aria-hidden />
        Still wondering
      </p>
      <div className="space-y-2">
        {picks.map((faq) => (
          <details key={faq.q} className="briefing-chip group">
            <summary className="briefing-chip-summary">{faq.q}</summary>
            <p className="text-muted px-4 pt-1 pb-4 text-sm leading-relaxed">{faq.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}

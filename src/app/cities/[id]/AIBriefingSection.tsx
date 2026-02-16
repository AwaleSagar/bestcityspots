import { getCityInsight } from "@/lib/intelligence";
import { City } from "@/lib/cities";
import {
  Sparkles,
  CalendarRange,
  ThumbsUp,
  ThumbsDown,
  Users,
  Wallet,
  Shield,
  CalendarCheck,
  CalendarX,
} from "lucide-react";

interface AIBriefingSectionProps {
  city: City;
}

export default async function AIBriefingSection({ city }: AIBriefingSectionProps) {
  const aiInsight = await getCityInsight(city);

  if (!aiInsight) {
    return null;
  }

  return (
    <section className="space-y-6 rounded-[2.5rem] border border-foreground/5 bg-foreground/[0.02] p-6 md:rounded-[3rem] md:p-10 shadow-2xl">
      <div className="flex items-center gap-3 text-xs font-black tracking-[0.3em] text-purple-300 uppercase">
        <Sparkles className="h-4 w-4 text-purple-300" />
        AI City Briefing
      </div>
      <p className="text-base md:text-lg leading-loose text-foreground/80">{aiInsight.intro}</p>

      {/* Best For badges */}
      {aiInsight.bestFor && aiInsight.bestFor.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-foreground/50">
            <Users className="h-4 w-4 text-purple-300" />
            Best for
          </div>
          <div className="flex flex-wrap gap-2">
            {aiInsight.bestFor.map((audience, idx) => (
              <span
                key={idx}
                className="rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-[11px] font-bold text-purple-300"
              >
                {audience}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Best & Avoid Months */}
      {(aiInsight.bestMonths || aiInsight.avoidMonths) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {aiInsight.bestMonths && (
            <div className="rounded-2xl border border-green-500/15 bg-green-500/5 p-4 text-sm">
              <div className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-green-400/80">
                <CalendarCheck className="h-4 w-4" />
                Best months to visit
              </div>
              <div className="text-foreground/70">{aiInsight.bestMonths}</div>
            </div>
          )}
          {aiInsight.avoidMonths && (
            <div className="rounded-2xl border border-orange-500/15 bg-orange-500/5 p-4 text-sm">
              <div className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-orange-400/80">
                <CalendarX className="h-4 w-4" />
                Consider avoiding
              </div>
              <div className="text-foreground/70">{aiInsight.avoidMonths}</div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-foreground/50">
            Major attractions
          </div>
          <div className="space-y-3">
            {aiInsight.attractions.map((a, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-4 text-sm text-foreground/80"
              >
                <div className="text-foreground font-black">{a.name}</div>
                <div className="mt-1 text-foreground/60 leading-loose">{a.why}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-foreground/50">
            <CalendarRange className="h-4 w-4 text-purple-300" />
            Seasons
          </div>
          <div className="space-y-3">
            {aiInsight.seasons.map((s, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-4 text-sm text-foreground/80"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-foreground">
                  <span className="font-black">{s.name}</span>
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/40">
                    {s.months}
                  </span>
                </div>
                <div className="mt-2 text-foreground/60 leading-loose">{s.summary}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-foreground/50">
            Year-round weather
          </div>
          <div className="space-y-3">
            {aiInsight.weather.map((w, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-4 text-sm text-foreground/80"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-foreground">
                  <span className="font-black">{w.season}</span>
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-purple-300">
                    {w.tempC}
                  </span>
                </div>
                <div className="mt-2 text-foreground/60 leading-loose">{w.notes}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pros & Cons Section */}
      {aiInsight.prosCons && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-green-500/15 bg-green-500/5 p-5">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-green-400/80">
              <ThumbsUp className="h-4 w-4" />
              Pros
            </div>
            <ul className="space-y-2 text-sm text-foreground/70">
              {aiInsight.prosCons.pros.map((pro, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-400/60" />
                  {pro}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-red-500/15 bg-red-500/5 p-5">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-red-400/80">
              <ThumbsDown className="h-4 w-4" />
              Cons
            </div>
            <ul className="space-y-2 text-sm text-foreground/70">
              {aiInsight.prosCons.cons.map((con, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-400/60" />
                  {con}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Budget Ranges */}
      {aiInsight.budget && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-foreground/50">
            <Wallet className="h-4 w-4 text-purple-300" />
            Daily budget estimate ({aiInsight.budget.currency})
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-4 text-center">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">
                Backpacker
              </div>
              <div className="mt-1 text-lg font-black text-foreground/80">
                {aiInsight.budget.backpacker}
              </div>
            </div>
            <div className="rounded-2xl border border-purple-500/15 bg-purple-500/5 p-4 text-center">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-300/70">
                Mid-range
              </div>
              <div className="mt-1 text-lg font-black text-foreground/80">
                {aiInsight.budget.midRange}
              </div>
            </div>
            <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-4 text-center">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">
                Luxury
              </div>
              <div className="mt-1 text-lg font-black text-foreground/80">
                {aiInsight.budget.luxury}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Safety Info */}
      {aiInsight.safety && (
        <div className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-5">
          <div className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-foreground/50">
            <Shield className="h-4 w-4 text-purple-300" />
            Safety &amp; tips
            <span className="ml-auto rounded-full border border-foreground/10 bg-foreground/[0.03] px-3 py-0.5 text-[10px] font-bold text-foreground/60">
              {aiInsight.safety.rating}
            </span>
          </div>
          <ul className="space-y-2 text-sm text-foreground/70">
            {aiInsight.safety.tips.map((tip, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-400/60" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-foreground/5 pt-4">
        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-foreground/30">
          Source: AI-generated via Google Gemini · Verified against public data
        </div>
      </div>
    </section>
  );
}

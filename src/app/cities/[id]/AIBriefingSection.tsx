import { getCityInsight } from "@/lib/intelligence";
import { City } from "@/lib/cities";
import { Sparkles, CalendarRange } from "lucide-react";

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
    </section>
  );
}

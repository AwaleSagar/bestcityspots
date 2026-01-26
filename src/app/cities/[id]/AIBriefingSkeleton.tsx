import { Sparkles, CalendarRange } from "lucide-react";

export default function AIBriefingSkeleton() {
  return (
    <section className="space-y-6 rounded-[2.5rem] border border-foreground/5 bg-foreground/[0.02] p-6 md:rounded-[3rem] md:p-10 shadow-2xl">
      <div className="flex items-center gap-3 text-xs font-black tracking-[0.3em] text-blue-300 uppercase">
        <Sparkles className="h-4 w-4 text-blue-300 animate-pulse" />
        <span className="animate-pulse">AI City Briefing</span>
        <span className="ml-auto text-[10px] font-black tracking-[0.2em] text-blue-400/60 uppercase animate-pulse">
          Generating...
        </span>
      </div>
      
      {/* Intro skeleton */}
      <div className="space-y-3">
        <div className="h-4 w-full bg-foreground/5 rounded animate-pulse" />
        <div className="h-4 w-5/6 bg-foreground/5 rounded animate-pulse" />
        <div className="h-4 w-4/6 bg-foreground/5 rounded animate-pulse" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Attractions skeleton */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-foreground/50">
            Major attractions
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-4 space-y-2"
              >
                <div className="h-4 w-3/4 bg-foreground/5 rounded animate-pulse" />
                <div className="h-3 w-full bg-foreground/5 rounded animate-pulse" />
                <div className="h-3 w-5/6 bg-foreground/5 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Seasons skeleton */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-foreground/50">
            <CalendarRange className="h-4 w-4 text-blue-300" />
            Seasons
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="h-4 w-20 bg-foreground/5 rounded animate-pulse" />
                  <div className="h-3 w-16 bg-foreground/5 rounded animate-pulse" />
                </div>
                <div className="h-3 w-full bg-foreground/5 rounded animate-pulse" />
                <div className="h-3 w-4/5 bg-foreground/5 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Weather skeleton */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-foreground/50">
            Year-round weather
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-foreground/5 bg-foreground/[0.02] p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="h-4 w-20 bg-foreground/5 rounded animate-pulse" />
                  <div className="h-3 w-16 bg-foreground/5 rounded animate-pulse" />
                </div>
                <div className="h-3 w-full bg-foreground/5 rounded animate-pulse" />
                <div className="h-3 w-5/6 bg-foreground/5 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

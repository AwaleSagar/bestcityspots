import { Sparkles, Eye, Compass, CalendarRange } from "lucide-react";

export default function AIBriefingSkeleton() {
  return (
    <section className="space-y-8">
      {/* Section Heading */}
      <div className="space-y-3">
        <h2 className="flex items-center gap-4 text-sm font-black tracking-[0.4em] text-foreground/40 uppercase">
          <Sparkles className="h-4 w-4 text-purple-400 animate-pulse" />
          <span className="animate-pulse">AI City Briefing</span>
          <span className="h-px flex-1 bg-foreground/5" />
          <span className="text-[10px] font-black tracking-[0.2em] text-purple-400/60 uppercase animate-pulse">
            Generating...
          </span>
        </h2>
        <div className="h-3 w-80 max-w-full bg-foreground/5 rounded animate-pulse" />
      </div>

      {/* Tab Switcher Skeleton */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl md:rounded-[1.5rem] bg-foreground/[0.02] border border-foreground/5 w-fit">
        {[
          { icon: Eye, label: "Overview" },
          { icon: Compass, label: "Top Spots" },
          { icon: CalendarRange, label: "When to Visit" },
        ].map((tab, idx) => {
          const Icon = tab.icon;
          return (
            <div
              key={idx}
              className={`flex items-center gap-2 md:gap-2.5 px-4 md:px-5 py-2.5 md:py-3 rounded-xl md:rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-[0.1em] ${
                idx === 0
                  ? "bg-purple-500/10 border border-purple-500/20 text-foreground"
                  : "text-foreground/30"
              }`}
            >
              <Icon
                className={`w-3.5 h-3.5 md:w-4 md:h-4 ${
                  idx === 0 ? "text-purple-400" : "text-foreground/20"
                }`}
              />
              <span>{tab.label}</span>
            </div>
          );
        })}
      </div>

      {/* Content Skeleton — Overview card */}
      <div className="liquid-glass rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-10 shadow-2xl space-y-4">
        <div className="h-4 w-full bg-foreground/5 rounded animate-pulse" />
        <div className="h-4 w-5/6 bg-foreground/5 rounded animate-pulse" />
        <div className="h-4 w-4/6 bg-foreground/5 rounded animate-pulse" />
        <div className="h-4 w-3/5 bg-foreground/5 rounded animate-pulse" />
        <div className="mt-6 flex items-center gap-2 border-t border-foreground/5 pt-5">
          <div className="h-1.5 w-1.5 rounded-full bg-purple-400/50 animate-pulse" />
          <div className="h-2 w-56 bg-foreground/5 rounded animate-pulse" />
        </div>
      </div>
    </section>
  );
}

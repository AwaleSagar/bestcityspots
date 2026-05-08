import { Sparkles, Eye, Compass, CalendarRange } from "lucide-react";

export default function AIBriefingSkeleton() {
  return (
    <section className="space-y-8">
      {/* Section Heading */}
      <div className="space-y-3">
        <h2 className="labelled-rule">
          <Sparkles className="text-accent h-4 w-4 animate-pulse" />
          <span className="animate-pulse">AI City Briefing</span>
          <span className="text-accent/70 animate-pulse text-[10px] font-black tracking-[0.2em] uppercase">
            Generating...
          </span>
        </h2>
        <div className="bg-foreground/5 h-3 w-80 max-w-full animate-pulse rounded" />
      </div>

      {/* Tab Switcher Skeleton */}
      <div className="border-line bg-background/55 flex w-fit flex-wrap items-center gap-1.5 rounded-2xl border p-1.5 md:rounded-[1.5rem]">
        {[
          { icon: Eye, label: "Overview" },
          { icon: Compass, label: "Top Spots" },
          { icon: CalendarRange, label: "When to Visit" },
        ].map((tab, idx) => {
          const Icon = tab.icon;
          return (
            <div
              key={idx}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-[10px] font-black tracking-[0.1em] uppercase md:gap-2.5 md:rounded-2xl md:px-5 md:py-3 md:text-[11px] ${
                idx === 0
                  ? "border-accent/20 bg-accent-soft text-foreground border"
                  : "text-foreground/30"
              }`}
            >
              <Icon
                className={`h-3.5 w-3.5 md:h-4 md:w-4 ${
                  idx === 0 ? "text-accent" : "text-foreground/20"
                }`}
              />
              <span>{tab.label}</span>
            </div>
          );
        })}
      </div>

      {/* Content Skeleton — Overview card */}
      <div className="atlas-panel space-y-4 rounded-[2.5rem] p-8 shadow-2xl md:rounded-[3rem] md:p-10">
        <div className="bg-foreground/5 h-4 w-full animate-pulse rounded" />
        <div className="bg-foreground/5 h-4 w-5/6 animate-pulse rounded" />
        <div className="bg-foreground/5 h-4 w-4/6 animate-pulse rounded" />
        <div className="bg-foreground/5 h-4 w-3/5 animate-pulse rounded" />
        <div className="border-line mt-6 flex items-center gap-2 border-t pt-5">
          <div className="bg-accent h-1.5 w-1.5 animate-pulse rounded-full" />
          <div className="bg-foreground/5 h-2 w-56 animate-pulse rounded" />
        </div>
      </div>
    </section>
  );
}

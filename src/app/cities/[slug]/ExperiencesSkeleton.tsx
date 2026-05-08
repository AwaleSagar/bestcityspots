import { Ticket, Utensils, Hotel, Compass, Star } from "lucide-react";

// Shimmer animation component
function Shimmer() {
  return (
    <div className="via-foreground/5 absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent to-transparent" />
  );
}

// Skeleton for a single experience card
function ExperienceCardSkeleton({ isFeatured }: { isFeatured: boolean }) {
  return (
    <div
      className={`liquid-glass overflow-hidden rounded-2xl md:rounded-[2rem] ${isFeatured ? "md:col-span-2" : ""}`}
    >
      {/* Image skeleton with overlaid elements */}
      <div
        className={`bg-foreground/[0.03] relative w-full overflow-hidden ${isFeatured ? "h-52 md:h-72" : "h-40 md:h-48"}`}
      >
        <Shimmer />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        {/* Rating badge skeleton */}
        <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/50 px-3 py-1.5 backdrop-blur-md">
          <Star className="h-3.5 w-3.5 text-white/20" />
          <div className="relative h-4 w-6 overflow-hidden rounded bg-white/10">
            <Shimmer />
          </div>
        </div>
        {/* Title overlay skeleton */}
        <div className="absolute right-0 bottom-0 left-0 z-30 p-4 md:p-6">
          <div className="mb-1.5 flex items-center gap-2">
            <div className="relative h-5 w-20 overflow-hidden rounded-md bg-orange-500/20">
              <Shimmer />
            </div>
            <div className="relative h-3 w-24 overflow-hidden rounded bg-white/10">
              <Shimmer />
            </div>
          </div>
          <div
            className={`relative overflow-hidden rounded-lg bg-white/10 ${isFeatured ? "h-7 w-56" : "h-6 w-44"}`}
          >
            <Shimmer />
          </div>
        </div>
      </div>

      {/* Card body skeleton */}
      <div className="flex flex-col gap-4 px-5 pt-4 pb-5 md:px-6 md:pb-6">
        {/* Pulse tags skeleton */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-foreground/[0.03] relative h-6 w-28 overflow-hidden rounded-full">
            <Shimmer />
          </div>
          <div className="bg-foreground/[0.03] relative h-6 w-24 overflow-hidden rounded-full">
            <Shimmer />
          </div>
          <div className="bg-foreground/[0.03] relative ml-auto h-3 w-16 overflow-hidden rounded">
            <Shimmer />
          </div>
        </div>

        {/* Insider tips skeleton */}
        <div className="border-line bg-background/45 rounded-xl border p-3.5">
          <div className="mb-2 flex items-center gap-1.5">
            <Compass className="text-accent/40 h-3 w-3" />
            <div className="bg-accent/10 relative h-2 w-14 overflow-hidden rounded">
              <Shimmer />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="bg-foreground/[0.02] relative h-3 w-full overflow-hidden rounded">
              <Shimmer />
            </div>
            <div className="bg-foreground/[0.02] relative h-3 w-3/4 overflow-hidden rounded">
              <Shimmer />
            </div>
          </div>
        </div>

        {/* Action buttons skeleton */}
        <div className="flex flex-wrap gap-2 pt-1">
          <div className="relative h-9 w-24 overflow-hidden rounded-xl bg-blue-500/8">
            <Shimmer />
          </div>
          <div className="bg-foreground/[0.03] relative h-9 w-20 overflow-hidden rounded-xl">
            <Shimmer />
          </div>
          <div className="bg-foreground/[0.03] relative h-9 w-24 overflow-hidden rounded-xl">
            <Shimmer />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ExperiencesSkeleton() {
  const tabs = [
    { id: "landmarks", label: "Landmarks", icon: Ticket },
    { id: "restaurants", label: "Dining", icon: Utensils },
    { id: "hotels", label: "Stays", icon: Hotel },
  ];

  return (
    <div className="space-y-10">
      {/* Header skeleton */}
      <div className="space-y-3">
        <div className="flex items-center gap-4">
          <div className="bg-foreground/[0.05] relative h-4 w-40 overflow-hidden rounded">
            <Shimmer />
          </div>
          <div className="bg-foreground/5 h-px flex-1" />
        </div>
        <div className="bg-foreground/[0.03] relative h-4 w-72 overflow-hidden rounded">
          <Shimmer />
        </div>
      </div>

      <div className="space-y-8">
        {/* Tab switcher skeleton */}
        <div className="flex flex-col gap-4">
          <div className="border-line bg-background/55 flex w-fit flex-wrap items-center gap-1.5 rounded-2xl border p-1.5 md:rounded-[1.5rem]">
            {tabs.map((tab, index) => {
              const Icon = tab.icon;
              const isFirst = index === 0;
              return (
                <div
                  key={tab.id}
                  className={`relative flex items-center gap-2 rounded-xl px-4 py-2.5 md:gap-2.5 md:rounded-2xl md:px-5 md:py-3 ${
                    isFirst ? "border-accent/20 bg-accent-soft border" : ""
                  }`}
                >
                  <Icon
                    className={`h-3.5 w-3.5 md:h-4 md:w-4 ${
                      isFirst ? "text-accent" : "text-foreground/20"
                    }`}
                  />
                  <span
                    className={`text-[11px] font-black tracking-[0.1em] uppercase ${
                      isFirst ? "text-foreground" : "text-foreground/30"
                    }`}
                  >
                    {tab.label}
                  </span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[11px] font-black ${
                      isFirst ? "bg-accent/15 text-accent" : "bg-foreground/5 text-foreground/25"
                    }`}
                  >
                    ···
                  </span>
                </div>
              );
            })}
          </div>

          {/* Saved places skeleton */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="border-foreground/5 bg-foreground/[0.02] flex items-center gap-2 rounded-xl border px-3.5 py-2">
              <div className="bg-accent/20 relative h-3.5 w-3.5 overflow-hidden rounded">
                <Shimmer />
              </div>
              <div className="bg-foreground/[0.05] relative h-3 w-24 overflow-hidden rounded">
                <Shimmer />
              </div>
            </div>
          </div>
        </div>

        {/* Loading indicator */}
        <div className="flex items-center justify-center gap-3 py-4">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="bg-accent h-1.5 w-1.5 animate-pulse rounded-full"
                style={{ animationDelay: `${i * 160}ms` }}
              />
            ))}
          </div>
          <span className="text-foreground/40 text-[11px] font-black tracking-[0.2em] uppercase">
            Discovering experiences...
          </span>
        </div>

        {/* Cards skeleton — featured + grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
          {[0, 1, 2].map((index) => (
            <ExperienceCardSkeleton key={index} isFeatured={index === 0} />
          ))}
        </div>
      </div>
    </div>
  );
}

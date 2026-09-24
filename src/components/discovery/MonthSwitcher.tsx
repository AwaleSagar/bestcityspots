import Link from "next/link";
import { listMonthSlugs, monthLabel, type MonthSlug } from "@/lib/topical-hubs";
import { cn } from "@/components/ui/cn";

/** Jump between the twelve month guides. */
export function MonthSwitcher({ current }: { current?: MonthSlug }) {
  return (
    <nav aria-label="Months">
      <ul className="scroll-x -mx-1 flex gap-1.5 px-1 sm:flex-wrap">
        {listMonthSlugs().map((slug) => {
          const active = slug === current;
          return (
            <li key={slug} className="shrink-0">
              <Link
                href={`/best-cities-to-visit-in/${slug}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "ease-standard inline-flex h-9 items-center rounded-full border px-3.5 text-sm transition-colors duration-150 pointer-coarse:h-11",
                  active
                    ? "border-ink bg-ink text-paper"
                    : "border-rule bg-surface hover:border-rule-strong hover:text-accent"
                )}
              >
                {monthLabel(slug).slice(0, 3)}
                <span className="sr-only">{monthLabel(slug).slice(3)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

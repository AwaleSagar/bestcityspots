import type { ReactNode } from "react";
import { cn } from "./cn";

export type BadgeTone = "neutral" | "accent" | "highlight" | "outline";

const TONES = new Map<BadgeTone, string>([
  ["neutral", "bg-sunken text-ink-muted"],
  ["accent", "bg-accent-soft text-accent"],
  ["highlight", "bg-highlight/25 text-highlight-ink"],
  ["outline", "border border-rule-strong text-ink-muted"],
]);

interface BadgeProps {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}

export function Badge({ tone = "neutral", className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap [&_svg]:size-3.5",
        TONES.get(tone),
        className
      )}
    >
      {children}
    </span>
  );
}

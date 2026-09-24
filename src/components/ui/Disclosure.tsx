import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import { cn } from "./cn";

interface DisclosureProps {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

/** Native <details> disclosure — works without JavaScript. */
export function Disclosure({ summary, children, defaultOpen, className }: DisclosureProps) {
  return (
    <details open={defaultOpen} className={cn("group border-rule border-b", className)}>
      <summary className="hover:text-accent flex min-h-11 list-none items-center justify-between gap-4 py-4 font-medium">
        <span>{summary}</span>
        <Plus
          aria-hidden
          className="text-ink-muted ease-standard size-4 shrink-0 transition-transform duration-200 group-open:rotate-45"
        />
      </summary>
      <div className="text-ink-muted pb-5">{children}</div>
    </details>
  );
}

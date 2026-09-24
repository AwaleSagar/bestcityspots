import type { ReactNode } from "react";
import { cn } from "./cn";

interface SectionProps {
  id: string;
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * The one section pattern used across the site: a serif heading over a
 * hairline rule, optional supporting line and trailing actions, then content.
 * `scroll-mt` keeps in-page anchors clear of the sticky header + section nav.
 */
export function Section({
  id,
  title,
  eyebrow,
  description,
  actions,
  className,
  children,
}: SectionProps) {
  const titleId = `${id}-title`;
  return (
    <section id={id} aria-labelledby={titleId} className={cn("scroll-mt-14", className)}>
      <div className="border-rule flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b pb-4">
        <div className="max-w-2xl">
          {eyebrow ? <p className="text-ink-muted mb-1.5 text-sm">{eyebrow}</p> : null}
          <h2 id={titleId} className="text-h2">
            {title}
          </h2>
          {description ? <p className="text-ink-muted mt-2">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

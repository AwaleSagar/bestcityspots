import type { ReactNode } from "react";
import { Breadcrumbs, type BreadcrumbItem } from "./Breadcrumbs";
import { cn } from "./cn";

interface PageHeaderProps {
  title: ReactNode;
  eyebrow?: ReactNode;
  lede?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  /** Extra content under the lede (stats, filters). */
  children?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  eyebrow,
  lede,
  breadcrumbs,
  actions,
  children,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("border-rule border-b pt-8 pb-8 sm:pt-12 sm:pb-10", className)}>
      {breadcrumbs ? (
        <div className="mb-6">
          <Breadcrumbs items={breadcrumbs} />
        </div>
      ) : null}
      {eyebrow ? <p className="text-accent mb-3 text-sm font-medium">{eyebrow}</p> : null}
      <h1 className="text-h1 max-w-4xl">{title}</h1>
      {lede ? <p className="text-lede text-ink-muted mt-4 max-w-2xl">{lede}</p> : null}
      {actions ? <div className="mt-6 flex flex-wrap items-center gap-3">{actions}</div> : null}
      {children ? <div className="mt-8">{children}</div> : null}
    </header>
  );
}

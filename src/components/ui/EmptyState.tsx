import type { ReactNode } from "react";
import { cn } from "./cn";

interface EmptyStateProps {
  icon?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, children, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "border-rule-strong flex flex-col items-center rounded-md border border-dashed px-6 py-10 text-center",
        className
      )}
    >
      {icon ? <div className="text-ink-subtle mb-3 [&_svg]:size-6">{icon}</div> : null}
      <p className="font-medium">{title}</p>
      {children ? <div className="text-ink-muted mt-1.5 max-w-md text-sm">{children}</div> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

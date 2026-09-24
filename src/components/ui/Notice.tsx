import type { ReactNode } from "react";
import { Info, TriangleAlert } from "lucide-react";
import { cn } from "./cn";

interface NoticeProps {
  tone?: "info" | "warning";
  title?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Announce to assistive tech when it appears after load. */
  live?: boolean;
}

export function Notice({ tone = "info", title, children, className, live }: NoticeProps) {
  const Icon = tone === "warning" ? TriangleAlert : Info;
  return (
    <div
      role={live ? "status" : undefined}
      className={cn(
        "flex gap-3 rounded-md border p-4 text-sm",
        tone === "warning" ? "border-danger/30 bg-danger-soft" : "border-rule bg-sunken",
        className
      )}
    >
      <Icon
        aria-hidden
        className={cn(
          "mt-0.5 size-4 shrink-0",
          tone === "warning" ? "text-danger" : "text-ink-muted"
        )}
      />
      <div>
        {title ? <p className="font-medium">{title}</p> : null}
        <div className={cn(title ? "mt-0.5" : undefined, "text-ink-muted")}>{children}</div>
      </div>
    </div>
  );
}

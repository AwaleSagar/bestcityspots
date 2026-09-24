import type { ReactNode } from "react";
import { cn } from "./cn";

interface ContainerProps {
  className?: string;
  children: ReactNode;
}

/** Page-width wrapper with the site's responsive gutters (16 / 24 / 32px). */
export function Container({ className, children }: ContainerProps) {
  return (
    <div className={cn("max-w-page mx-auto w-full px-4 sm:px-6 lg:px-8", className)}>
      {children}
    </div>
  );
}

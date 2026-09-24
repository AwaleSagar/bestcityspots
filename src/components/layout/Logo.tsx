import { cn } from "@/components/ui/cn";

/**
 * Brand mark: a globe reduced to one meridian and the equator, with the
 * "spot" marked in harbor blue. Mirrors src/app/icon.svg and public/logo.svg.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-7 shrink-0", className)} fill="none">
      <circle cx="16" cy="16" r="12.25" stroke="currentColor" strokeWidth="1.5" />
      <ellipse cx="16" cy="16" rx="5.25" ry="12.25" stroke="currentColor" strokeWidth="1.25" />
      <path d="M3.75 16h24.5" stroke="currentColor" strokeWidth="1.25" />
      <circle
        cx="21.25"
        cy="10.5"
        r="3.25"
        className="fill-accent"
        stroke="var(--paper)"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="font-display text-xl leading-none font-medium tracking-tight whitespace-nowrap">
        Best City Spots
      </span>
    </span>
  );
}

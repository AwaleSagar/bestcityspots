import type { ReactNode } from "react";
import { cn } from "./cn";

export interface SpecRow {
  key: string;
  label: ReactNode;
  value: ReactNode;
  /** Provenance or context line, e.g. "Open-Meteo". */
  note?: ReactNode;
}

/** Label/value "spec sheet" rows with tabular numerals and hairline rules. */
export function SpecList({ rows, className }: { rows: SpecRow[]; className?: string }) {
  return (
    <dl className={cn("divide-rule divide-y", className)}>
      {rows.map((row) => (
        <div key={row.key} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-0.5 py-3">
          <dt className="text-ink-muted text-sm">{row.label}</dt>
          <dd className="text-right font-medium tabular-nums">{row.value}</dd>
          {row.note ? <dd className="text-ink-muted col-span-2 text-xs">{row.note}</dd> : null}
        </div>
      ))}
    </dl>
  );
}

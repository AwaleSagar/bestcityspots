"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "./cn";

export interface TabItem<T extends string> {
  id: T;
  label: ReactNode;
  count?: number;
  icon?: ReactNode;
}

interface TabsProps<T extends string> {
  items: readonly TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Prefix for tab/panel ids; the panel must use `${idPrefix}-panel`. */
  idPrefix: string;
  label: string;
  className?: string;
}

export function tabId(idPrefix: string, id: string) {
  return `${idPrefix}-tab-${id}`;
}

/**
 * WAI-ARIA tabs with automatic activation: arrow keys / Home / End move
 * focus and selection together; only the active tab is in the tab order.
 */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  idPrefix,
  label,
  className,
}: TabsProps<T>) {
  const listRef = useRef<HTMLDivElement>(null);

  const focusTab = (index: number) => {
    const next = items.at((index + items.length) % items.length);
    if (!next) return;
    onChange(next.id);
    listRef.current
      ?.querySelector<HTMLButtonElement>(`#${CSS.escape(tabId(idPrefix, next.id))}`)
      ?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = items.findIndex((item) => item.id === value);
    if (event.key === "ArrowRight") focusTab(current + 1);
    else if (event.key === "ArrowLeft") focusTab(current - 1);
    else if (event.key === "Home") focusTab(0);
    else if (event.key === "End") focusTab(items.length - 1);
    else return;
    event.preventDefault();
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn("scroll-x border-rule flex gap-1 border-b", className)}
    >
      {items.map((item) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            id={tabId(idPrefix, item.id)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.id)}
            className={cn(
              "ease-standard -mb-px inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-medium transition-colors duration-150 [&_svg]:size-4",
              selected
                ? "border-accent text-ink"
                : "text-ink-muted hover:border-rule-strong hover:text-ink border-transparent"
            )}
          >
            {item.icon}
            {item.label}
            {typeof item.count === "number" ? (
              <span className="bg-sunken text-ink-muted rounded-full px-1.5 text-xs tabular-nums">
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

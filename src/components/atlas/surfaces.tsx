import * as React from "react";
import Link from "next/link";
import { cx } from "./cx";

/* ────────────────────────────────────────────────────────────
   Surfaces
   ──────────────────────────────────────────────────────────── */

export type CardVariant = "plain" | "outline" | "raised" | "image";

export function Card({
  variant = "outline",
  className,
  children,
  ...rest
}: {
  variant?: CardVariant;
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  const base = "relative rounded-[var(--radius-lg)]";
  const skin =
    variant === "plain"
      ? "bg-transparent"
      : variant === "raised"
        ? "bg-[color:var(--color-surface)] border border-[color:var(--color-line)] shadow-[var(--shadow-md)]"
        : variant === "image"
          ? "overflow-hidden bg-[color:var(--color-surface-muted)]"
          : "bg-[color:var(--color-surface)] border border-[color:var(--color-line)]";
  return (
    <div className={cx(base, skin, className)} {...rest}>
      {children}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Buttons & links
   ──────────────────────────────────────────────────────────── */

export type ButtonVariant = "primary" | "secondary" | "ghost" | "accent";
export type ButtonSize = "sm" | "md" | "lg";

const buttonBase =
  "inline-flex items-center justify-center gap-2 font-semibold rounded-[var(--radius-md)] " +
  "transition-[background-color,color,border-color,box-shadow] duration-[var(--duration-base)] ease-[var(--ease-out)] " +
  "disabled:opacity-50 disabled:cursor-not-allowed select-none";

function buttonClasses(variant: ButtonVariant, size: ButtonSize) {
  const sz =
    size === "sm"
      ? "h-9 px-3 text-sm"
      : size === "lg"
        ? "h-12 px-6 text-[0.95rem]"
        : "h-11 px-4 text-sm min-w-[var(--touch-target-min)]";
  const skin =
    variant === "primary"
      ? "bg-[color:var(--color-foreground)] text-[color:var(--color-background)] hover:opacity-90"
      : variant === "accent"
        ? "bg-[color:var(--color-accent)] text-[color:var(--color-accent-contrast)] hover:bg-[color:var(--color-accent-strong)]"
        : variant === "ghost"
          ? "bg-transparent text-[color:var(--color-foreground)] hover:bg-[color:var(--color-surface-muted)]"
          : "border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] text-[color:var(--color-foreground)] hover:border-[color:var(--color-foreground)]";
  return cx(buttonBase, sz, skin);
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = "secondary", size = "md", block, className, type, ...rest },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type ?? "button"}
        className={cx(buttonClasses(variant, size), block && "w-full", className)}
        {...rest}
      />
    );
  },
);

export interface ButtonLinkProps
  extends Omit<React.ComponentProps<typeof Link>, "className"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  className?: string;
}

export function ButtonLink({
  variant = "secondary",
  size = "md",
  block,
  className,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link
      className={cx(buttonClasses(variant, size), block && "w-full", className)}
      {...rest}
    />
  );
}

/** Icon-only button — guaranteed 44x44 touch target. */
export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: "ghost" | "outline";
}
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { label, variant = "ghost", className, children, type, ...rest },
    ref,
  ) {
    const skin =
      variant === "outline"
        ? "border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] hover:border-[color:var(--color-foreground)]"
        : "hover:bg-[color:var(--color-surface-muted)]";
    return (
      <button
        ref={ref}
        type={type ?? "button"}
        aria-label={label}
        className={cx(
          "inline-flex h-11 w-11 min-h-[var(--touch-target-min)] min-w-[var(--touch-target-min)] items-center justify-center rounded-[var(--radius-md)] text-[color:var(--color-foreground)] transition-[background-color,border-color] duration-[var(--duration-base)] ease-[var(--ease-out)]",
          skin,
          className,
        )}
        {...rest}
      >
        {children}
      </button>
    );
  },
);

/* ────────────────────────────────────────────────────────────
   Chips, badges, tags
   ──────────────────────────────────────────────────────────── */

export interface ChipProps {
  selected?: boolean;
  size?: "sm" | "md";
  className?: string;
  children: React.ReactNode;
}
function chipClasses(selected?: boolean, size: "sm" | "md" = "md") {
  const sz =
    size === "sm"
      ? "h-8 px-3 text-xs"
      : "h-10 px-4 text-sm min-w-[var(--touch-target-min)]";
  const skin = selected
    ? "bg-[color:var(--color-foreground)] text-[color:var(--color-background)] border-[color:var(--color-foreground)]"
    : "bg-[color:var(--color-surface)] text-[color:var(--color-foreground)] border-[color:var(--color-line-strong)] hover:border-[color:var(--color-foreground)]";
  return cx(
    "inline-flex items-center gap-1.5 rounded-full border font-medium transition-colors duration-[var(--duration-base)] ease-[var(--ease-out)] whitespace-nowrap",
    sz,
    skin,
  );
}

export function Chip({
  selected,
  size = "md",
  className,
  children,
  ...rest
}: ChipProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cx(chipClasses(selected, size), className)}
      {...rest}
    >
      {children}
    </button>
  );
}

export function ChipLink({
  selected,
  size = "md",
  className,
  children,
  ...rest
}: ChipProps & Omit<React.ComponentProps<typeof Link>, "className">) {
  return (
    <Link
      aria-current={selected ? "page" : undefined}
      className={cx(chipClasses(selected, size), className)}
      {...rest}
    >
      {children}
    </Link>
  );
}

/** Badge — static informational pill; not interactive. */
export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: "neutral" | "accent";
  className?: string;
  children: React.ReactNode;
}) {
  const skin =
    tone === "accent"
      ? "bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent-strong)] border-[color:color-mix(in_oklab,var(--color-accent)_20%,transparent)]"
      : "bg-[color:var(--color-surface-muted)] text-[color:var(--color-muted)] border-[color:var(--color-line)]";
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wider",
        skin,
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ────────────────────────────────────────────────────────────
   Inputs
   ──────────────────────────────────────────────────────────── */

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, type, ...rest }, ref) {
  return (
    <input
      ref={ref}
      type={type ?? "text"}
      className={cx(
        "h-11 w-full min-h-[var(--touch-target-min)] rounded-[var(--radius-md)] border border-[color:var(--color-line-strong)]",
        "bg-[color:var(--color-surface)] px-4 text-base text-[color:var(--color-foreground)]",
        "placeholder:text-[color:var(--color-muted)] focus-visible:border-[color:var(--color-accent)]",
        "transition-[border-color,box-shadow] duration-[var(--duration-base)] ease-[var(--ease-out)]",
        className,
      )}
      {...rest}
    />
  );
});

/* ────────────────────────────────────────────────────────────
   Feedback
   ──────────────────────────────────────────────────────────── */

/** Skeleton — single shimmer primitive. */
export function Skeleton({
  className,
  rounded = "md",
  as: Comp = "div",
  ...rest
}: {
  className?: string;
  rounded?: "sm" | "md" | "lg" | "full";
  as?: React.ElementType;
} & React.HTMLAttributes<HTMLElement>) {
  const r =
    rounded === "full"
      ? "rounded-full"
      : rounded === "lg"
        ? "rounded-[var(--radius-lg)]"
        : rounded === "sm"
          ? "rounded-[var(--radius-sm)]"
          : "rounded-[var(--radius-md)]";
  return (
    <Comp
      aria-hidden="true"
      className={cx(
        "block bg-[color:var(--color-surface-muted)] atlas-shimmer",
        r,
        className,
      )}
      {...rest}
    />
  );
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "flex flex-col items-center justify-center gap-3 py-12 text-center",
        className,
      )}
      role="status"
    >
      <p className="text-base font-semibold text-[color:var(--color-foreground)]">
        {title}
      </p>
      {description ? (
        <p className="max-w-sm text-sm text-[color:var(--color-muted)]">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  action,
  className,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "flex flex-col items-center justify-center gap-3 py-12 text-center",
        className,
      )}
      role="alert"
    >
      <p className="text-base font-semibold text-[color:var(--color-foreground)]">
        {title}
      </p>
      {description ? (
        <p className="max-w-sm text-sm text-[color:var(--color-muted)]">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Data display
   ──────────────────────────────────────────────────────────── */

/** MetricStat — single-source-of-truth for "label + value + unit + source". */
export interface MetricStatProps {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
  source?: string;
  icon?: React.ReactNode;
  className?: string;
}
export function MetricStat({
  label,
  value,
  unit,
  source,
  icon,
  className,
}: MetricStatProps) {
  const isEmpty = value === null || value === undefined || value === "";
  return (
    <div
      className={cx(
        "flex min-h-[var(--touch-target-min)] flex-col gap-1 rounded-[var(--radius-md)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 flex items-baseline gap-1.5 font-[family-name:var(--font-mono)] tabular-nums">
        {isEmpty ? (
          <span className="text-xl text-[color:var(--color-muted-soft)]">—</span>
        ) : (
          <>
            <span className="text-2xl font-semibold text-[color:var(--color-foreground)]">
              {typeof value === "number" ? value.toLocaleString() : value}
            </span>
            {unit ? (
              <span className="text-sm text-[color:var(--color-muted)]">{unit}</span>
            ) : null}
          </>
        )}
      </div>
      {source ? (
        <div className="text-[0.7rem] text-[color:var(--color-muted-soft)]">
          {source}
        </div>
      ) : null}
    </div>
  );
}

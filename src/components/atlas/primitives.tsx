import * as React from "react";
import { cx } from "./cx";

/* ────────────────────────────────────────────────────────────
   Layout primitives — server-safe, composable, no motion.
   ──────────────────────────────────────────────────────────── */

type As<T extends React.ElementType> = {
  as?: T;
  className?: string;
  children?: React.ReactNode;
};

type PolymorphicProps<T extends React.ElementType, P> = P &
  As<T> &
  Omit<React.ComponentPropsWithoutRef<T>, keyof P | keyof As<T>>;

/** Container — responsive content width, consistent gutters. */
export interface ContainerProps {
  size?: "content" | "wide";
}
export function Container<T extends React.ElementType = "div">({
  as,
  size = "content",
  className,
  children,
  ...rest
}: PolymorphicProps<T, ContainerProps>) {
  const Comp = (as ?? "div") as React.ElementType;
  const max = size === "wide" ? "max-w-7xl" : "max-w-5xl";
  return (
    <Comp
      className={cx(
        "mx-auto w-full px-4 sm:px-6 lg:px-8",
        max,
        className,
      )}
      {...rest}
    >
      {children}
    </Comp>
  );
}

/** Section — consistent vertical rhythm across the whole site. */
export interface SectionProps {
  size?: "sm" | "md" | "lg";
}
export function Section<T extends React.ElementType = "section">({
  as,
  size = "md",
  className,
  children,
  ...rest
}: PolymorphicProps<T, SectionProps>) {
  const Comp = (as ?? "section") as React.ElementType;
  const padding =
    size === "sm"
      ? "py-10 md:py-14"
      : size === "lg"
        ? "py-20 md:py-28"
        : "py-14 md:py-20";
  return (
    <Comp className={cx(padding, className)} {...rest}>
      {children}
    </Comp>
  );
}

/** Stack — vertical spacing with token-based gap. */
export interface StackProps {
  gap?: 1 | 2 | 3 | 4 | 6 | 8 | 12 | 16;
  align?: "start" | "center" | "end" | "stretch";
}
function gapClass(gap: 1 | 2 | 3 | 4 | 6 | 8 | 12 | 16): string {
  switch (gap) {
    case 1: return "gap-1";
    case 2: return "gap-2";
    case 3: return "gap-3";
    case 6: return "gap-6";
    case 8: return "gap-8";
    case 12: return "gap-12";
    case 16: return "gap-16";
    default: return "gap-4";
  }
}
export function Stack<T extends React.ElementType = "div">({
  as,
  gap = 4,
  align = "stretch",
  className,
  children,
  ...rest
}: PolymorphicProps<T, StackProps>) {
  const Comp = (as ?? "div") as React.ElementType;
  const alignCls =
    align === "start"
      ? "items-start"
      : align === "center"
        ? "items-center"
        : align === "end"
          ? "items-end"
          : "items-stretch";
  return (
    <Comp
      className={cx("flex flex-col", gapClass(gap), alignCls, className)}
      {...rest}
    >
      {children}
    </Comp>
  );
}

/** Row — horizontal flex with optional wrap. */
export interface RowProps {
  gap?: 1 | 2 | 3 | 4 | 6 | 8;
  align?: "start" | "center" | "end" | "baseline";
  justify?: "start" | "center" | "end" | "between";
  wrap?: boolean;
}
export function Row<T extends React.ElementType = "div">({
  as,
  gap = 3,
  align = "center",
  justify = "start",
  wrap = false,
  className,
  children,
  ...rest
}: PolymorphicProps<T, RowProps>) {
  const Comp = (as ?? "div") as React.ElementType;
  const alignCls =
    align === "start"
      ? "items-start"
      : align === "end"
        ? "items-end"
        : align === "baseline"
          ? "items-baseline"
          : "items-center";
  const justifyCls =
    justify === "center"
      ? "justify-center"
      : justify === "end"
        ? "justify-end"
        : justify === "between"
          ? "justify-between"
          : "justify-start";
  return (
    <Comp
      className={cx(
        "flex",
        wrap && "flex-wrap",
        gapClass(gap),
        alignCls,
        justifyCls,
        className,
      )}
      {...rest}
    >
      {children}
    </Comp>
  );
}

/** Grid — responsive column count. */
export interface GridProps {
  cols?: { base?: number; sm?: number; md?: number; lg?: number };
  gap?: 2 | 3 | 4 | 6 | 8;
}
const colsMap: Record<number, { base: string; sm: string; md: string; lg: string }> = {
  1: { base: "grid-cols-1", sm: "sm:grid-cols-1", md: "md:grid-cols-1", lg: "lg:grid-cols-1" },
  2: { base: "grid-cols-2", sm: "sm:grid-cols-2", md: "md:grid-cols-2", lg: "lg:grid-cols-2" },
  3: { base: "grid-cols-3", sm: "sm:grid-cols-3", md: "md:grid-cols-3", lg: "lg:grid-cols-3" },
  4: { base: "grid-cols-4", sm: "sm:grid-cols-4", md: "md:grid-cols-4", lg: "lg:grid-cols-4" },
  6: { base: "grid-cols-6", sm: "sm:grid-cols-6", md: "md:grid-cols-6", lg: "lg:grid-cols-6" },
  12: { base: "grid-cols-12", sm: "sm:grid-cols-12", md: "md:grid-cols-12", lg: "lg:grid-cols-12" },
};
export function Grid<T extends React.ElementType = "div">({
  as,
  cols = { base: 1, md: 2 },
  gap = 4,
  className,
  children,
  ...rest
}: PolymorphicProps<T, GridProps>) {
  const Comp = (as ?? "div") as React.ElementType;
  const baseN = cols.base ?? 1;
  const smN = cols.sm;
  const mdN = cols.md;
  const lgN = cols.lg;
  // eslint-disable-next-line security/detect-object-injection
  const baseCls = colsMap[baseN]?.base ?? "grid-cols-1";
  // eslint-disable-next-line security/detect-object-injection
  const smCls = smN ? colsMap[smN]?.sm : undefined;
  // eslint-disable-next-line security/detect-object-injection
  const mdCls = mdN ? colsMap[mdN]?.md : undefined;
  // eslint-disable-next-line security/detect-object-injection
  const lgCls = lgN ? colsMap[lgN]?.lg : undefined;
  return (
    <Comp
      className={cx(
        "grid",
        gapClass(gap),
        baseCls,
        smCls,
        mdCls,
        lgCls,
        className,
      )}
      {...rest}
    >
      {children}
    </Comp>
  );
}

/** Divider — 1px token-coloured line. */
export function Divider({ className }: { className?: string }) {
  return (
    <hr
      role="separator"
      aria-hidden="true"
      className={cx("border-0 h-px w-full bg-[var(--color-line)]", className)}
    />
  );
}

/* ────────────────────────────────────────────────────────────
   Typography primitives — fixed scale from the design token doc.
   ──────────────────────────────────────────────────────────── */

/** Display — Cormorant, only for page H1 / city name. */
export function Display({
  as: Comp = "h1",
  className,
  children,
  ...rest
}: {
  as?: React.ElementType;
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Comp
      className={cx(
        "font-[family-name:var(--font-display)] font-medium text-[color:var(--color-foreground)]",
        "text-[length:var(--text-display-fluid)] leading-[1.05] tracking-[-0.01em]",
        className,
      )}
      {...rest}
    >
      {children}
    </Comp>
  );
}

/** Heading — semantic level 1-3, sans, fixed scale. */
export interface HeadingProps {
  level?: 1 | 2 | 3;
  className?: string;
  children: React.ReactNode;
}
export function Heading({
  level = 2,
  className,
  children,
  ...rest
}: HeadingProps & React.HTMLAttributes<HTMLHeadingElement>) {
  const Comp = (`h${level}` as const) as "h1" | "h2" | "h3";
  const sizes =
    level === 1
      ? "text-[length:var(--text-h1-fluid)] leading-[1.1]"
      : level === 2
        ? "text-2xl leading-[1.2] md:text-[1.75rem]"
        : "text-lg leading-[1.3] md:text-xl";
  return (
    <Comp
      className={cx(
        "font-semibold tracking-[-0.01em] text-[color:var(--color-foreground)]",
        sizes,
        className,
      )}
      {...rest}
    >
      {children}
    </Comp>
  );
}

export function Text({
  as: Comp = "p",
  size = "base",
  tone = "default",
  className,
  children,
  ...rest
}: {
  as?: React.ElementType;
  size?: "sm" | "base" | "lg";
  tone?: "default" | "muted" | "soft" | "accent";
  className?: string;
  children?: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>) {
  const sz =
    size === "sm"
      ? "text-sm leading-[1.55]"
      : size === "lg"
        ? "text-lg leading-[1.65]"
        : "text-base leading-[1.6]";
  const tn =
    tone === "muted"
      ? "text-[color:var(--color-muted)]"
      : tone === "soft"
        ? "text-[color:var(--color-muted-soft)]"
        : tone === "accent"
          ? "text-[color:var(--color-accent-strong)]"
          : "text-[color:var(--color-foreground)]";
  return (
    <Comp className={cx(sz, tn, className)} {...rest}>
      {children}
    </Comp>
  );
}

/** Caption — uppercase label, 4.5:1 safe. */
export function Caption({
  as: Comp = "span",
  className,
  children,
  ...rest
}: {
  as?: React.ElementType;
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Comp
      className={cx(
        "inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em]",
        "text-[color:var(--color-muted)]",
        className,
      )}
      {...rest}
    >
      {children}
    </Comp>
  );
}

/** Mono — IBM Plex Mono for numerics / coordinates. */
export function Mono({
  as: Comp = "span",
  size = "base",
  className,
  children,
  ...rest
}: {
  as?: React.ElementType;
  size?: "sm" | "base" | "lg";
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>) {
  const sz =
    size === "lg" ? "text-2xl" : size === "sm" ? "text-xs" : "text-sm";
  return (
    <Comp
      className={cx(
        "font-[family-name:var(--font-mono)] tabular-nums",
        sz,
        className,
      )}
      {...rest}
    >
      {children}
    </Comp>
  );
}

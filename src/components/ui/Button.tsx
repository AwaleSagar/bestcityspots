import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "link";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap transition-colors duration-150 ease-standard select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0";

const VARIANTS = new Map<ButtonVariant, string>([
  ["primary", "bg-accent text-on-accent hover:bg-accent-hover"],
  ["secondary", "border border-rule-strong bg-surface text-ink hover:bg-sunken"],
  ["ghost", "text-ink hover:bg-sunken"],
  ["link", "text-accent underline-offset-4 hover:text-accent-hover hover:underline"],
]);

const SIZES = new Map<ButtonSize, string>([
  ["sm", "h-9 px-3 text-sm pointer-coarse:h-11"],
  ["md", "h-11 px-4 text-sm"],
  ["lg", "h-12 px-5 text-base"],
]);

interface ButtonClassOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

/** Button styling for <Link>/<a> elements that should look like buttons. */
export function buttonClasses({
  variant = "secondary",
  size = "md",
  className,
}: ButtonClassOptions = {}): string {
  return cn(
    BASE,
    VARIANTS.get(variant),
    variant === "link" ? "h-auto px-0" : SIZES.get(size),
    className
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  variant = "secondary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return <button type={type} className={buttonClasses({ variant, size, className })} {...props} />;
}

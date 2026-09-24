import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Accessible name — icon-only buttons must always be labelled. */
  label: string;
  children: ReactNode;
}

export function IconButton({
  label,
  className,
  type = "button",
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "text-ink ease-standard hover:bg-sunken inline-flex size-11 shrink-0 items-center justify-center rounded-md transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-5",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

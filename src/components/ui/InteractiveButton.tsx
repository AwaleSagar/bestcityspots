"use client";

import { ReactNode, useState, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface InteractiveButtonProps {
  children: ReactNode;
  /** URL for link buttons */
  href?: string;
  /** Click handler for button mode */
  onClick?: () => void;
  /** Button style variant */
  variant?: ButtonVariant;
  /** Button size */
  size?: ButtonSize;
  /** Icon to show before text */
  icon?: ReactNode;
  /** Icon to show after text */
  iconAfter?: ReactNode;
  /** Disabled state */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Full width */
  fullWidth?: boolean;
  /** Additional class names */
  className?: string;
  /** Aria label */
  ariaLabel?: string;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    border-purple-400/40 bg-purple-500/20 text-purple-100
    hover:bg-purple-500/30 hover:border-purple-400/60
  `,
  secondary: `
    border-foreground/20 bg-foreground/[0.05] text-foreground/80
    hover:bg-foreground/10 hover:border-foreground/30
  `,
  ghost: `
    border-transparent bg-transparent text-foreground/60
    hover:bg-foreground/[0.05] hover:text-foreground
  `,
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-xs gap-1.5",
  md: "px-5 py-3 text-sm gap-2",
  lg: "px-6 py-4 text-base gap-2.5",
};

export default function InteractiveButton({
  children,
  href,
  onClick,
  variant = "primary",
  size = "md",
  icon,
  iconAfter,
  disabled = false,
  loading = false,
  fullWidth = false,
  className = "",
  ariaLabel,
}: InteractiveButtonProps) {
  const shouldReduceMotion = useReducedMotion();
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (disabled || loading) return;

      // Create ripple effect
      if (!shouldReduceMotion) {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const id = Date.now();

        setRipples((prev) => [...prev, { x, y, id }]);
        setTimeout(() => {
          setRipples((prev) => prev.filter((r) => r.id !== id));
        }, 600);
      }

      onClick?.();
    },
    [disabled, loading, onClick, shouldReduceMotion]
  );

  const baseClasses = `
    touch-target relative inline-flex min-h-[var(--touch-target-min)]
    items-center justify-center overflow-hidden rounded-full border
    font-bold uppercase tracking-[0.15em]
    transition-colors duration-150
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background
    disabled:pointer-events-none disabled:opacity-50
    ${variantStyles[variant]}
    ${sizeStyles[size]}
    ${fullWidth ? "w-full" : ""}
    ${className}
  `;

  const motionProps = shouldReduceMotion
    ? {}
    : {
        whileHover: { scale: 1.02 },
        whileTap: { scale: 0.98 },
        transition: {
          type: "spring" as const,
          stiffness: 400,
          damping: 17,
        },
      };

  const content = (
    <>
      {/* Ripple effects */}
      {ripples.map((ripple) => (
        <motion.span
          key={ripple.id}
          initial={{ scale: 0, opacity: 0.5 }}
          animate={{ scale: 4, opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="pointer-events-none absolute rounded-full bg-white/30"
          style={{
            left: ripple.x - 10,
            top: ripple.y - 10,
            width: 20,
            height: 20,
          }}
        />
      ))}

      {/* Glow effect on hover */}
      {variant === "primary" && !shouldReduceMotion && (
        <motion.span
          className="pointer-events-none absolute inset-0 rounded-full bg-purple-500/20 blur-xl"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}

      {/* Loading spinner */}
      {loading && (
        <motion.span
          className="mr-2 h-4 w-4 rounded-full border-2 border-current border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      )}

      {/* Icon before */}
      {icon && !loading && <span className="flex-shrink-0">{icon}</span>}

      {/* Text */}
      <span className="relative z-10">{children}</span>

      {/* Icon after */}
      {iconAfter && <span className="flex-shrink-0">{iconAfter}</span>}
    </>
  );

  // Render as link or button
  if (href && !disabled) {
    return (
      <motion.div {...motionProps} className="inline-block">
        <Link href={href} className={baseClasses} aria-label={ariaLabel}>
          {content}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.button
      {...motionProps}
      onClick={handleClick}
      disabled={disabled || loading}
      className={baseClasses}
      aria-label={ariaLabel}
      aria-busy={loading}
    >
      {content}
    </motion.button>
  );
}

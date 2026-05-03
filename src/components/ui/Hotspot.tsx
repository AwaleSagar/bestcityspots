"use client";

import { ReactNode, useState, useCallback, useEffect, useId, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion, TargetAndTransition } from "framer-motion";
import { Info, X } from "lucide-react";

type TooltipPosition = "top" | "bottom" | "left" | "right";

interface HotspotProps {
  /** The content to show in the tooltip */
  tip: ReactNode;
  /** Position of the tooltip relative to the hotspot */
  position?: TooltipPosition;
  /** Custom color for the hotspot indicator */
  color?: string;
  /** Show as inline element within text */
  inline?: boolean;
  /** Size of the hotspot indicator */
  size?: "sm" | "md" | "lg";
  /** Optional label for accessibility */
  ariaLabel?: string;
  /** Children to wrap (if not inline) */
  children?: ReactNode;
}

const sizeClasses = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

const tooltipPositionStyles: Record<TooltipPosition, string> = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-3",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-3",
  left: "right-full top-1/2 -translate-y-1/2 mr-3",
  right: "left-full top-1/2 -translate-y-1/2 ml-3",
};

const tooltipAnimations: Record<
  TooltipPosition,
  { initial: TargetAndTransition; animate: TargetAndTransition; exit: TargetAndTransition }
> = {
  top: {
    initial: { opacity: 0, y: 10, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 10, scale: 0.95 },
  },
  bottom: {
    initial: { opacity: 0, y: -10, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -10, scale: 0.95 },
  },
  left: {
    initial: { opacity: 0, x: 10, scale: 0.95 },
    animate: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: 10, scale: 0.95 },
  },
  right: {
    initial: { opacity: 0, x: -10, scale: 0.95 },
    animate: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: -10, scale: 0.95 },
  },
};

export default function Hotspot({
  tip,
  position = "top",
  color = "var(--color-accent)",
  inline = true,
  size = "sm",
  ariaLabel = "More information",
  children,
}: HotspotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const tooltipId = useId();
  const rootRef = useRef<HTMLSpanElement | null>(null);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleToggle();
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    },
    [handleToggle, isOpen]
  );

  // position is a typed TooltipPosition union - key access is safe
  // eslint-disable-next-line security/detect-object-injection
  const animation = tooltipAnimations[position];
  // eslint-disable-next-line security/detect-object-injection
  const sizeClass = sizeClasses[size];
  // eslint-disable-next-line security/detect-object-injection
  const tooltipPositionClass = tooltipPositionStyles[position];

  return (
    <span
      ref={rootRef}
      className={`relative ${inline ? "inline-flex" : "flex"} items-center`}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setIsOpen(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") setIsOpen(false);
      }}
    >
      {children}

      {/* Hotspot indicator */}
      <button
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        aria-label={ariaLabel}
        aria-describedby={isOpen ? tooltipId : undefined}
        className={` ${inline ? "ml-1" : ""} ${sizeClass} touch-target relative flex min-h-6 min-w-6 cursor-pointer items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)]/50 focus-visible:outline-none`}
      >
        {/* Pulsing glow effect */}
        {isOpen && !shouldReduceMotion && (
          <motion.span
            className={`absolute rounded-full ${sizeClass}`}
            style={{ backgroundColor: color }}
            animate={{
              scale: [1, 2.2, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}

        {/* Main indicator dot */}
        <span
          className={`relative z-10 flex items-center justify-center rounded-full ${sizeClass}`}
          style={{ backgroundColor: color }}
        >
          <Info className="h-2 w-2 text-white" />
        </span>
      </button>

      {/* Tooltip */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id={tooltipId}
            initial={shouldReduceMotion ? { opacity: 1 } : animation.initial}
            animate={shouldReduceMotion ? { opacity: 1 } : animation.animate}
            exit={shouldReduceMotion ? { opacity: 0 } : animation.exit}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={`absolute z-50 ${tooltipPositionClass} w-64 max-w-[calc(100vw-2rem)]`}
            role="tooltip"
          >
            <div className="border-foreground/10 bg-background/95 relative rounded-xl border p-4 shadow-2xl backdrop-blur-xl">
              {/* Close button for mobile */}
              <button
                onClick={() => setIsOpen(false)}
                className="text-foreground/40 hover:bg-foreground/10 hover:text-foreground/60 absolute top-2 right-2 rounded-full p-1 md:hidden"
                aria-label="Close tooltip"
              >
                <X className="h-3 w-3" />
              </button>

              {/* Arrow indicator */}
              <div
                className={`border-foreground/10 bg-background/95 absolute h-2 w-2 rotate-45 ${position === "top" ? "bottom-[-5px] left-1/2 -translate-x-1/2 border-r border-b" : ""} ${position === "bottom" ? "top-[-5px] left-1/2 -translate-x-1/2 border-t border-l" : ""} ${position === "left" ? "top-1/2 right-[-5px] -translate-y-1/2 border-t border-r" : ""} ${position === "right" ? "top-1/2 left-[-5px] -translate-y-1/2 border-b border-l" : ""} `}
              />

              {/* Tip content */}
              <div className="text-foreground/80 text-sm leading-relaxed">{tip}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}

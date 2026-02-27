"use client";

import { ReactNode, useState, useCallback } from "react";
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

const tooltipAnimations: Record<TooltipPosition, { initial: TargetAndTransition; animate: TargetAndTransition; exit: TargetAndTransition }> = {
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
  color = "rgb(147, 51, 234)",
  inline = true,
  size = "sm",
  ariaLabel = "More information",
  children,
}: HotspotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleToggle();
    }
    if (e.key === "Escape" && isOpen) {
      setIsOpen(false);
    }
  }, [handleToggle, isOpen]);

  // position is a typed TooltipPosition union - key access is safe
  // eslint-disable-next-line security/detect-object-injection
  const animation = tooltipAnimations[position];
  // eslint-disable-next-line security/detect-object-injection
  const sizeClass = sizeClasses[size];
  // eslint-disable-next-line security/detect-object-injection
  const tooltipPositionClass = tooltipPositionStyles[position];

  return (
    <span
      className={`relative ${inline ? "inline-flex" : "flex"} items-center`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {children}

      {/* Hotspot indicator */}
      <button
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        className={`
          ${inline ? "ml-1" : ""}
          ${sizeClass}
          relative flex items-center justify-center cursor-pointer rounded-full
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50
          touch-target
        `}
        style={{ minHeight: "24px", minWidth: "24px" }}
      >
        {/* Pulsing glow effect */}
        {!shouldReduceMotion && (
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
            initial={shouldReduceMotion ? { opacity: 1 } : animation.initial}
            animate={shouldReduceMotion ? { opacity: 1 } : animation.animate}
            exit={shouldReduceMotion ? { opacity: 0 } : animation.exit}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={`
              absolute z-50
              ${tooltipPositionClass}
              w-64 max-w-[calc(100vw-2rem)]
            `}
            role="tooltip"
          >
            <div className="relative rounded-xl border border-foreground/10 bg-background/95 p-4 shadow-2xl backdrop-blur-xl">
              {/* Close button for mobile */}
              <button
                onClick={() => setIsOpen(false)}
                className="absolute right-2 top-2 rounded-full p-1 text-foreground/40 hover:bg-foreground/10 hover:text-foreground/60 md:hidden"
                aria-label="Close tooltip"
              >
                <X className="h-3 w-3" />
              </button>

              {/* Arrow indicator */}
              <div
                className={`
                  absolute h-2 w-2 rotate-45 border-foreground/10 bg-background/95
                  ${position === "top" ? "bottom-[-5px] left-1/2 -translate-x-1/2 border-b border-r" : ""}
                  ${position === "bottom" ? "top-[-5px] left-1/2 -translate-x-1/2 border-l border-t" : ""}
                  ${position === "left" ? "right-[-5px] top-1/2 -translate-y-1/2 border-r border-t" : ""}
                  ${position === "right" ? "left-[-5px] top-1/2 -translate-y-1/2 border-b border-l" : ""}
                `}
              />

              {/* Tip content */}
              <div className="text-sm leading-relaxed text-foreground/80">
                {tip}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}

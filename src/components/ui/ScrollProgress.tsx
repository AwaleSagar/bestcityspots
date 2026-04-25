"use client";

import { motion, useScroll, useSpring, useReducedMotion } from "framer-motion";

interface ScrollProgressProps {
  /** Show percentage text next to progress bar */
  showPercentage?: boolean;
  /** Custom gradient colors */
  gradientFrom?: string;
  gradientTo?: string;
}

export default function ScrollProgress({
  showPercentage = false,
  gradientFrom = "var(--color-accent)",
  gradientTo = "var(--color-brand-secondary)",
}: ScrollProgressProps) {
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();

  // Smooth spring animation for the progress bar
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <div
      className="fixed top-0 right-0 left-0 z-50 h-1"
      role="progressbar"
      aria-label="Reading progress"
      aria-valuenow={0}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {/* Background track */}
      <div className="bg-foreground/5 absolute inset-0" />

      {/* Progress bar */}
      <motion.div
        className="absolute inset-y-0 left-0 origin-left"
        style={{
          scaleX: shouldReduceMotion ? scrollYProgress : scaleX,
          background: `linear-gradient(90deg, ${gradientFrom}, ${gradientTo})`,
        }}
      >
        {/* Glow effect */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(90deg, ${gradientFrom}, ${gradientTo})`,
            filter: "blur(8px)",
            opacity: 0.6,
          }}
        />
      </motion.div>

      {/* Percentage indicator */}
      {showPercentage && (
        <motion.div
          className="bg-background/80 absolute top-3 right-4 rounded-full px-2 py-0.5 text-[10px] font-bold backdrop-blur-sm"
          style={{ opacity: scrollYProgress }}
        >
          <motion.span>{/* This updates reactively based on scroll */}</motion.span>
        </motion.div>
      )}
    </div>
  );
}

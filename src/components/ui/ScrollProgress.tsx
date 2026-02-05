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
  gradientFrom = "rgb(147, 51, 234)",
  gradientTo = "rgb(59, 130, 246)",
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
      className="fixed left-0 right-0 top-0 z-50 h-1"
      role="progressbar"
      aria-label="Reading progress"
      aria-valuenow={0}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {/* Background track */}
      <div className="absolute inset-0 bg-foreground/5" />

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
          className="absolute right-4 top-3 rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-bold backdrop-blur-sm"
          style={{ opacity: scrollYProgress }}
        >
          <motion.span>
            {/* This updates reactively based on scroll */}
          </motion.span>
        </motion.div>
      )}
    </div>
  );
}

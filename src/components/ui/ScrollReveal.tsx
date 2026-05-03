"use client";

import { ReactNode, useRef } from "react";
import { motion, useInView, useReducedMotion, Variants, HTMLMotionProps } from "framer-motion";

type AnimationType =
  | "fade-up"
  | "fade-down"
  | "fade-left"
  | "fade-right"
  | "scale"
  | "blur"
  | "none";

interface ScrollRevealProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode;
  /** Animation type */
  animation?: AnimationType;
  /** Delay before animation starts (seconds) */
  delay?: number;
  /** Duration of the animation (seconds) */
  duration?: number;
  /** How much of the element needs to be visible to trigger */
  threshold?: number;
  /** Only animate once */
  once?: boolean;
  /** Custom className */
  className?: string;
  /** For staggered children - the index of this item */
  staggerIndex?: number;
  /** Stagger delay between items (seconds) */
  staggerDelay?: number;
}

const animations: Record<AnimationType, Variants> = {
  "fade-up": {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0 },
  },
  "fade-down": {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0 },
  },
  "fade-left": {
    hidden: { opacity: 0, x: 24 },
    visible: { opacity: 1, x: 0 },
  },
  "fade-right": {
    hidden: { opacity: 0, x: -24 },
    visible: { opacity: 1, x: 0 },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.96 },
    visible: { opacity: 1, scale: 1 },
  },
  blur: {
    hidden: { opacity: 0, filter: "blur(6px)" },
    visible: { opacity: 1, filter: "blur(0px)" },
  },
  none: {
    hidden: { opacity: 1 },
    visible: { opacity: 1 },
  },
};

export default function ScrollReveal({
  children,
  animation = "fade-up",
  delay = 0,
  duration = 0.42,
  threshold = 0.2,
  once = true,
  className = "",
  staggerIndex = 0,
  staggerDelay = 0.06,
  ...motionProps
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, {
    once,
    amount: threshold,
  });
  const shouldReduceMotion = useReducedMotion();

  // Calculate total delay including stagger
  const totalDelay = delay + staggerIndex * staggerDelay;

  // Use no animation if user prefers reduced motion
  const selectedAnimation = shouldReduceMotion ? "none" : animation;
  // eslint-disable-next-line security/detect-object-injection
  const variants = animations[selectedAnimation];

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={variants}
      transition={{
        duration: shouldReduceMotion ? 0 : duration,
        delay: shouldReduceMotion ? 0 : totalDelay,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={className}
      {...motionProps}
    >
      {children}
    </motion.div>
  );
}

// Wrapper for staggered children
interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
  animation?: AnimationType;
  once?: boolean;
}

export function StaggerContainer({
  children,
  className = "",
  staggerDelay = 0.06,
  animation = "fade-up",
  once = true,
}: StaggerContainerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, amount: 0.1 });
  const shouldReduceMotion = useReducedMotion();

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : staggerDelay,
      },
    },
  };

  const itemVariants = animations[shouldReduceMotion ? "none" : animation];

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={containerVariants}
      className={className}
    >
      {/* Clone children and add variants */}
      {Array.isArray(children)
        ? children.map((child, index) => (
            <motion.div key={index} variants={itemVariants}>
              {child}
            </motion.div>
          ))
        : children}
    </motion.div>
  );
}

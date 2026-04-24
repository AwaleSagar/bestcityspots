"use client";

import * as React from "react";
import { cx } from "./cx";

/**
 * FadeIn — minimal intersection-observer fade.
 * Replaces framer-motion ScrollReveal / staggered headers.
 * Respects prefers-reduced-motion via CSS (@media rule kills the animation).
 */
export function FadeIn({
  as: Comp = "div",
  delayMs = 0,
  className,
  children,
  ...rest
}: {
  as?: React.ElementType;
  delayMs?: number;
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>) {
  const ref = React.useRef<HTMLElement | null>(null);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Comp
      ref={ref as React.Ref<HTMLElement>}
      className={cx(className)}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : "translateY(8px)",
        transition: `opacity 360ms var(--ease-out, ease-out), transform 360ms var(--ease-out, ease-out)`,
        transitionDelay: visible && delayMs ? `${delayMs}ms` : "0ms",
        willChange: visible ? "auto" : "opacity, transform",
      }}
      {...rest}
    >
      {children}
    </Comp>
  );
}

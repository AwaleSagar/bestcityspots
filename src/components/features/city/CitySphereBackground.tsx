"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

type Point3 = { x: number; y: number; z: number };

const MAX_CITIES = 120;
const SPHERE_RADIUS = 420;
const PARTICLE_COUNT = 50;

// Biophilic atlas palette sourced from global design tokens.
const COLORS = {
  earth: { solid: "var(--color-earth)", soft: "var(--color-earth-soft)" },
  leaf: { solid: "var(--color-leaf)", soft: "var(--color-leaf-soft)" },
  water: { solid: "var(--color-water)", soft: "var(--color-water-soft)" },
  accent: { solid: "var(--color-accent)", soft: "var(--color-accent-soft)" },
};

// Pre-computed color values array for safe indexed access
const COLOR_VALUES = Object.values(COLORS);

function createSeededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

// Pre-generate stable particle data to avoid render-time randomness and hydration drift.
const PARTICLE_DATA = (() => {
  const random = createSeededRandom(20260425);
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    delay: random() * 10,
    duration: 15 + random() * 20,
    size: random() * 3 + 1,
    startX: random() * 100,
    startY: random() * 100,
    colorIndex: Math.floor(random() * COLOR_VALUES.length),
  }));
})();

function fibonacciSphere(n: number, radius: number): Point3[] {
  const pts: Point3[] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < n; i++) {
    const y = 1 - (i / Math.max(1, n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = goldenAngle * i;
    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;
    pts.push({ x: x * radius, y: y * radius, z: z * radius });
  }
  return pts;
}

// Get color based on position for aurora effect
function getNodeColor(index: number, total: number, isActive: boolean) {
  const t = index / total;
  const colorIndex = Math.floor(t * COLOR_VALUES.length) % COLOR_VALUES.length;
  const color = COLOR_VALUES[colorIndex % COLOR_VALUES.length];

  if (isActive) {
    return color.solid;
  }
  return color.soft;
}

function getGlowColor(index: number, total: number) {
  const t = index / total;
  const colorIndex = Math.floor(t * COLOR_VALUES.length) % COLOR_VALUES.length;
  const color = COLOR_VALUES[colorIndex % COLOR_VALUES.length];
  return color.solid;
}

// Floating particle component
function FloatingParticle({
  delay,
  duration,
  size,
  startX,
  startY,
  colorIndex,
}: {
  delay: number;
  duration: number;
  size: number;
  startX: number;
  startY: number;
  colorIndex: number;
}) {
  const color = COLOR_VALUES[colorIndex % COLOR_VALUES.length];

  return (
    <div
      className="animate-float-particle absolute rounded-full"
      style={{
        width: size,
        height: size,
        left: `${startX}%`,
        top: `${startY}%`,
        background: color.soft,
        boxShadow: `0 0 ${size * 2}px ${color.soft}`,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
      }}
    />
  );
}

export default function CitySphereBackground() {
  const shouldReduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const [labels, setLabels] = useState<string[]>([]);
  const [activeIndices, setActiveIndices] = useState<number[]>([]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function load() {
      try {
        const res = await fetch(`/api/cities/sphere?limit=${MAX_CITIES}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const json = (await res.json()) as { labels?: unknown };
        const next =
          json && Array.isArray(json.labels)
            ? (json.labels.filter((x) => typeof x === "string") as string[])
            : [];
        if (isMounted) setLabels(next.slice(0, MAX_CITIES));
      } catch {
        // ignore
      }
    }

    load();
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  // Handle mouse movement for parallax
  useEffect(() => {
    if (shouldReduceMotion) return;

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: (e.clientX / window.innerWidth - 0.5) * 50,
        y: (e.clientY / window.innerHeight - 0.5) * 50,
      };
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [shouldReduceMotion]);

  // Periodically change active labels with more variety
  // Optimized: Use Set for O(1) membership check instead of O(k) includes()
  useEffect(() => {
    if (shouldReduceMotion || labels.length === 0) {
      queueMicrotask(() => setActiveIndices([]));
      return;
    }

    const interval = setInterval(() => {
      const count = Math.floor(Math.random() * 4) + 3; // 3-6 active labels
      setActiveIndices((prev) => {
        // Use Set for O(1) lookups instead of O(k) includes()
        const activeSet = new Set(prev);
        const next = [...prev];
        if (next.length > 4) {
          const removed = next.shift();
          if (removed !== undefined) activeSet.delete(removed);
        }
        for (let i = 0; i < count; i++) {
          const idx = Math.floor(Math.random() * labels.length);
          // O(1) Set.has() instead of O(k) Array.includes()
          if (!activeSet.has(idx)) {
            next.push(idx);
            activeSet.add(idx);
          }
        }
        return next.slice(-8); // Keep max 8
      });
    }, 2500);
    return () => clearInterval(interval);
  }, [labels.length, shouldReduceMotion]);

  const points = useMemo(() => {
    const n = Math.max(0, Math.min(MAX_CITIES, labels.length || 0));
    return fibonacciSphere(n, SPHERE_RADIUS);
  }, [labels]);

  // Use pre-generated particle data (computed at module level to keep render pure)
  const particles = shouldReduceMotion ? [] : PARTICLE_DATA;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (shouldReduceMotion) {
      el.style.transform = "translate(-50%, -50%) rotateX(12deg) rotateY(-18deg)";
      return;
    }

    let t = 0;
    let currentX = 0;
    let currentY = 0;

    const tick = () => {
      t += 0.0006; // Slower, more elegant rotation

      currentX += (mouseRef.current.y - currentX) * 0.03;
      currentY += (mouseRef.current.x - currentY) * 0.03;

      const rotY = t * 6 + currentY;
      const rotX = 8 + Math.sin(t * 0.25) * 5 - currentX;
      const rotZ = Math.cos(t * 0.15) * 1.5;

      el.style.transform = `translate(-50%, -50%) rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg)`;
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [shouldReduceMotion]);

  // Pre-compute Set for O(1) active index lookups in render loop
  const activeIndicesSet = useMemo(() => new Set(activeIndices), [activeIndices]);

  return (
    <div className="city-sphere-layer bg-background pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Organic atlas wash */}
      <div
        className="absolute inset-0 opacity-30 dark:opacity-40"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 20% 40%, var(--color-leaf-soft), transparent 50%),
            radial-gradient(ellipse 60% 40% at 80% 60%, var(--color-water-soft), transparent 50%),
            radial-gradient(ellipse 50% 30% at 50% 80%, var(--color-earth-soft), transparent 50%)
          `,
        }}
      />

      {/* Fine terrain grain */}
      <div
        className="absolute inset-0 opacity-40 dark:opacity-50"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 0.5px, transparent 0)",
          backgroundSize: "40px 40px",
          color: "var(--color-foreground)",
        }}
      />

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden">
        {particles.map((p) => (
          <FloatingParticle
            key={p.id}
            delay={p.delay}
            duration={p.duration}
            size={p.size}
            startX={p.startX}
            startY={p.startY}
            colorIndex={p.colorIndex}
          />
        ))}
      </div>

      {/* Connection lines layer (subtle atlas grid) */}
      <div
        className="absolute inset-0 opacity-5 dark:opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(var(--pattern-terrain) 1px, transparent 1px),
            linear-gradient(90deg, var(--pattern-terrain) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      <div ref={containerRef} className="city-sphere">
        {points.map((p, i) => {
          const label = labels.at(i) ?? "";
          // O(1) Set.has() instead of O(k) Array.includes()
          const isActive = activeIndicesSet.has(i);
          const depth = (p.z / SPHERE_RADIUS + 1) / 2;

          // Enhanced visibility with color-based opacity
          const baseOpacity = 0.08 + depth * 0.25;
          const activeOpacity = 0.4 + depth * 0.6;
          const dotOpacity = isActive ? activeOpacity : baseOpacity;
          const labelOpacity = isActive ? 0.5 + depth * 0.5 : 0;

          const scale = 0.6 + depth * 0.5;
          const dotSize = isActive ? 6 : 2 + depth * 2;

          const nodeColor = getNodeColor(i, points.length, isActive);
          const glowColor = getGlowColor(i, points.length);

          return (
            <div
              key={`${label}-${i}`}
              className="absolute top-0 left-0 flex items-center gap-3"
              style={{
                transform: `translate3d(${p.x}px, ${p.y}px, ${p.z}px) scale(${scale})`,
                transition: "transform 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
                backfaceVisibility: "hidden",
                zIndex: Math.floor(depth * 100),
                willChange: "transform",
              }}
            >
              {/* Node with multi-layer glow */}
              <div className="relative flex items-center justify-center">
                {/* Outer glow ring */}
                {isActive && (
                  <>
                    <div
                      className="absolute animate-pulse rounded-full"
                      style={{
                        width: dotSize * 4,
                        height: dotSize * 4,
                        background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
                        opacity: 0.6,
                      }}
                    />
                    <div
                      className="absolute animate-ping rounded-full"
                      style={{
                        width: dotSize * 2.5,
                        height: dotSize * 2.5,
                        border: `1px solid ${glowColor}`,
                        opacity: 0.4,
                      }}
                    />
                  </>
                )}

                {/* Core dot */}
                <div
                  className="rounded-full transition-all duration-700"
                  style={{
                    width: dotSize,
                    height: dotSize,
                    background: nodeColor,
                    opacity: dotOpacity,
                    boxShadow: isActive
                      ? `0 0 ${dotSize * 3}px ${glowColor}, 0 0 ${dotSize * 6}px ${glowColor}`
                      : `0 0 ${dotSize}px ${glowColor}`,
                  }}
                />
              </div>

              {/* Label with glow effect */}
              <span
                className="text-[11px] font-black tracking-[0.15em] whitespace-nowrap uppercase transition-all duration-700"
                style={{
                  opacity: labelOpacity,
                  transform: `translateX(${isActive ? 0 : -12}px)`,
                  color: isActive ? nodeColor : "var(--color-foreground)",
                  textShadow: isActive
                    ? `0 0 8px ${glowColor}, 0 0 16px ${glowColor}, 0 0 24px ${glowColor}`
                    : "none",
                  filter: isActive ? "none" : "blur(2px)",
                }}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Central vignette with color tint */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background: `
            radial-gradient(circle at center, transparent 0%, transparent 20%, var(--color-background) 45%, var(--color-vignette-outer) 100%)
          `,
        }}
      />

      {/* Subtle color overlay vignette */}
      <div
        className="city-sphere-vignette absolute inset-0 z-10"
        style={{
          background: `
            radial-gradient(ellipse 120% 60% at 50% 35%, var(--color-leaf-soft), transparent 50%),
            radial-gradient(ellipse 100% 50% at 30% 70%, var(--color-water-soft), transparent 50%),
            radial-gradient(ellipse 80% 40% at 70% 60%, var(--color-earth-soft), transparent 50%)
          `,
        }}
      />
    </div>
  );
}

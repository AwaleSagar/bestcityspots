"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

type Point3 = { x: number; y: number; z: number };

const MAX_CITIES = 120; // More points for a "network" look
const SPHERE_RADIUS = 400;

function fibonacciSphere(n: number, radius: number): Point3[] {
  // Even distribution on a sphere (Fibonacci lattice)
  const pts: Point3[] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < n; i++) {
    const y = 1 - (i / Math.max(1, n - 1)) * 2; // 1..-1
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = goldenAngle * i;
    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;
    pts.push({ x: x * radius, y: y * radius, z: z * radius });
  }
  return pts;
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

  // Handle mouse movement for subtle parallax
  useEffect(() => {
    if (shouldReduceMotion) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: (e.clientX / window.innerWidth - 0.5) * 40,
        y: (e.clientY / window.innerHeight - 0.5) * 40,
      };
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [shouldReduceMotion]);

  // Periodically change which labels are "pulsing" or active
  useEffect(() => {
    const interval = setInterval(() => {
      const count = Math.floor(Math.random() * 3) + 2; // 2-4 active labels
      setActiveIndices(prev => {
        const next = [...prev];
        // Remove one old, add one or two new
        if (next.length > 3) next.shift();
        for (let i = 0; i < count; i++) {
          const idx = Math.floor(Math.random() * labels.length);
          if (!next.includes(idx)) next.push(idx);
        }
        return next.slice(-6); // Keep max 6
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [labels.length]);

  const points = useMemo(() => {
    const n = Math.max(0, Math.min(MAX_CITIES, labels.length || 0));
    return fibonacciSphere(n, SPHERE_RADIUS);
  }, [labels]);

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
      // Extremely slow, atmospheric drift
      t += 0.0008;
      
      // Smooth interpolation for mouse drift
      currentX += (mouseRef.current.y - currentX) * 0.05;
      currentY += (mouseRef.current.x - currentY) * 0.05;

      const rotY = t * 8 + currentY;
      const rotX = 10 + Math.sin(t * 0.3) * 4 - currentX;
      const rotZ = Math.cos(t * 0.2) * 2;
      
      el.style.transform = `translate(-50%, -50%) rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg)`;
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [shouldReduceMotion]);

  return (
    <div className="city-sphere-layer pointer-events-none fixed inset-0 z-0 overflow-hidden bg-background">
      {/* Deep space grain/starfield effect */}
      <div className="absolute inset-0 opacity-20 dark:opacity-20 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, var(--color-foreground) 1px, transparent 0)', backgroundSize: '48px 48px' }} />
      
      <div ref={containerRef} className="city-sphere">
        {points.map((p, i) => {
          const label = labels[i] ?? "";
          const isActive = activeIndices.includes(i);
          const depth = (p.z / SPHERE_RADIUS + 1) / 2; // 0 (back) to 1 (front)
          
          // Points are always visible but very subtle
          const dotOpacity = 0.04 + depth * 0.12;
          const labelOpacity = isActive ? (0.2 + depth * 0.6) : 0;
          
          const scale = 0.5 + depth * 0.5;
          const blurValue = isActive ? 0 : Math.max(0, (0.75 - depth) * 5);

          return (
            <div
              key={`${label}-${i}`}
              className="absolute top-0 left-0 flex items-center gap-2"
              style={{
                transform: `translate3d(${p.x}px, ${p.y}px, ${p.z}px) scale(${scale})`,
                transition: "transform 1s cubic-bezier(0.2, 0, 0.2, 1)",
                backfaceVisibility: "hidden",
                zIndex: Math.floor(depth * 100),
                willChange: 'transform',
              }}
            >
              {/* The "Node" or Dot with glow */}
              <div className="relative flex items-center justify-center">
                <div 
                  className={`h-1 w-1 rounded-full bg-blue-400 transition-all duration-1000 ${isActive ? 'scale-150 shadow-[0_0_12px_rgba(59,130,246,1)]' : ''}`}
                  style={{ opacity: isActive ? 1 : dotOpacity }}
                />
                {isActive && (
                  <div className="absolute h-4 w-4 rounded-full border border-blue-500/30 animate-ping" />
                )}
              </div>
              
              {/* The Label - only visible if active */}
              <span
                className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground transition-all duration-1000"
                style={{
                  opacity: labelOpacity,
                  filter: blurValue > 0 ? `blur(${blurValue}px)` : undefined,
                  transform: `translateX(${isActive ? 0 : -8}px)`,
                  textShadow: isActive ? '0 0 10px var(--color-background)' : 'none',
                }}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
      {/* Central vignette to keep the search area clean */}
      <div 
        className="absolute inset-0 z-10 pointer-events-none" 
        style={{
          background: 'radial-gradient(circle at center, transparent 0%, var(--color-background) 30%, var(--color-vignette-outer) 100%)'
        }}
      />
      <div className="city-sphere-vignette absolute inset-0 z-10 backdrop-blur-[0.5px]" />
    </div>
  );
}


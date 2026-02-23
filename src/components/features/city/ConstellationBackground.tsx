"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  brightness: number;
  twinkleSpeed: number;
  twinkleOffset: number;
  label?: string;
  connections: number[];
}

interface Connection {
  from: number;
  to: number;
  opacity: number;
}

const STAR_COUNT = 80;
const LABELED_STARS = 12;
const MAX_CONNECTIONS_PER_STAR = 3;
const CONNECTION_DISTANCE = 180;

// Color palette for stars
const STAR_COLORS = [
  { r: 255, g: 255, b: 255 }, // White
  { r: 200, g: 220, b: 255 }, // Blue-white
  { r: 255, g: 240, b: 200 }, // Warm white
  { r: 180, g: 200, b: 255 }, // Cool blue
  { r: 255, g: 200, b: 180 }, // Warm orange
];

// Vibrant color palette for labels
const LABEL_COLORS = [
  { r: 139, g: 92, b: 246 },  // Purple
  { r: 6, g: 182, b: 212 },   // Cyan
  { r: 236, g: 72, b: 153 },  // Pink
  { r: 251, g: 146, b: 60 },  // Orange
  { r: 34, g: 211, b: 238 },  // Teal
  { r: 167, g: 139, b: 250 }, // Light purple
  { r: 74, g: 222, b: 128 },  // Green
  { r: 251, g: 191, b: 36 },  // Amber
];

function getStarColor(brightness: number) {
  const color = STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)];
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${brightness})`;
}

function getLabelColor(index: number, opacity: number) {
  const color = LABEL_COLORS[index % LABEL_COLORS.length];
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${opacity})`;
}

function getLabelGlow(index: number) {
  const color = LABEL_COLORS[index % LABEL_COLORS.length];
  return `rgba(${color.r}, ${color.g}, ${color.b}, 0.5)`;
}

function generateStars(count: number, labels: string[]): Star[] {
  const stars: Star[] = [];
  const labeledIndices = new Set<number>();

  // Select which stars will have labels (spread across the canvas)
  while (labeledIndices.size < Math.min(LABELED_STARS, labels.length, count)) {
    labeledIndices.add(Math.floor(Math.random() * count));
  }

  const labelArray = [...labeledIndices];

  for (let i = 0; i < count; i++) {
    const isLabeled = labeledIndices.has(i);
    stars.push({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: isLabeled ? 3 + Math.random() * 2 : 1 + Math.random() * 2,
      brightness: isLabeled ? 0.8 + Math.random() * 0.2 : 0.3 + Math.random() * 0.5,
      twinkleSpeed: 0.3 + Math.random() * 0.5, // Much slower breathing
      twinkleOffset: Math.random() * Math.PI * 2,
      label: isLabeled ? labels[labelArray.indexOf(i) % labels.length] : undefined,
      connections: [],
    });
  }

  return stars;
}

/**
 * Grid-based spatial indexing for O(n) connection generation
 * Instead of O(n²) checking all pairs, we only check nearby cells
 */
function buildSpatialGrid(stars: Star[], cellSize: number): Map<string, Star[]> {
  const grid = new Map<string, Star[]>();
  for (const star of stars) {
    const cellX = Math.floor(star.x / cellSize);
    const cellY = Math.floor(star.y / cellSize);
    const key = `${cellX},${cellY}`;
    const cell = grid.get(key);
    if (cell) {
      cell.push(star);
    } else {
      grid.set(key, [star]);
    }
  }
  return grid;
}

function getNeighborStars(grid: Map<string, Star[]>, star: Star, cellSize: number): Star[] {
  const cellX = Math.floor(star.x / cellSize);
  const cellY = Math.floor(star.y / cellSize);
  const neighbors: Star[] = [];
  
  // Check current cell and 8 adjacent cells
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const key = `${cellX + dx},${cellY + dy}`;
      const cell = grid.get(key);
      if (cell) {
        for (const other of cell) {
          if (other.id !== star.id) {
            neighbors.push(other);
          }
        }
      }
    }
  }
  return neighbors;
}

function generateConnections(stars: Star[]): Connection[] {
  const connections: Connection[] = [];
  const connectionCounts = new Map<number, number>();
  // Use Set for O(1) duplicate detection instead of O(c) array.some()
  const connectionSet = new Set<string>();

  stars.forEach((star) => connectionCounts.set(star.id, 0));

  // Grid cell size based on connection distance (in percentage units)
  // CONNECTION_DISTANCE is 180, scaled by 10 = 18 units
  const cellSize = CONNECTION_DISTANCE / 10;
  const grid = buildSpatialGrid(stars, cellSize);

  for (let i = 0; i < stars.length; i++) {
    // eslint-disable-next-line security/detect-object-injection
    const star = stars[i];
    const currentCount = connectionCounts.get(star.id) || 0;

    if (currentCount >= MAX_CONNECTIONS_PER_STAR) continue;

    // Only check stars in nearby grid cells - O(k) where k is local density
    const nearbyStars = getNeighborStars(grid, star, cellSize);
    
    // Find nearby stars to connect (filter by distance and connection count)
    const candidates: Star[] = [];
    for (const other of nearbyStars) {
      const otherCount = connectionCounts.get(other.id) || 0;
      if (otherCount >= MAX_CONNECTIONS_PER_STAR) continue;

      const dx = (star.x - other.x) * 10; // Scale for percentage
      const dy = (star.y - other.y) * 10;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < CONNECTION_DISTANCE / 10) {
        candidates.push(other);
      }
      
      if (candidates.length >= MAX_CONNECTIONS_PER_STAR - currentCount) break;
    }

    for (const other of candidates) {
      // O(1) duplicate check using Set
      const connKey = star.id < other.id 
        ? `${star.id}-${other.id}` 
        : `${other.id}-${star.id}`;
      
      if (!connectionSet.has(connKey)) {
        connectionSet.add(connKey);
        
        const dx = (star.x - other.x) * 10;
        const dy = (star.y - other.y) * 10;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const opacity = Math.max(0.1, 0.4 - distance / (CONNECTION_DISTANCE / 10) * 0.3);

        connections.push({
          from: star.id,
          to: other.id,
          opacity,
        });

        star.connections.push(other.id);
        other.connections.push(star.id);
        connectionCounts.set(star.id, (connectionCounts.get(star.id) || 0) + 1);
        connectionCounts.set(other.id, (connectionCounts.get(other.id) || 0) + 1);
      }
    }
  }

  return connections;
}

export default function ConstellationBackground() {
  const shouldReduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const timeRef = useRef(0);

  const [labels, setLabels] = useState<string[]>([]);

  // Fetch city labels
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function load() {
      try {
        const res = await fetch("/api/cities/sphere?limit=50", {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const json = (await res.json()) as { labels?: unknown };
        const next =
          json && Array.isArray(json.labels)
            ? (json.labels.filter((x) => typeof x === "string") as string[])
            : [];
        if (isMounted) setLabels(next);
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

  const { stars, connections } = useMemo(() => {
    const generatedStars = generateStars(STAR_COUNT, labels);
    const generatedConnections = generateConnections(generatedStars);
    return { stars: generatedStars, connections: generatedConnections };
  }, [labels]);

  // Mouse tracking for parallax
  useEffect(() => {
    if (shouldReduceMotion) return;

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      };
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [shouldReduceMotion]);

  // Canvas animation
  useEffect(() => {
    const animate = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;

      // Resize canvas if needed
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
      }

      ctx.clearRect(0, 0, width, height);

      timeRef.current += 0.008; // Slower animation for breathing effect
      const time = timeRef.current;

      // Parallax offset based on mouse
      const parallaxX = (mouseRef.current.x - 0.5) * 20;
      const parallaxY = (mouseRef.current.y - 0.5) * 20;

      // Draw connections first
      connections.forEach((conn) => {
        const fromStar = stars[conn.from];
        const toStar = stars[conn.to];
        if (!fromStar || !toStar) return;

        const x1 = (fromStar.x / 100) * width + parallaxX * (fromStar.brightness * 0.5);
        const y1 = (fromStar.y / 100) * height + parallaxY * (fromStar.brightness * 0.5);
        const x2 = (toStar.x / 100) * width + parallaxX * (toStar.brightness * 0.5);
        const y2 = (toStar.y / 100) * height + parallaxY * (toStar.brightness * 0.5);

        // Subtle pulse on connections - slower breathing
        const pulse = 0.8 + Math.sin(time * 0.3 + conn.from * 0.1) * 0.2;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = `rgba(150, 180, 255, ${conn.opacity * pulse * 0.4})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      });

      // Draw stars
      stars.forEach((star) => {
        const x = (star.x / 100) * width + parallaxX * (star.brightness * 0.5);
        const y = (star.y / 100) * height + parallaxY * (star.brightness * 0.5);

        // Twinkling effect
        const twinkle = shouldReduceMotion
          ? 1
          : 0.6 + Math.sin(time * star.twinkleSpeed + star.twinkleOffset) * 0.4;
        const currentBrightness = star.brightness * twinkle;
        const currentSize = star.size * (0.8 + twinkle * 0.2);

        // Outer glow
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, currentSize * 4);
        gradient.addColorStop(0, `rgba(200, 220, 255, ${currentBrightness * 0.3})`);
        gradient.addColorStop(0.5, `rgba(180, 200, 255, ${currentBrightness * 0.1})`);
        gradient.addColorStop(1, "transparent");

        ctx.beginPath();
        ctx.arc(x, y, currentSize * 4, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Core star
        ctx.beginPath();
        ctx.arc(x, y, currentSize, 0, Math.PI * 2);
        ctx.fillStyle = getStarColor(currentBrightness);
        ctx.fill();

        // Draw label if exists - colorful, bigger, bolder
        if (star.label && currentBrightness > 0.4) {
          const labelOpacity = Math.min(1, (currentBrightness - 0.4) * 1.8);
          const colorIndex = star.id % LABEL_COLORS.length;

          // Draw glow behind text
          ctx.font = "800 14px system-ui, -apple-system, sans-serif";
          ctx.shadowColor = getLabelGlow(colorIndex);
          ctx.shadowBlur = 12;
          ctx.fillStyle = getLabelColor(colorIndex, labelOpacity * 0.9);
          ctx.textAlign = "left";
          ctx.fillText(star.label.toUpperCase(), x + currentSize * 3 + 6, y + 4);

          // Reset shadow
          ctx.shadowBlur = 0;
        }
      });

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [stars, connections, shouldReduceMotion]);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-background"
    >
      {/* Subtle gradient overlay */}
      <div
        className="absolute inset-0 opacity-30 dark:opacity-50"
        style={{
          background: `
            radial-gradient(ellipse 100% 60% at 30% 20%, rgba(100, 120, 180, 0.1), transparent 50%),
            radial-gradient(ellipse 80% 50% at 70% 80%, rgba(80, 100, 160, 0.08), transparent 50%)
          `,
        }}
      />

      {/* Star canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ opacity: 0.9 }}
      />

      {/* Central vignette */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: `radial-gradient(circle at center, transparent 0%, transparent 25%, var(--color-background) 50%, var(--color-vignette-outer) 100%)`,
        }}
      />

      {/* Subtle noise texture */}
      <div
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}

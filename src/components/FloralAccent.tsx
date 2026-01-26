"use client";

import React from "react";

/**
 * Subtle floral accent component that adds a vacation vibe to the site.
 * Positioned absolutely behind all content with low opacity and soft blending.
 */
export default function FloralAccent() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* Top-right tropical accent - Palm Leaf & Hibiscus */}
      <div className="absolute -right-[10%] -top-[10%] h-[700px] w-[700px] opacity-[0.12] dark:opacity-[0.15] animate-float-slow">
        <svg
          viewBox="0 0 500 500"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full"
        >
          <defs>
            <linearGradient id="tropicalGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.4" className="text-teal-400 dark:text-teal-300" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" className="text-blue-500 dark:text-blue-400" />
            </linearGradient>
            <filter id="tropicalBlur">
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
            </filter>
          </defs>

          <g filter="url(#tropicalBlur)" className="text-teal-500/40 dark:text-cyan-400/30">
            {/* Palm Leaf Shape */}
            <path
              d="M350 50 Q300 150 200 250 Q250 220 280 180 M200 250 Q230 240 260 220 M200 250 Q180 200 190 150 M200 250 Q150 220 120 180 M200 250 Q140 270 100 260"
              stroke="url(#tropicalGradient1)"
              strokeWidth="25"
              strokeLinecap="round"
              fill="none"
              transform="rotate(-15 250 250)"
            />
            {/* Hibiscus Abstract */}
            <path
              d="M 400 100 C 450 150 450 250 400 300 C 350 250 350 150 400 100 Z"
              fill="url(#tropicalGradient1)"
              transform="rotate(45 400 200)"
              opacity="0.6"
            />
            <path
              d="M 400 100 C 450 150 450 250 400 300 C 350 250 350 150 400 100 Z"
              fill="url(#tropicalGradient1)"
              transform="rotate(135 400 200)"
              opacity="0.6"
            />
          </g>
        </svg>
      </div>

      {/* Bottom-left Monstera Leaf abstract */}
      <div className="absolute -bottom-[10%] -left-[5%] h-[600px] w-[600px] opacity-[0.08] dark:opacity-[0.12] animate-float-delayed">
        <svg
          viewBox="0 0 500 500"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full"
        >
          <defs>
            <linearGradient id="tropicalGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" className="text-emerald-400 dark:text-emerald-300" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" className="text-teal-600 dark:text-teal-500" />
            </linearGradient>
            <filter id="tropicalBlur2">
              <feGaussianBlur in="SourceGraphic" stdDeviation="8" />
            </filter>
          </defs>

          <g filter="url(#tropicalBlur2)" className="text-emerald-500/30 dark:text-teal-400/20">
            {/* Monstera-like organic shape */}
            <path
              d="M150 350 C 50 250 100 100 250 100 C 400 100 450 250 350 350 C 250 450 100 400 150 350 Z"
              fill="url(#tropicalGradient2)"
              transform="rotate(20 250 250)"
            />
            {/* Cutouts */}
            <circle cx="200" cy="200" r="30" fill="var(--background)" fillOpacity="0.1" />
            <circle cx="300" cy="250" r="20" fill="var(--background)" fillOpacity="0.1" />
          </g>
        </svg>
      </div>

      <style jsx>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(2deg); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(-2deg); }
        }
        .animate-float-slow {
          animation: float-slow 15s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 18s ease-in-out infinite reverse;
        }
      `}</style>
    </div>
  );
}

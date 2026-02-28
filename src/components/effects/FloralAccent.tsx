"use client";

import React from "react";

export default function FloralAccent() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* Top-right accent */}
      <div className="absolute -right-[10%] -top-[10%] h-[700px] w-[700px] opacity-[0.08] dark:opacity-[0.1] animate-float-slow">
        <svg
          viewBox="0 0 500 500"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full"
        >
          <defs>
            <linearGradient id="tropicalGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" className="text-orange-400 dark:text-orange-400" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" className="text-violet-500 dark:text-violet-400" />
            </linearGradient>
            <filter id="tropicalBlur">
              <feGaussianBlur in="SourceGraphic" stdDeviation="8" />
            </filter>
          </defs>

          <g filter="url(#tropicalBlur)" className="text-orange-400/30 dark:text-orange-400/20">
            <path
              d="M350 50 Q300 150 200 250 Q250 220 280 180 M200 250 Q230 240 260 220 M200 250 Q180 200 190 150 M200 250 Q150 220 120 180 M200 250 Q140 270 100 260"
              stroke="url(#tropicalGradient1)"
              strokeWidth="20"
              strokeLinecap="round"
              fill="none"
              transform="rotate(-15 250 250)"
            />
            <path
              d="M 400 100 C 450 150 450 250 400 300 C 350 250 350 150 400 100 Z"
              fill="url(#tropicalGradient1)"
              transform="rotate(45 400 200)"
              opacity="0.4"
            />
            <path
              d="M 400 100 C 450 150 450 250 400 300 C 350 250 350 150 400 100 Z"
              fill="url(#tropicalGradient1)"
              transform="rotate(135 400 200)"
              opacity="0.4"
            />
          </g>
        </svg>
      </div>

      {/* Bottom-left organic shape */}
      <div className="absolute -bottom-[10%] -left-[5%] h-[600px] w-[600px] opacity-[0.06] dark:opacity-[0.08] animate-float-delayed">
        <svg
          viewBox="0 0 500 500"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full"
        >
          <defs>
            <linearGradient id="tropicalGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" className="text-violet-400 dark:text-violet-300" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" className="text-orange-400 dark:text-orange-400" />
            </linearGradient>
            <filter id="tropicalBlur2">
              <feGaussianBlur in="SourceGraphic" stdDeviation="10" />
            </filter>
          </defs>

          <g filter="url(#tropicalBlur2)" className="text-violet-500/20 dark:text-orange-400/15">
            <path
              d="M150 350 C 50 250 100 100 250 100 C 400 100 450 250 350 350 C 250 450 100 400 150 350 Z"
              fill="url(#tropicalGradient2)"
              transform="rotate(20 250 250)"
            />
            <circle cx="200" cy="200" r="30" fill="var(--background)" fillOpacity="0.08" />
            <circle cx="300" cy="250" r="20" fill="var(--background)" fillOpacity="0.08" />
          </g>
        </svg>
      </div>

      <style jsx>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(1.5deg); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(-1.5deg); }
        }
        .animate-float-slow {
          animation: float-slow 20s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 24s ease-in-out infinite reverse;
        }
      `}</style>
    </div>
  );
}

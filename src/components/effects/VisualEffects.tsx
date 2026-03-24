"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Terminal, Shield, Cpu, Activity, Database, Globe } from "lucide-react";
import { usePathname } from "next/navigation";
import CitySphereBackground from "@/components/features/city/CitySphereBackground";

export default function VisualEffects() {
  const pathname = usePathname();
  const showSphere = pathname === "/";
  const [isAtlasMode, setIsAtlasMode] = useState(false);
  const inputBufferRef = useRef("");

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const char = e.key.toLowerCase();
    if (/^[a-z]$/.test(char)) {
      const next = (inputBufferRef.current + char).slice(-5); // Keep last 5 chars
      if (next === "atlas") {
        setIsAtlasMode(true);
        inputBufferRef.current = "";
      } else {
        inputBufferRef.current = next;
      }
    } else if (e.key === "Escape") {
      setIsAtlasMode(false);
      inputBufferRef.current = "";
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <>
      {showSphere && <CitySphereBackground />}

      {/* Atlas Mode Terminal Overlay */}
      <AnimatePresence>
        {isAtlasMode && (
          <div
            onClick={() => setIsAtlasMode(false)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm p-6"
            role="dialog"
            aria-modal="true"
            aria-label="Atlas system diagnostics"
          >
            <div
              className="w-full max-w-2xl rounded-xl border border-line bg-surface p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft">
                    <Terminal className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold tracking-wider text-muted uppercase">
                      System Diagnostics
                    </div>
                    <div className="text-base font-bold tracking-tight text-foreground">
                      ATLAS CORE v1.0.1
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsAtlasMode(false)}
                  className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted hover:bg-surface-strong"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Shield, label: "Security Layer", val: "ACTIVE // AES-256" },
                  { icon: Cpu, label: "Neural Engine", val: "GEMINI 1.5 PRO" },
                  { icon: Activity, label: "Data Stream", val: "4.8 GBPS // REAL-TIME" },
                  { icon: Database, label: "Caching Layer", val: "SUPABASE // EDGE" },
                  { icon: Globe, label: "Global Nodes", val: "CITIES_INTEL.V4" },
                  { icon: Activity, label: "Uptime", val: "99.982% // SYNC" },
                ].map((item, i) => (
                  <div key={i} className="rounded-lg border border-line bg-surface-strong p-3">
                    <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
                      <item.icon className="h-3 w-3" />
                      {item.label}
                    </div>
                    <div className="font-mono text-xs text-accent">{item.val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

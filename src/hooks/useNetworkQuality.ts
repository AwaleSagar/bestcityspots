"use client";

import { useState, useEffect } from "react";
import type { QualityTier } from "@/lib/image-transforms";

export type { QualityTier };

// Extend Navigator to include connection API (not in all browsers)
interface NetworkInformation extends EventTarget {
  effectiveType: "slow-2g" | "2g" | "3g" | "4g";
  saveData: boolean;
  downlink: number;
  rtt: number;
  addEventListener(type: "change", listener: () => void): void;
  removeEventListener(type: "change", listener: () => void): void;
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformation;
  mozConnection?: NetworkInformation;
  webkitConnection?: NetworkInformation;
}

interface NetworkQualityState {
  /** Quality tier for image loading: high, medium, or low */
  quality: QualityTier;
  /** Whether the user has enabled data saver mode */
  saveData: boolean;
  /** Device pixel ratio for retina displays */
  dpr: number;
  /** Effective connection type if available */
  effectiveType: string | null;
  /** Whether the connection API is supported */
  isSupported: boolean;
}

// Helper functions outside the hook for stability
function getConnection(): NetworkInformation | undefined {
  if (typeof navigator === "undefined") return undefined;
  const nav = navigator as NavigatorWithConnection;
  return nav.connection || nav.mozConnection || nav.webkitConnection;
}

function determineQuality(connection: NetworkInformation | undefined): QualityTier {
  // If data saver is enabled, always use low quality
  if (connection?.saveData) return "low";

  // Determine quality based on effective connection type
  const effectiveType = connection?.effectiveType;
  switch (effectiveType) {
    case "slow-2g":
    case "2g":
      return "low";
    case "3g":
      return "medium";
    case "4g":
    default:
      return "high";
  }
}

// Default state for SSR and initial render
const defaultState: NetworkQualityState = {
  quality: "high",
  saveData: false,
  dpr: 1,
  effectiveType: null,
  isSupported: false,
};

/**
 * Hook to detect network quality and device capabilities for adaptive image loading
 *
 * Uses the Network Information API where available, with sensible fallbacks.
 * Returns quality tier (high/medium/low) based on:
 * - Connection effective type (4g, 3g, 2g, slow-2g)
 * - Data saver preference
 * - Estimated bandwidth
 */
export function useNetworkQuality(): NetworkQualityState {
  const [state, setState] = useState<NetworkQualityState>(defaultState);

  useEffect(() => {
    const connection = getConnection();

    const updateState = (conn: NetworkInformation | undefined) => {
      setState({
        quality: determineQuality(conn),
        saveData: conn?.saveData ?? false,
        dpr: Math.min(window.devicePixelRatio || 1, 3),
        effectiveType: conn?.effectiveType ?? null,
        isSupported: !!conn,
      });
    };

    // Set initial state
    updateState(connection);

    // Listen for network changes
    if (connection) {
      const handler = () => updateState(connection);
      connection.addEventListener("change", handler);
      return () => {
        connection.removeEventListener("change", handler);
      };
    }
  }, []);

  return state;
}

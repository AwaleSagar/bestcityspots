"use client";

import { useState, useEffect, useRef } from "react";

export interface DeviceType {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  hasCoarsePointer: boolean;
  isVirtualKeyboardOpen: boolean;
}

const SSR_DEFAULTS: DeviceType = {
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  hasCoarsePointer: false,
  isVirtualKeyboardOpen: false,
};

const KEYBOARD_HEIGHT_THRESHOLD = 150;

export function useDeviceType(): DeviceType {
  const [state, setState] = useState<DeviceType>(SSR_DEFAULTS);
  const initialViewportHeight = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mobileMq = window.matchMedia("(max-width: 768px)");
    const tabletMq = window.matchMedia("(min-width: 769px) and (max-width: 1024px)");
    const coarseMq = window.matchMedia("(pointer: coarse)");

    const syncBreakpoints = () => {
      const mobile = mobileMq.matches;
      const tablet = tabletMq.matches;
      setState((prev) => ({
        ...prev,
        isMobile: mobile,
        isTablet: tablet,
        isDesktop: !mobile && !tablet,
        hasCoarsePointer: coarseMq.matches,
      }));
    };

    syncBreakpoints();

    mobileMq.addEventListener("change", syncBreakpoints);
    tabletMq.addEventListener("change", syncBreakpoints);
    coarseMq.addEventListener("change", syncBreakpoints);

    // Virtual keyboard detection via visualViewport
    initialViewportHeight.current =
      window.visualViewport?.height ?? window.innerHeight;

    const handleViewportResize = () => {
      if (!window.visualViewport) return;
      const current = window.visualViewport.height;

      // Track the largest viewport height seen (accounts for orientation changes)
      if (current > initialViewportHeight.current) {
        initialViewportHeight.current = current;
      }

      const shrunk =
        initialViewportHeight.current - current > KEYBOARD_HEIGHT_THRESHOLD;

      setState((prev) => ({
        ...prev,
        isVirtualKeyboardOpen: shrunk && coarseMq.matches,
      }));
    };

    let fallbackHandler: (() => void) | null = null;

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleViewportResize);
    } else {
      // Fallback for browsers without visualViewport
      fallbackHandler = () => {
        const shrunk =
          window.outerHeight - window.innerHeight > KEYBOARD_HEIGHT_THRESHOLD;
        const active = document.activeElement?.tagName === "INPUT";
        setState((prev) => ({
          ...prev,
          isVirtualKeyboardOpen: shrunk && coarseMq.matches && active,
        }));
      };
      window.addEventListener("resize", fallbackHandler);
    }

    return () => {
      mobileMq.removeEventListener("change", syncBreakpoints);
      tabletMq.removeEventListener("change", syncBreakpoints);
      coarseMq.removeEventListener("change", syncBreakpoints);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener(
          "resize",
          handleViewportResize,
        );
      }
      if (fallbackHandler) {
        window.removeEventListener("resize", fallbackHandler);
      }
    };
  }, []);

  return state;
}

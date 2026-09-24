"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useHydrated } from "@/hooks/useStoredValue";
import { IconButton } from "@/components/ui/IconButton";
import { SegmentedControl } from "@/components/ui/SegmentedControl";

type ThemeChoice = "system" | "light" | "dark";

/** Header quick toggle between light and dark. */
export function ThemeToggle({ className }: { className?: string }) {
  const hydrated = useHydrated();
  const { resolvedTheme, setTheme } = useTheme();
  if (!hydrated) return <span aria-hidden className={`inline-block size-11 ${className ?? ""}`} />;
  const isDark = resolvedTheme === "dark";
  return (
    <IconButton
      label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={className}
    >
      {isDark ? <Sun aria-hidden /> : <Moon aria-hidden />}
    </IconButton>
  );
}

const OPTIONS = [
  { value: "system", label: <Monitor aria-hidden />, ariaLabel: "System theme" },
  { value: "light", label: <Sun aria-hidden />, ariaLabel: "Light theme" },
  { value: "dark", label: <Moon aria-hidden />, ariaLabel: "Dark theme" },
] as const;

/** Explicit three-way choice (footer + mobile menu). */
export function ThemeSwitcher() {
  const hydrated = useHydrated();
  const { theme, setTheme } = useTheme();
  const value: ThemeChoice = hydrated && (theme === "light" || theme === "dark") ? theme : "system";
  return (
    <SegmentedControl<ThemeChoice>
      label="Color theme"
      options={OPTIONS}
      value={value}
      onChange={setTheme}
    />
  );
}

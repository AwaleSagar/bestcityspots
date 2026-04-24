"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { IconButton } from "@/components/atlas";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <span
        className="inline-block h-11 w-11 rounded-[var(--radius-md)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)]"
        aria-hidden
      />
    );
  }

  const isDark = resolvedTheme === "dark";
  return (
    <IconButton
      variant="outline"
      label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </IconButton>
  );
}

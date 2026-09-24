"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Transient confirmation message ("Link copied") with auto-dismiss. */
export function useToast(durationMs = 2600) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const show = useCallback(
    (next: string) => {
      window.clearTimeout(timer.current);
      setMessage(next);
      timer.current = window.setTimeout(() => setMessage(null), durationMs);
    },
    [durationMs]
  );

  return { message, show };
}

/** Always-mounted polite live region so screen readers hear each message. */
export function Toast({ message }: { message: string | null }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
    >
      {message ? (
        <p className="bg-ink text-paper shadow-overlay rounded-full px-4 py-2 text-sm font-medium">
          {message}
        </p>
      ) : null}
    </div>
  );
}

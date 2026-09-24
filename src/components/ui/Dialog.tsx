"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "./cn";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  /** id of the element that names the dialog. */
  labelledBy: string;
  variant?: "center" | "sheet";
  className?: string;
  children: ReactNode;
}

/**
 * Native modal <dialog>: the browser provides the focus trap, Escape to
 * close and an inert background. We add backdrop-click to close, restore
 * focus to the opener and lock page scroll while open.
 */
export function Dialog({
  open,
  onClose,
  labelledBy,
  variant = "center",
  className,
  children,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<Element | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      openerRef.current = document.activeElement;
      dialog.showModal();
      document.documentElement.style.overflow = "hidden";
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const handleClose = () => {
      document.documentElement.style.overflow = "";
      const opener = openerRef.current;
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
      onCloseRef.current();
    };
    dialog.addEventListener("close", handleClose);
    return () => {
      dialog.removeEventListener("close", handleClose);
      document.documentElement.style.overflow = "";
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      data-variant={variant}
      onClick={(event) => {
        // Clicks on the ::backdrop target the <dialog> element itself.
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
      className={cn(
        "overlay-dialog border-rule bg-surface text-ink shadow-overlay m-0 max-h-none max-w-none border p-0",
        variant === "center"
          ? "mx-auto mt-[min(12vh,6rem)] w-[min(40rem,calc(100vw-2rem))] rounded-lg"
          : "ml-auto h-dvh w-[min(22rem,100vw)] rounded-none border-y-0 border-r-0",
        className
      )}
    >
      {children}
    </dialog>
  );
}

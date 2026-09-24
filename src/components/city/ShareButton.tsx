"use client";

import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Toast, useToast } from "@/components/ui/Toast";

/** Share the canonical guide URL (Web Share sheet, else copy to clipboard). */
export function ShareButton({ url, title }: { url: string; title: string }) {
  const toast = useToast();
  const share = async () => {
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.show("Link copied");
    } catch (error) {
      if ((error as Error).name !== "AbortError")
        toast.show("Couldn't share — copy the address bar link instead");
    }
  };
  return (
    <>
      <Button onClick={share}>
        <Share2 aria-hidden />
        Share
      </Button>
      <Toast message={toast.message} />
    </>
  );
}

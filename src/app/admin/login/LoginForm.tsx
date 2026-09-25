"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { requestMagicLink, type MagicLinkState } from "../actions";

const INITIAL: MagicLinkState = { status: "idle" };

export function LoginForm() {
  const inputId = useId();
  const [state, formAction, pending] = useActionState(requestMagicLink, INITIAL);

  if (state.status === "sent") {
    return (
      <Notice title="Check your inbox" live>
        If that address belongs to an admin, a sign-in link is on its way. It works once and expires
        in 15 minutes.
      </Notice>
    );
  }

  return (
    <form action={formAction} className="max-w-sm space-y-4">
      <div>
        <label htmlFor={inputId} className="text-sm font-medium">
          Email
        </label>
        <input
          id={inputId}
          name="email"
          type="email"
          required
          autoComplete="email"
          maxLength={320}
          className="border-rule-strong bg-surface placeholder:text-ink-subtle mt-1.5 h-11 w-full rounded-md border px-3 text-base"
          aria-invalid={state.status === "invalid" || undefined}
        />
      </div>
      {state.status === "invalid" ? (
        <Notice tone="warning" live>
          Enter a valid email address.
        </Notice>
      ) : null}
      {state.status === "unavailable" ? (
        <Notice tone="warning" live>
          Sign-in isn&apos;t configured on this deployment.
        </Notice>
      ) : null}
      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? "Sending…" : "Email me a sign-in link"}
      </Button>
    </form>
  );
}

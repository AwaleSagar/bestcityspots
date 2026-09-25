import type { Metadata } from "next";
import type { ReactNode } from "react";

// Operational pages for invite-only admins — never indexed or cached.
export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false },
};

// Per-request rendering always: these pages depend on the session cookie and
// must never be prerendered or cached (even in a build without Supabase env).
export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { getAdminContext } from "@/lib/supabase-admin";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const context = await getAdminContext();
  if (context.status === "admin") redirect("/admin");
  const { error } = await searchParams;

  return (
    <main id="main-content">
      <Container>
        <PageHeader
          title="Admin sign-in"
          lede="Access is invite-only. Enter your admin email and we'll send a one-time link."
        />
        <div className="space-y-6 pb-16">
          {error === "link" ? (
            <Notice tone="warning" title="That link didn't work">
              Sign-in links expire after 15 minutes and work once. Request a new one below.
            </Notice>
          ) : null}
          <LoginForm />
        </div>
      </Container>
    </main>
  );
}

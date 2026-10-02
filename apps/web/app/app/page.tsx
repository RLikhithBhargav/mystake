import Link from "next/link";
import { redirect } from "next/navigation";

import { resolveAccess } from "@/lib/access";
import { isSupabaseConfigured } from "@/lib/env";
import { ApiStatus } from "../api-status";
import { SignOutButton } from "../sign-out-button";

export default async function AppShellPage() {
  if (!isSupabaseConfigured()) {
    redirect("/login");
  }

  const access = await resolveAccess();
  if (!access) {
    redirect("/login");
  }
  if (!access.accessGranted) {
    redirect("/access");
  }

  return (
    <main>
      <span className="tag">Authenticated shell</span>
      <h1>MyStake</h1>
      <p className="muted">
        Signed in as <strong>{access.email}</strong>
        {access.isAdmin ? " · admin" : ""}. Onboarding and coach chat land in later phases.
      </p>

      <div className="card">
        <div className="status-row">
          <span className="dot ok" />
          <span>Access granted — allowlist or invite.</span>
        </div>
      </div>

      <div className="card">
        <ApiStatus />
      </div>

      <div className="card actions-row">
        <SignOutButton />
        {access.isAdmin ? (
          <Link href="/admin" className="btn btn-secondary">
            Admin
          </Link>
        ) : null}
      </div>

      <p className="muted" style={{ marginTop: 24, fontSize: 13 }}>
        Not a broker and not registered investment advice — informational coaching only.
      </p>
    </main>
  );
}

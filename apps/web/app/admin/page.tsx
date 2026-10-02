import Link from "next/link";
import { redirect } from "next/navigation";

import { resolveAccess } from "@/lib/access";
import { isSupabaseConfigured } from "@/lib/env";
import { SignOutButton } from "../sign-out-button";

import { AdminPanel } from "./admin-panel";
import { listAllowlist, listInvites } from "./actions";

export default async function AdminPage() {
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
  if (!access.isAdmin) {
    redirect("/app");
  }

  const [allowlist, invites] = await Promise.all([listAllowlist(), listInvites()]);

  return (
    <main>
      <span className="tag">Owner admin</span>
      <h1>Access control</h1>
      <p className="muted">
        Add allowlisted emails and create single-use invite codes. Signed in as {access.email}.
      </p>

      <AdminPanel initialAllowlist={allowlist} initialInvites={invites} />

      <div className="card actions-row">
        <Link href="/app" className="btn btn-secondary">
          Back to app
        </Link>
        <SignOutButton />
      </div>
    </main>
  );
}

import { redirect } from "next/navigation";

import { AppNav } from "@/components/app-nav";
import { resolveAccess } from "@/lib/access";
import { isSupabaseConfigured } from "@/lib/env";

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
      <AppNav email={access.email} isAdmin={access.isAdmin} active="admin" />

      <div className="page-hero">
        <span className="page-kicker">Owner</span>
        <h1>Access control</h1>
        <p className="lede">
          Allowlist emails and create single-use invite codes. Signed in as {access.email}.
        </p>
      </div>

      <AdminPanel initialAllowlist={allowlist} initialInvites={invites} />
    </main>
  );
}

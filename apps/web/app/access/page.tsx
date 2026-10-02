import Link from "next/link";
import { redirect } from "next/navigation";

import { resolveAccess } from "@/lib/access";
import { isSupabaseConfigured } from "@/lib/env";

import { InviteRedeemForm } from "./invite-redeem-form";
import { SignOutButton } from "../sign-out-button";

export default async function AccessPage() {
  if (!isSupabaseConfigured()) {
    redirect("/login");
  }

  const access = await resolveAccess();
  if (!access) {
    redirect("/login");
  }
  if (access.accessGranted) {
    redirect("/app");
  }

  return (
    <main>
      <span className="tag">Access required</span>
      <h1>You’re signed in, but not allowlisted</h1>
      <p className="muted">
        Signed in as <strong>{access.email}</strong>. Ask the owner to add your email, or redeem an
        invite code below.
      </p>

      <div className="card">
        <h2 className="section-title">Redeem invite</h2>
        <InviteRedeemForm />
      </div>

      <div className="card actions-row">
        <SignOutButton />
        <Link href="/login" className="muted">
          Use a different account
        </Link>
      </div>
    </main>
  );
}

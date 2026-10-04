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
      <div className="page-hero">
        <span className="page-kicker">Access required</span>
        <h1>Signed in, not allowlisted</h1>
        <p className="lede">
          You’re in as <strong>{access.email}</strong>. Ask the owner to add your email, or redeem
          an invite code below.
        </p>
      </div>

      <div className="card">
        <h2 className="section-title">Redeem invite</h2>
        <p className="section-sub">Single-use codes unlock access for your account.</p>
        <InviteRedeemForm />
      </div>

      <div className="card card-quiet actions-row">
        <SignOutButton />
        <Link href="/login" className="btn btn-ghost">
          Use a different account
        </Link>
      </div>
    </main>
  );
}

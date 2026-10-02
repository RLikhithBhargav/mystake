import Link from "next/link";
import { redirect } from "next/navigation";

import { resolveAccess } from "@/lib/access";
import { isSupabaseConfigured } from "@/lib/env";
import { riskLabel } from "@/lib/portfolio";
import { getPortfolioProfile, listHoldings } from "@/lib/portfolio-data";
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

  const profile = await getPortfolioProfile(access.user.id);
  if (!profile?.onboarding_completed_at) {
    redirect("/onboarding");
  }

  const holdings = await listHoldings(access.user.id);
  const usdCount = holdings.filter((h) => h.currency === "USD").length;
  const inrCount = holdings.filter((h) => h.currency === "INR").length;

  return (
    <main>
      <span className="tag">Portfolio home</span>
      <h1>MyStake</h1>
      <p className="muted">
        Signed in as <strong>{access.email}</strong>
        {access.isAdmin ? " · admin" : ""}.
      </p>

      <div className="card">
        <h2 className="section-title">Your picture</h2>
        <p style={{ marginTop: 0 }}>{profile.goals_text}</p>
        <p className="muted">
          Risk: {profile.risk_score ?? "—"} ({riskLabel(profile.risk_score)}) · Cash USD{" "}
          {profile.cash_usd} / INR {profile.cash_inr} · Monthly deploy USD{" "}
          {profile.monthly_deploy_usd} / INR {profile.monthly_deploy_inr}
        </p>
        <p className="muted">
          Holdings: {usdCount} USD · {inrCount} INR ({holdings.length} total)
        </p>
      </div>

      <div className="card actions-row">
        <Link href="/app/holdings" className="btn">
          Manage holdings
        </Link>
        <Link href="/onboarding" className="btn btn-secondary">
          Review onboarding
        </Link>
        {access.isAdmin ? (
          <Link href="/admin" className="btn btn-secondary">
            Admin
          </Link>
        ) : null}
        <SignOutButton />
      </div>

      <div className="card">
        <ApiStatus />
      </div>

      <p className="muted" style={{ marginTop: 24, fontSize: 13 }}>
        Not a broker and not registered investment advice — informational coaching only.
      </p>
    </main>
  );
}

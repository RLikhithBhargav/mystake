import Link from "next/link";
import { redirect } from "next/navigation";

import { AppNav } from "@/components/app-nav";
import { resolveAccess } from "@/lib/access";
import { isSupabaseConfigured } from "@/lib/env";
import { riskLabel } from "@/lib/portfolio";
import { getPortfolioProfile, listHoldings } from "@/lib/portfolio-data";
import { ApiStatus } from "../api-status";
import { CoachRunner } from "./coach-runner";

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
      <AppNav email={access.email} isAdmin={access.isAdmin} active="home" />

      <div className="page-hero">
        <span className="page-kicker">Your picture</span>
        <h1>Ready when you are</h1>
        <p className="lede">
          Goals, risk, and dual-currency cash on file. Run the API coach below for a sized idea with
          a visible reasoning trail — chat chrome lands in Phase 5.
        </p>
      </div>

      <div className="stat-row">
        <div className="stat">
          <span className="stat-label">Risk</span>
          <span className="stat-value">{profile.risk_score ?? "—"}</span>
          <span className="muted" style={{ fontSize: 13 }}>
            {riskLabel(profile.risk_score)}
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">USD holdings</span>
          <span className="stat-value us">{usdCount}</span>
        </div>
        <div className="stat">
          <span className="stat-label">INR holdings</span>
          <span className="stat-value in">{inrCount}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Monthly deploy</span>
          <span className="stat-value" style={{ fontSize: "1.15rem", lineHeight: 1.35 }}>
            ${profile.monthly_deploy_usd}
            <br />₹{profile.monthly_deploy_inr}
          </span>
        </div>
      </div>

      <section className="card">
        <h2 className="section-title">Goals</h2>
        <p className="goal-quote">{profile.goals_text}</p>
        <p className="muted" style={{ margin: 0 }}>
          Cash on hand — USD {profile.cash_usd} · INR {profile.cash_inr}. Net worth — USD{" "}
          {profile.net_worth_usd} · INR {profile.net_worth_inr}.
        </p>
        <div className="actions-row" style={{ marginTop: 18 }}>
          <Link href="/app/holdings" className="btn btn-secondary">
            Manage holdings
          </Link>
          <Link href="/onboarding" className="btn btn-secondary">
            Edit profile
          </Link>
        </div>
      </section>

      <CoachRunner />

      <section className="card card-quiet">
        <ApiStatus />
      </section>

      <p className="disclaimer">
        Not a broker and not registered investment advice — informational coaching only.
      </p>
    </main>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";

import { resolveAccess } from "@/lib/access";
import { isSupabaseConfigured } from "@/lib/env";
import { getPortfolioProfile, listHoldings } from "@/lib/portfolio-data";
import { SignOutButton } from "../../sign-out-button";

import { HoldingsManager } from "./holdings-manager";

export default async function HoldingsPage() {
  if (!isSupabaseConfigured()) redirect("/login");

  const access = await resolveAccess();
  if (!access) redirect("/login");
  if (!access.accessGranted) redirect("/access");

  const profile = await getPortfolioProfile(access.user.id);
  if (!profile?.onboarding_completed_at) {
    redirect("/onboarding");
  }

  const holdings = await listHoldings(access.user.id);
  const usd = holdings.filter((h) => h.currency === "USD");
  const inr = holdings.filter((h) => h.currency === "INR");

  return (
    <main>
      <span className="tag">Holdings</span>
      <h1>Your positions</h1>
      <p className="muted">
        Manual entry or CSV import. USD and INR stay separate — {usd.length} USD / {inr.length} INR
        rows.
      </p>

      <HoldingsManager initialHoldings={holdings} />

      <div className="card actions-row">
        <Link href="/app" className="btn btn-secondary">
          Back to home
        </Link>
        <SignOutButton />
      </div>
    </main>
  );
}

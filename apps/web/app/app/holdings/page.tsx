import { redirect } from "next/navigation";

import { AppNav } from "@/components/app-nav";
import { resolveAccess } from "@/lib/access";
import { isSupabaseConfigured } from "@/lib/env";
import { getPortfolioProfile, listHoldings } from "@/lib/portfolio-data";

import { HoldingsManager } from "./holdings-manager";
import { HoldingsQuotes } from "./holdings-quotes";

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

  return (
    <main>
      <AppNav email={access.email} isAdmin={access.isAdmin} active="holdings" />

      <div className="page-hero">
        <span className="page-kicker">Portfolio</span>
        <h1>Holdings</h1>
        <p className="lede">
          Enter positions by hand or import a brokerage-style CSV. Download the sample file if you
          need a format reference — USD and INR stay separate. Quotes are cache-aware via the API.
        </p>
      </div>

      <HoldingsQuotes holdings={holdings} />
      <HoldingsManager initialHoldings={holdings} />
    </main>
  );
}

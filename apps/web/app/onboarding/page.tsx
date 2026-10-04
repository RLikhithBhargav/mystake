import { redirect } from "next/navigation";

import { AppNav } from "@/components/app-nav";
import { resolveAccess } from "@/lib/access";
import { isSupabaseConfigured } from "@/lib/env";
import { getPortfolioProfile } from "@/lib/portfolio-data";

import { OnboardingWizard } from "./onboarding-wizard";

export default async function OnboardingPage() {
  if (!isSupabaseConfigured()) {
    redirect("/login");
  }

  const access = await resolveAccess();
  if (!access) redirect("/login");
  if (!access.accessGranted) redirect("/access");

  const profile = await getPortfolioProfile(access.user.id);
  const reviewing = Boolean(profile?.onboarding_completed_at);

  return (
    <main>
      {reviewing ? (
        <AppNav email={access.email} isAdmin={access.isAdmin} active="onboarding" />
      ) : null}

      <div className="page-hero">
        <span className="page-kicker">{reviewing ? "Profile" : "Phase 2 · onboarding"}</span>
        <h1>{reviewing ? "Update your picture" : "Set up your picture"}</h1>
        <p className="lede">
          Goals, risk comfort, and cash/budget with USD and INR kept separate — then optional
          holdings.
        </p>
      </div>

      <OnboardingWizard initialProfile={profile} />
    </main>
  );
}

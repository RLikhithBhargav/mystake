import { redirect } from "next/navigation";

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
      <span className="tag">Phase 2 · onboarding</span>
      <h1>{reviewing ? "Update your picture" : "Set up your picture"}</h1>
      <p className="muted">
        Goals, risk comfort, cash/budget (USD and INR separate), then optional holdings.
      </p>
      <OnboardingWizard initialProfile={profile} />
    </main>
  );
}

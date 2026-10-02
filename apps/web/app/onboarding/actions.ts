"use server";

import { revalidatePath } from "next/cache";

import { resolveAccess } from "@/lib/access";
import { computeRiskScore, type RiskAnswers } from "@/lib/portfolio";
import { createClient } from "@/lib/supabase/server";

async function requireGrantedUser() {
  const access = await resolveAccess();
  if (!access?.accessGranted) {
    throw new Error("Access required");
  }
  return access;
}

export async function saveGoals(
  goalsText: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const access = await requireGrantedUser();
    const supabase = await createClient();
    const { error } = await supabase.from("portfolio_profiles").upsert(
      {
        user_id: access.user.id,
        goals_text: goalsText.trim(),
      },
      { onConflict: "user_id" },
    );
    if (error) return { ok: false, error: error.message };
    revalidatePath("/onboarding");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to save goals" };
  }
}

export async function saveRiskAnswers(
  answers: RiskAnswers,
): Promise<{ ok: true; riskScore: number } | { ok: false; error: string }> {
  try {
    const access = await requireGrantedUser();
    const riskScore = computeRiskScore(answers);
    const supabase = await createClient();
    const { error } = await supabase.from("portfolio_profiles").upsert(
      {
        user_id: access.user.id,
        risk_answers: answers,
        risk_score: riskScore,
      },
      { onConflict: "user_id" },
    );
    if (error) return { ok: false, error: error.message };
    revalidatePath("/onboarding");
    return { ok: true, riskScore };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to save risk profile" };
  }
}

export type MoneyFields = {
  net_worth_usd: number;
  net_worth_inr: number;
  cash_usd: number;
  cash_inr: number;
  monthly_deploy_usd: number;
  monthly_deploy_inr: number;
};

function nonNeg(n: number): boolean {
  return Number.isFinite(n) && n >= 0;
}

export async function saveMoney(
  fields: MoneyFields,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const access = await requireGrantedUser();
    const values = Object.values(fields);
    if (!values.every(nonNeg)) {
      return { ok: false, error: "All money fields must be zero or positive numbers." };
    }
    const supabase = await createClient();
    const { error } = await supabase.from("portfolio_profiles").upsert(
      {
        user_id: access.user.id,
        ...fields,
      },
      { onConflict: "user_id" },
    );
    if (error) return { ok: false, error: error.message };
    revalidatePath("/onboarding");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to save money fields" };
  }
}

export async function completeOnboarding(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const access = await requireGrantedUser();
    const supabase = await createClient();
    const { data: existing } = await supabase
      .from("portfolio_profiles")
      .select("goals_text, risk_score")
      .eq("user_id", access.user.id)
      .maybeSingle();

    if (!existing?.goals_text?.trim()) {
      return { ok: false, error: "Add your goals before finishing." };
    }
    if (existing.risk_score == null) {
      return { ok: false, error: "Complete the risk questionnaire before finishing." };
    }

    const { error } = await supabase.from("portfolio_profiles").upsert(
      {
        user_id: access.user.id,
        onboarding_completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) return { ok: false, error: error.message };
    revalidatePath("/app");
    revalidatePath("/onboarding");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to complete onboarding" };
  }
}

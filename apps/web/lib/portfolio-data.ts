import { createClient } from "@/lib/supabase/server";

import type { Holding, PortfolioProfile, RiskAnswers } from "@/lib/portfolio";

function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function getPortfolioProfile(userId: string): Promise<PortfolioProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("portfolio_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    user_id: data.user_id,
    goals_text: data.goals_text ?? "",
    risk_answers: (data.risk_answers ?? {}) as RiskAnswers,
    risk_score: data.risk_score,
    net_worth_usd: num(data.net_worth_usd),
    net_worth_inr: num(data.net_worth_inr),
    cash_usd: num(data.cash_usd),
    cash_inr: num(data.cash_inr),
    monthly_deploy_usd: num(data.monthly_deploy_usd),
    monthly_deploy_inr: num(data.monthly_deploy_inr),
    onboarding_completed_at: data.onboarding_completed_at,
  };
}

export async function listHoldings(userId: string): Promise<Holding[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("holdings")
    .select("*")
    .eq("user_id", userId)
    .order("currency", { ascending: true })
    .order("symbol", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    symbol: row.symbol,
    name: row.name,
    market: row.market,
    currency: row.currency,
    quantity: num(row.quantity),
    avg_cost: row.avg_cost == null ? null : num(row.avg_cost),
    notes: row.notes,
  }));
}

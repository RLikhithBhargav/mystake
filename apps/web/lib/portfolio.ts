export type RiskAnswers = {
  horizon: "lt3" | "3to7" | "gt7";
  drawdown: "sell" | "hold" | "buy";
  experience: "new" | "some" | "experienced";
  priority: "preserve" | "balanced" | "growth";
};

export type PortfolioProfile = {
  user_id: string;
  goals_text: string;
  risk_answers: RiskAnswers | Record<string, unknown>;
  risk_score: number | null;
  net_worth_usd: number;
  net_worth_inr: number;
  cash_usd: number;
  cash_inr: number;
  monthly_deploy_usd: number;
  monthly_deploy_inr: number;
  onboarding_completed_at: string | null;
};

export type Holding = {
  id: string;
  user_id: string;
  symbol: string;
  name: string | null;
  market: "US" | "IN";
  currency: "USD" | "INR";
  quantity: number;
  avg_cost: number | null;
  notes: string | null;
};

export type HoldingInput = {
  symbol: string;
  name?: string | null;
  market: "US" | "IN";
  currency: "USD" | "INR";
  quantity: number;
  avg_cost?: number | null;
  notes?: string | null;
};

/** Map questionnaire answers to a simple 1–5 risk score. */
export function computeRiskScore(answers: RiskAnswers): number {
  const horizon = { lt3: 1, "3to7": 3, gt7: 5 }[answers.horizon];
  const drawdown = { sell: 1, hold: 3, buy: 5 }[answers.drawdown];
  const experience = { new: 2, some: 3, experienced: 4 }[answers.experience];
  const priority = { preserve: 1, balanced: 3, growth: 5 }[answers.priority];
  return Math.round((horizon + drawdown + experience + priority) / 4);
}

export function riskLabel(score: number | null | undefined): string {
  if (score == null) return "Unset";
  if (score <= 2) return "Conservative";
  if (score === 3) return "Moderate";
  return "Growth-oriented";
}

export function defaultCurrencyForMarket(market: "US" | "IN"): "USD" | "INR" {
  return market === "US" ? "USD" : "INR";
}

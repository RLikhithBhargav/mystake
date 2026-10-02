"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { riskLabel, type PortfolioProfile, type RiskAnswers } from "@/lib/portfolio";

import { completeOnboarding, saveGoals, saveMoney, saveRiskAnswers } from "./actions";

const STEPS = ["Goals", "Risk", "Money", "Holdings"] as const;

const defaultRisk: RiskAnswers = {
  horizon: "3to7",
  drawdown: "hold",
  experience: "some",
  priority: "balanced",
};

function parseMoney(value: string): number {
  const n = Number(value.replace(/,/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

export function OnboardingWizard({ initialProfile }: { initialProfile: PortfolioProfile | null }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [goals, setGoals] = useState(initialProfile?.goals_text ?? "");
  const [risk, setRisk] = useState<RiskAnswers>({
    ...defaultRisk,
    ...(initialProfile?.risk_answers as Partial<RiskAnswers> | undefined),
  });
  const [riskScore, setRiskScore] = useState<number | null>(initialProfile?.risk_score ?? null);
  const [money, setMoney] = useState({
    net_worth_usd: String(initialProfile?.net_worth_usd ?? 0),
    net_worth_inr: String(initialProfile?.net_worth_inr ?? 0),
    cash_usd: String(initialProfile?.cash_usd ?? 0),
    cash_inr: String(initialProfile?.cash_inr ?? 0),
    monthly_deploy_usd: String(initialProfile?.monthly_deploy_usd ?? 0),
    monthly_deploy_inr: String(initialProfile?.monthly_deploy_inr ?? 0),
  });

  function goNext() {
    setError(null);
    startTransition(async () => {
      if (step === 0) {
        if (!goals.trim()) {
          setError("Write a short goal so the coach has context.");
          return;
        }
        const result = await saveGoals(goals);
        if (!result.ok) {
          setError(result.error);
          return;
        }
      }
      if (step === 1) {
        const result = await saveRiskAnswers(risk);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setRiskScore(result.riskScore);
      }
      if (step === 2) {
        const fields = {
          net_worth_usd: parseMoney(money.net_worth_usd),
          net_worth_inr: parseMoney(money.net_worth_inr),
          cash_usd: parseMoney(money.cash_usd),
          cash_inr: parseMoney(money.cash_inr),
          monthly_deploy_usd: parseMoney(money.monthly_deploy_usd),
          monthly_deploy_inr: parseMoney(money.monthly_deploy_inr),
        };
        const result = await saveMoney(fields);
        if (!result.ok) {
          setError(result.error);
          return;
        }
      }
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    });
  }

  function finish() {
    setError(null);
    startTransition(async () => {
      const result = await completeOnboarding();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.replace("/app");
      router.refresh();
    });
  }

  return (
    <div className="card">
      <div className="stepper">
        {STEPS.map((label, i) => (
          <span key={label} className={i === step ? "step active" : "step"}>
            {i + 1}. {label}
          </span>
        ))}
      </div>

      {step === 0 ? (
        <div className="stack">
          <h2 className="section-title">Goals</h2>
          <p className="muted">
            Plain language is fine — e.g. aggressive growth, deploy ₹X/month, preserve capital.
          </p>
          <label className="field">
            <span>What are you optimizing for?</span>
            <textarea
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              rows={4}
              placeholder="Grow US equities aggressively; keep INR side more stable…"
            />
          </label>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="stack">
          <h2 className="section-title">Risk questionnaire</h2>
          <RiskFields risk={risk} setRisk={setRisk} />
          {riskScore != null ? (
            <p className="muted">
              Current score: <strong>{riskScore}</strong> ({riskLabel(riskScore)})
            </p>
          ) : null}
        </div>
      ) : null}

      {step === 2 ? (
        <div className="stack">
          <h2 className="section-title">Net worth, cash & deploy budget</h2>
          <p className="muted">USD and INR are tracked separately — no FX conversion.</p>
          <div className="money-grid">
            {(
              [
                ["net_worth_usd", "Net worth (USD)"],
                ["net_worth_inr", "Net worth (INR)"],
                ["cash_usd", "Cash (USD)"],
                ["cash_inr", "Cash (INR)"],
                ["monthly_deploy_usd", "Monthly deploy (USD)"],
                ["monthly_deploy_inr", "Monthly deploy (INR)"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="field">
                <span>{label}</span>
                <input
                  inputMode="decimal"
                  value={money[key]}
                  onChange={(e) => setMoney((m) => ({ ...m, [key]: e.target.value }))}
                />
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="stack">
          <h2 className="section-title">Holdings</h2>
          <p className="muted">
            You can add holdings now or finish and manage them on the holdings page (manual + CSV).
          </p>
          <div className="actions-row">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  const result = await completeOnboarding();
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  router.replace("/app/holdings");
                  router.refresh();
                });
              }}
            >
              Go to holdings
            </button>
            <button type="button" className="btn" disabled={pending} onClick={finish}>
              Finish without holdings
            </button>
          </div>
        </div>
      ) : null}

      {step < 3 ? (
        <div className="actions-row" style={{ marginTop: 20 }}>
          {step > 0 ? (
            <button
              type="button"
              className="btn btn-secondary"
              disabled={pending}
              onClick={() => {
                setError(null);
                setStep((s) => s - 1);
              }}
            >
              Back
            </button>
          ) : null}
          <button type="button" className="btn" disabled={pending} onClick={goNext}>
            {pending ? "Saving…" : "Continue"}
          </button>
        </div>
      ) : null}

      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}

function RiskFields({ risk, setRisk }: { risk: RiskAnswers; setRisk: (r: RiskAnswers) => void }) {
  return (
    <>
      <label className="field">
        <span>Investment horizon</span>
        <select
          value={risk.horizon}
          onChange={(e) => setRisk({ ...risk, horizon: e.target.value as RiskAnswers["horizon"] })}
        >
          <option value="lt3">Under 3 years</option>
          <option value="3to7">3–7 years</option>
          <option value="gt7">7+ years</option>
        </select>
      </label>
      <label className="field">
        <span>If the portfolio dropped 20% in a month, you would…</span>
        <select
          value={risk.drawdown}
          onChange={(e) =>
            setRisk({ ...risk, drawdown: e.target.value as RiskAnswers["drawdown"] })
          }
        >
          <option value="sell">Sell to reduce risk</option>
          <option value="hold">Hold and wait</option>
          <option value="buy">Buy more if thesis intact</option>
        </select>
      </label>
      <label className="field">
        <span>Investing experience</span>
        <select
          value={risk.experience}
          onChange={(e) =>
            setRisk({ ...risk, experience: e.target.value as RiskAnswers["experience"] })
          }
        >
          <option value="new">New</option>
          <option value="some">Some</option>
          <option value="experienced">Experienced</option>
        </select>
      </label>
      <label className="field">
        <span>Priority</span>
        <select
          value={risk.priority}
          onChange={(e) =>
            setRisk({ ...risk, priority: e.target.value as RiskAnswers["priority"] })
          }
        >
          <option value="preserve">Preserve capital</option>
          <option value="balanced">Balanced</option>
          <option value="growth">Maximize growth</option>
        </select>
      </label>
    </>
  );
}

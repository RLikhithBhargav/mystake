"use client";

import { useState, useTransition } from "react";

import { createClient } from "@/lib/supabase/client";

type ReasoningStep = {
  node: string;
  summary: string;
  detail?: Record<string, unknown>;
};

type CoachResponse = {
  run_id: string | null;
  model: string;
  recommendation: {
    action?: string;
    symbol?: string;
    market?: string;
    currency?: string;
    size_value?: number;
    size_shares?: number | null;
    thesis?: string;
    risks?: string[];
    confidence?: number;
    disclaimer?: string;
  };
  reasoning_trail: ReasoningStep[];
  langsmith_enabled: boolean;
};

export function CoachRunner() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CoachResponse | null>(null);
  const [openTrail, setOpenTrail] = useState(true);

  function runCoach() {
    setError(null);
    startTransition(async () => {
      try {
        const supabase = createClient();
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !data.session?.access_token) {
          setError("Not signed in — refresh and try again.");
          return;
        }
        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
        const response = await fetch(`${apiBase}/coach/run`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data.session.access_token}`,
          },
          body: JSON.stringify({ force_refresh_quotes: false }),
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          setError(body.detail || `Coach failed (${response.status}). Is the API configured?`);
          return;
        }
        setResult((await response.json()) as CoachResponse);
        setOpenTrail(true);
      } catch {
        setError("Could not reach the API. Start apps/api on port 8000.");
      }
    });
  }

  const rec = result?.recommendation;

  return (
    <section className="card">
      <div className="actions-row" style={{ justifyContent: "space-between" }}>
        <div>
          <h2 className="section-title" style={{ marginBottom: 4 }}>
            Coach run
          </h2>
          <p className="section-sub" style={{ marginBottom: 0 }}>
            Phase 4 API-first LangGraph coach — recommendation plus visible reasoning trail.
          </p>
        </div>
        <button type="button" className="btn" disabled={pending} onClick={runCoach}>
          {pending ? "Running…" : "Run coach"}
        </button>
      </div>

      {error ? <div className="flash error">{error}</div> : null}

      {rec ? (
        <div style={{ marginTop: 16 }}>
          <p className="goal-quote" style={{ fontSize: "1.15rem" }}>
            {rec.action?.toUpperCase()} {rec.symbol}{" "}
            <span className="muted">
              ({rec.market} · {rec.currency} {rec.size_value}
              {rec.size_shares != null ? ` · ~${rec.size_shares} sh` : ""})
            </span>
          </p>
          <p style={{ marginTop: 0 }}>{rec.thesis}</p>
          {rec.risks?.length ? (
            <ul className="list">
              {rec.risks.map((risk) => (
                <li key={risk} className="muted">
                  {risk}
                </li>
              ))}
            </ul>
          ) : null}
          <p className="muted" style={{ fontSize: 13 }}>
            Model: {result?.model}
            {result?.run_id ? ` · saved ${result.run_id}` : ""}
            {result?.langsmith_enabled ? " · LangSmith tracing on" : ""}
          </p>
          <p className="muted" style={{ fontSize: 13 }}>
            {rec.disclaimer}
          </p>

          <button
            type="button"
            className="btn btn-ghost btn-small"
            onClick={() => setOpenTrail((v) => !v)}
          >
            {openTrail ? "Hide reasoning" : "Show reasoning"}
          </button>
          {openTrail ? (
            <ol className="list" style={{ listStyle: "decimal", paddingLeft: 18 }}>
              {result?.reasoning_trail.map((step) => (
                <li key={`${step.node}-${step.summary}`} style={{ marginBottom: 10 }}>
                  <strong>{step.node}</strong>
                  <div className="muted">{step.summary}</div>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { defaultCurrencyForMarket, type Holding } from "@/lib/portfolio";

import { deleteHolding, importNormalizedHoldings, upsertHolding } from "./actions";

type Draft = {
  symbol: string;
  name: string;
  market: "US" | "IN";
  quantity: string;
  avg_cost: string;
};

const emptyDraft = (): Draft => ({
  symbol: "",
  name: "",
  market: "US",
  quantity: "",
  avg_cost: "",
});

export function HoldingsManager({ initialHoldings }: { initialHoldings: Holding[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);

  function refresh() {
    router.refresh();
  }

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const currency = defaultCurrencyForMarket(draft.market);
      const result = await upsertHolding({
        symbol: draft.symbol,
        name: draft.name || null,
        market: draft.market,
        currency,
        quantity: Number(draft.quantity),
        avg_cost: draft.avg_cost ? Number(draft.avg_cost) : null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDraft(emptyDraft());
      setMessage("Holding saved.");
      refresh();
    });
  }

  function onDelete(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteHolding(id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      refresh();
    });
  }

  async function onCsvSelected(file: File | null) {
    if (!file) return;
    setError(null);
    setMessage(null);
    setCsvErrors([]);
    const csvText = await file.text();
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

    startTransition(async () => {
      try {
        const response = await fetch(`${apiBase}/portfolio/csv/normalize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ csv_text: csvText }),
        });
        if (!response.ok) {
          setError(`CSV normalize failed (${response.status}). Is the API running?`);
          return;
        }
        const body = (await response.json()) as {
          holdings: Array<{
            symbol: string;
            name: string | null;
            market: "US" | "IN";
            currency: "USD" | "INR";
            quantity: number;
            avg_cost: number | null;
          }>;
          errors: string[];
          row_count: number;
        };
        setCsvErrors(body.errors ?? []);
        if (!body.holdings?.length) {
          setError("No holdings parsed from CSV.");
          return;
        }
        const imported = await importNormalizedHoldings(body.holdings);
        if (!imported.ok) {
          setError(imported.error);
          return;
        }
        setMessage(`Imported ${imported.imported} holding(s).`);
        refresh();
      } catch {
        setError("Could not reach the API to normalize CSV. Start apps/api on port 8000.");
      }
    });
  }

  const usd = initialHoldings.filter((h) => h.currency === "USD");
  const inr = initialHoldings.filter((h) => h.currency === "INR");

  return (
    <>
      <div className="card">
        <h2 className="section-title">Add holding</h2>
        <form onSubmit={onSave} className="stack">
          <div className="money-grid">
            <label className="field">
              <span>Symbol</span>
              <input
                value={draft.symbol}
                onChange={(e) => setDraft((d) => ({ ...d, symbol: e.target.value }))}
                required
                placeholder="AAPL or RELIANCE"
              />
            </label>
            <label className="field">
              <span>Market</span>
              <select
                value={draft.market}
                onChange={(e) => setDraft((d) => ({ ...d, market: e.target.value as "US" | "IN" }))}
              >
                <option value="US">US (USD)</option>
                <option value="IN">India (INR)</option>
              </select>
            </label>
            <label className="field">
              <span>Quantity</span>
              <input
                inputMode="decimal"
                value={draft.quantity}
                onChange={(e) => setDraft((d) => ({ ...d, quantity: e.target.value }))}
                required
              />
            </label>
            <label className="field">
              <span>Avg cost (optional)</span>
              <input
                inputMode="decimal"
                value={draft.avg_cost}
                onChange={(e) => setDraft((d) => ({ ...d, avg_cost: e.target.value }))}
              />
            </label>
            <label className="field" style={{ gridColumn: "1 / -1" }}>
              <span>Name (optional)</span>
              <input
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              />
            </label>
          </div>
          <button type="submit" className="btn" disabled={pending}>
            Save holding
          </button>
        </form>
      </div>

      <div className="card">
        <h2 className="section-title">Import CSV</h2>
        <p className="muted">
          Headers like <code>symbol,quantity</code> work. Optional: market, currency, name,
          avg_cost. API normalizes; rows upsert into your holdings.
        </p>
        <label className="field">
          <span>CSV file</span>
          <input
            type="file"
            accept=".csv,text/csv"
            disabled={pending}
            onChange={(e) => onCsvSelected(e.target.files?.[0] ?? null)}
          />
        </label>
        {csvErrors.length ? (
          <ul className="list">
            {csvErrors.map((err) => (
              <li key={err} className="muted">
                {err}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <HoldingsTable title="USD holdings" rows={usd} pending={pending} onDelete={onDelete} />
      <HoldingsTable title="INR holdings" rows={inr} pending={pending} onDelete={onDelete} />

      {message ? <p className="ok-text">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </>
  );
}

function HoldingsTable({
  title,
  rows,
  pending,
  onDelete,
}: {
  title: string;
  rows: Holding[];
  pending: boolean;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="card">
      <h2 className="section-title">{title}</h2>
      {rows.length === 0 ? (
        <p className="muted">None yet.</p>
      ) : (
        <ul className="list">
          {rows.map((row) => (
            <li key={row.id} className="list-row">
              <div>
                <strong>{row.symbol}</strong>
                <span className="muted">
                  {" "}
                  · {row.quantity}
                  {row.avg_cost != null ? ` @ ${row.avg_cost}` : ""} · {row.market}
                </span>
                {row.name ? <div className="muted">{row.name}</div> : null}
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-small"
                disabled={pending}
                onClick={() => onDelete(row.id)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

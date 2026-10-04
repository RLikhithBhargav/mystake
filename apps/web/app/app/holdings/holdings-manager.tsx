"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { defaultCurrencyForMarket, type Holding } from "@/lib/portfolio";
import { SAMPLE_HOLDINGS_CSV, SAMPLE_HOLDINGS_FILENAME } from "@/lib/sample-holdings-csv";

import { deleteHolding, importNormalizedHoldings, upsertHolding } from "./actions";

type Draft = {
  symbol: string;
  name: string;
  market: "US" | "IN";
  quantity: string;
  avg_cost: string;
};

type CurrencyFilter = "ALL" | "USD" | "INR";

const emptyDraft = (): Draft => ({
  symbol: "",
  name: "",
  market: "US",
  quantity: "",
  avg_cost: "",
});

function downloadSampleCsv() {
  const blob = new Blob([SAMPLE_HOLDINGS_CSV], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = SAMPLE_HOLDINGS_FILENAME;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function formatQty(n: number): string {
  return Number.isInteger(n)
    ? String(n)
    : n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export function HoldingsManager({ initialHoldings }: { initialHoldings: Holding[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [filter, setFilter] = useState<CurrencyFilter>("ALL");
  const [selectedName, setSelectedName] = useState<string | null>(null);

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

  async function importCsvText(csvText: string, sourceLabel: string) {
    setError(null);
    setMessage(null);
    setCsvErrors([]);
    setSelectedName(sourceLabel);
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

    startTransition(async () => {
      try {
        const response = await fetch(`${apiBase}/portfolio/csv/normalize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ csv_text: csvText }),
        });
        if (!response.ok) {
          setError(`CSV normalize failed (${response.status}). Is the API running on ${apiBase}?`);
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
        setMessage(`Imported ${imported.imported} holding(s) from ${sourceLabel}.`);
        refresh();
      } catch {
        setError("Could not reach the API to normalize CSV. Start apps/api on port 8000.");
      }
    });
  }

  async function onCsvSelected(file: File | null) {
    if (!file) return;
    const csvText = await file.text();
    await importCsvText(csvText, file.name);
  }

  const usd = initialHoldings.filter((h) => h.currency === "USD");
  const inr = initialHoldings.filter((h) => h.currency === "INR");
  const visible = filter === "USD" ? usd : filter === "INR" ? inr : initialHoldings;

  return (
    <>
      <div className="stat-row">
        <div className="stat">
          <span className="stat-label">Total rows</span>
          <span className="stat-value">{initialHoldings.length}</span>
        </div>
        <div className="stat">
          <span className="stat-label">USD</span>
          <span className="stat-value us">{usd.length}</span>
        </div>
        <div className="stat">
          <span className="stat-label">INR</span>
          <span className="stat-value in">{inr.length}</span>
        </div>
      </div>

      <div className="panel-grid">
        <section className="card">
          <h2 className="section-title">Add manually</h2>
          <p className="section-sub">US rows store in USD; India rows store in INR — no FX mix.</p>
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
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, market: e.target.value as "US" | "IN" }))
                  }
                >
                  <option value="US">US · USD</option>
                  <option value="IN">India · INR</option>
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
                <span>Avg cost</span>
                <input
                  inputMode="decimal"
                  value={draft.avg_cost}
                  onChange={(e) => setDraft((d) => ({ ...d, avg_cost: e.target.value }))}
                  placeholder="optional"
                />
              </label>
              <label className="field" style={{ gridColumn: "1 / -1" }}>
                <span>Name</span>
                <input
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  placeholder="optional"
                />
              </label>
            </div>
            <div className="actions-row">
              <button type="submit" className="btn" disabled={pending}>
                {pending ? "Saving…" : "Save holding"}
              </button>
            </div>
          </form>
        </section>

        <section className="card">
          <h2 className="section-title">Import CSV</h2>
          <p className="section-sub">
            Use headers like <code>symbol,quantity</code>. Optional: market, currency, name,
            avg_cost.
          </p>

          <div
            className={dragActive ? "dropzone active" : "dropzone"}
            onDragEnter={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragActive(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              const file = e.dataTransfer.files?.[0] ?? null;
              void onCsvSelected(file);
            }}
          >
            <p className="dropzone-title">{selectedName ? selectedName : "Drop a CSV here"}</p>
            <p className="dropzone-hint">or click to browse · .csv only</p>
            <input
              type="file"
              accept=".csv,text/csv"
              disabled={pending}
              onChange={(e) => void onCsvSelected(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="csv-actions">
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={downloadSampleCsv}
            >
              Download sample CSV
            </button>
            <a className="btn btn-ghost btn-small" href="/samples/mystake-holdings-sample.csv">
              Open in browser
            </a>
          </div>

          {csvErrors.length ? (
            <ul className="list">
              {csvErrors.map((err) => (
                <li key={err} className="muted">
                  {err}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>

      <section className="card">
        <div className="actions-row" style={{ justifyContent: "space-between" }}>
          <div>
            <h2 className="section-title" style={{ marginBottom: 4 }}>
              Positions
            </h2>
            <p className="section-sub" style={{ marginBottom: 0 }}>
              USD and INR stay in separate books.
            </p>
          </div>
          <div className="currency-tabs" role="tablist" aria-label="Currency filter">
            {(
              [
                ["ALL", "All"],
                ["USD", "USD"],
                ["INR", "INR"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={filter === key}
                className={filter === key ? "currency-tab active" : "currency-tab"}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="empty-state">
            No holdings yet. Add one manually or import the sample CSV to try the flow.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="holdings-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Market</th>
                  <th>Qty</th>
                  <th>Avg cost</th>
                  <th>Currency</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <span className="symbol-cell">{row.symbol}</span>
                      {row.name ? <span className="symbol-name">{row.name}</span> : null}
                    </td>
                    <td>
                      <span className={`market-chip ${row.market === "US" ? "us" : "in"}`}>
                        {row.market}
                      </span>
                    </td>
                    <td>{formatQty(row.quantity)}</td>
                    <td>{row.avg_cost != null ? formatQty(row.avg_cost) : "—"}</td>
                    <td>{row.currency}</td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-small"
                        disabled={pending}
                        onClick={() => onDelete(row.id)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {message ? <div className="flash ok">{message}</div> : null}
      {error ? <div className="flash error">{error}</div> : null}
    </>
  );
}

"use client";

import { useEffect, useState, useTransition } from "react";

import type { Holding } from "@/lib/portfolio";

type Quote = {
  symbol: string;
  market: string;
  currency: string;
  price: number;
  previous_close: number | null;
  cache_hit: boolean;
  source: string;
};

type QuotesResponse = {
  quotes: Quote[];
  cache_hits: number;
  fetched: number;
};

function formatMoney(n: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

export function HoldingsQuotes({ holdings }: { holdings: Holding[] }) {
  const [data, setData] = useState<QuotesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function load(forceRefresh = false) {
    if (!holdings.length) {
      setData({ quotes: [], cache_hits: 0, fetched: 0 });
      return;
    }
    setError(null);
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
    const symbols = holdings.map((h) => ({ symbol: h.symbol, market: h.market }));

    startTransition(async () => {
      try {
        const response = await fetch(`${apiBase}/market/quotes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbols, force_refresh: forceRefresh }),
        });
        if (!response.ok) {
          setError(`Quotes failed (${response.status}). Is the API running?`);
          return;
        }
        setData((await response.json()) as QuotesResponse);
      } catch {
        setError("Could not reach the API for quotes. Start apps/api on port 8000.");
      }
    });
  }

  const holdingsKey = holdings.map((h) => `${h.market}:${h.symbol}`).join("|");

  useEffect(() => {
    load(false);
    // Intentionally keyed by holdingsKey only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdingsKey]);

  if (!holdings.length) {
    return null;
  }

  const byKey = new Map((data?.quotes ?? []).map((q) => [`${q.market}:${q.symbol}`, q]));

  let usdValue = 0;
  let inrValue = 0;
  for (const h of holdings) {
    const q = byKey.get(`${h.market}:${h.symbol.toUpperCase()}`);
    if (!q) continue;
    const value = q.price * h.quantity;
    if (q.currency === "USD") usdValue += value;
    else inrValue += value;
  }

  return (
    <section className="card">
      <div className="actions-row" style={{ justifyContent: "space-between" }}>
        <div>
          <h2 className="section-title" style={{ marginBottom: 4 }}>
            Live marks
          </h2>
          <p className="section-sub" style={{ marginBottom: 0 }}>
            Cache-aware quotes from the API (TTL ~10 min). Repeats should hit cache.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-small"
          disabled={pending}
          onClick={() => load(true)}
        >
          {pending ? "Refreshing…" : "Force refresh"}
        </button>
      </div>

      {data ? (
        <div className="stat-row" style={{ marginTop: 16 }}>
          <div className="stat">
            <span className="stat-label">USD market value</span>
            <span className="stat-value us" style={{ fontSize: "1.25rem" }}>
              {formatMoney(usdValue, "USD")}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">INR market value</span>
            <span className="stat-value in" style={{ fontSize: "1.25rem" }}>
              {formatMoney(inrValue, "INR")}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">Last response</span>
            <span className="stat-value" style={{ fontSize: "1.1rem" }}>
              {data.cache_hits} cache · {data.fetched} live
            </span>
          </div>
        </div>
      ) : null}

      {data?.quotes.length ? (
        <div style={{ overflowX: "auto", marginTop: 8 }}>
          <table className="holdings-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Market</th>
                <th>Last</th>
                <th>Source</th>
                <th>Cache</th>
              </tr>
            </thead>
            <tbody>
              {data.quotes.map((q) => (
                <tr key={`${q.market}:${q.symbol}`}>
                  <td className="symbol-cell">{q.symbol}</td>
                  <td>
                    <span className={`market-chip ${q.market === "US" ? "us" : "in"}`}>
                      {q.market}
                    </span>
                  </td>
                  <td>{formatMoney(q.price, q.currency)}</td>
                  <td className="muted">{q.source}</td>
                  <td>{q.cache_hit ? "hit" : "miss"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {error ? <div className="flash error">{error}</div> : null}
    </section>
  );
}
